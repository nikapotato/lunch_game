import random
import logging
from typing import Dict
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from pydantic import ValidationError
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from lunch_app.database import get_session_context
from lunch_app.modules.connection_manager import ConnectionManager
from lunch_app.modules.schemas.messages import (
    AllMealsSubmittedNotification,
    ErrorNotification,
    GameEndedNotification,
    GameResetNotification,
    GameStartedNotification,
    GameStateMessage,
    JoinMessage,
    MealSubmittedNotification,
    PlayerListMessage,
    SpinNotification,
    UserDisjoinedNotification,
)
from lunch_app.modules.schemas.schema import (
    GameBase,
    GameEndedModel,
    GameRoomActivityModel,
    MealModel,
    MealPrice,
)
from lunch_app.modules.types.enums import MessageType
from lunch_app.router.games import (
    end_game,
    start_game,
    submit_meal,
)
from lunch_app.router.rooms import set_active

router = APIRouter(
    prefix='/v1/ws',
    tags=['websockets'],
    dependencies=[]
)

manager = ConnectionManager()

log = logging.getLogger(__name__)

# TODO: Refactoring
@router.websocket("/rooms/{room_id}/ws")
async def ws_endpoint(
    websocket: WebSocket,
    room_id: str,
    player: str,
):
    await manager.connect(room_id, websocket, player)
    try:
        while True:
            data = await websocket.receive_json()
            message_type = data.get('type')

            if not message_type:
                error = ErrorNotification(message="Missing message type.")
                await websocket.send_json(error.model_dump())
                continue

            try:
                message_enum = MessageType(message_type)
            except ValueError:
                error = ErrorNotification(message=f"Invalid message type: {message_type}")
                await websocket.send_json(error.model_dump())
                continue

            handler = MESSAGE_HANDLERS.get(message_enum)

            if handler:
                if message_enum in {MessageType.SUBMIT_MEAL, MessageType.START_GAME, MessageType.END_GAME}:
                    async with get_session_context() as session:
                        await handler(room_id, data, websocket, session)
                else:
                    await handler(room_id, data, websocket)
            else:
                error = ErrorNotification(message=f"Unhandled message type: {message_type}")
                await websocket.send_json(error.model_dump())
    except WebSocketDisconnect:
        disconnected_player = manager.get_player_from_websocket(room_id, websocket)
        manager.disconnect(room_id, websocket)
        
        if disconnected_player:
            notification = UserDisjoinedNotification(player=disconnected_player)
            await manager.broadcast(room_id, notification)
        
        player_list_message = PlayerListMessage(
            type=MessageType.PLAYER_LIST,
            players=manager.get_players(room_id)
        )
        if manager.get_connections(room_id):
            await manager.broadcast(room_id, player_list_message)
        log.info(f"Player disconnected: {disconnected_player}. Updated player list: {player_list_message.players}")
    except Exception as e:
        log.error(f"Unexpected error: {str(e)}")

async def handle_join(room_id: str, data: Dict, websocket: WebSocket):
    try:
        join_message = JoinMessage(**data)
        player = join_message.player

        if player in manager.get_players(room_id):
            error = ErrorNotification(message=f"Username '{player}' is already taken in room '{room_id}'.")
            await websocket.send_json(error.model_dump())
            return
        
        manager.add_player(room_id, websocket, player)

        game_state = manager.get_game_state(room_id)
        game_state['players'] = manager.get_players(room_id)
        manager.set_game_state(room_id, game_state)

        player_list_message = PlayerListMessage(
            type=MessageType.PLAYER_LIST,
            players=game_state['players']
        )
        await manager.broadcast(room_id, player_list_message)
        log.info(f"Broadcasting player list: {player_list_message.players}")

    except ValidationError as ve:
        error = ErrorNotification(message=str(ve))
        await websocket.send_json(error.model_dump())

async def handle_start_game(room_id: str, data: Dict, websocket: WebSocket, session: AsyncSession):
    try:
        players = data.get('players', [])
        if not players:
            raise KeyError("Missing 'players' field in the data payload.")

        game_model = await start_game(
            payload=GameBase(room_id=room_id, players=players),
            session=session
        )

        await set_active(room_id, GameRoomActivityModel(is_active=True), session=session)

        manager.set_game_state(room_id, {
            "gameStarted": True,
            "gameId": game_model.id,
            "players": players,
            "loser": None,
            "winners": [],
            "mealSubmitted": {},
            "scores": {},
        })

        notification = GameStartedNotification(
            message="A new game has started!",
            game_id=game_model.id
        )
        await manager.broadcast(room_id, notification)

    except Exception as e:
        error = ErrorNotification(message=str(e))
        await websocket.send_json(error.model_dump())

async def handle_submit_meal(room_id: str, data: Dict, websocket: WebSocket, session: AsyncSession):
    try:
        player = data.get('player', 'Unknown')
        meal = data.get('meal', {})
        game_id = data.get('game_id', 'Unknown')

        if not all([player, meal, game_id]):
            raise KeyError("Missing required fields: 'player', 'meal', or 'game_id'.")

        if player not in manager.get_players(room_id):
            raise PermissionError("You can only submit a meal for yourself.")

        amount = meal.get('amount')
        currency = meal.get('currency')

        if amount is None or currency is None:
            raise KeyError("Missing 'amount' or 'currency' in 'meal'.")

        meal_model = MealModel(
            player=player,
            amount=amount,
            currency=currency,
            game_id=game_id
        )

        await submit_meal(
            id=room_id,
            payload=meal_model,
            session=session
        )

        notification = MealSubmittedNotification(
            message="Meal submitted!",
            player=player,
            meal=MealPrice(amount=amount, currency=currency)
        )
        await manager.broadcast(room_id, notification)

        manager.mark_meal_submitted(room_id, player)

        game_state = manager.get_game_state(room_id)
        meal_submitted = game_state.get('mealSubmitted', {})
        meal_submitted[player] = True
        game_state['mealSubmitted'] = meal_submitted
        manager.set_game_state(room_id, game_state)

        # all players have submitted their meals?
        if manager.all_meals_submitted(room_id):
            notification = AllMealsSubmittedNotification(
                message="All meals have been submitted!",
            )

            await set_active(room_id, GameRoomActivityModel(is_active=False), session=session)

            await manager.broadcast(room_id, notification)

            manager.reset_meal_submissions(room_id)

            manager.reset_game_state(room_id)
            game_reset_message = GameResetNotification(
                type=MessageType.GAME_RESET,
                message="Game state has been reset."
            )
            await manager.broadcast(room_id, game_reset_message)

    except (HTTPException, ValidationError, KeyError, SQLAlchemyError, PermissionError) as e:
        error = ErrorNotification(message=str(e))
        await websocket.send_json(error.model_dump())
    except Exception as e:
        error = ErrorNotification(message=f"Unexpected error: {str(e)}")
        await websocket.send_json(error.model_dump())

async def handle_end_game(room_id: str, data: Dict, websocket: WebSocket, session: AsyncSession):
    try:
        game_id = data.get('game_id', 'Unknown')
        scores = data.get('scores', {})
        if not isinstance(scores, dict):
            raise ValueError("Invalid data format for end game.")
        players = manager.get_players(room_id)
        min_score = min(scores.values())
        losers = [player for player, score in scores.items() if score == min_score]
        loser = random.choice(losers)
        winners = [player for player in players if player != loser]

        await end_game(
            id=room_id,
            payload=GameEndedModel(id=game_id, winners=winners, loser=loser),
            session=session
        )

        notification = GameEndedNotification(
            message=f"Game over! {loser} loses and pays for lunch!",
            loser=loser,
            winners=winners
        )
        await manager.broadcast(room_id, notification)

        game_state = manager.get_game_state(room_id)
        game_state.update({
            "loser": loser,
            "winners": winners,
            "scores": scores,
        })
        manager.set_game_state(room_id, game_state)

    except Exception as e:
        error = ErrorNotification(message=str(e))
        await websocket.send_json(error.model_dump())

async def handle_spin(room_id: str, data: Dict, websocket: WebSocket):
    try:
        player = data.get('player')
        if not player:
            raise KeyError("Missing 'player' in data.")

        score = random.randint(1, 100)
        game_state = manager.get_game_state(room_id)
        scores = game_state.get('scores', {})
        scores[player] = score

        game_state.update({
            "scores": scores,
        })

        notification = SpinNotification(
            type=MessageType.SPINED,
            player=player,
            score=score
        )
        await manager.broadcast(room_id, notification)
    except Exception as e:
        error = ErrorNotification(message=str(e))
        await websocket.send_json(error.model_dump())

async def handle_rejoin(room_id: str, data: Dict, websocket: WebSocket):
    try:
        player = data.get('player')
        if not player:
            raise KeyError("Missing 'player' in data.")

        manager.add_player(room_id, websocket, player)

        game_state = manager.get_game_state(room_id)
        game_state['players'] = manager.get_players(room_id)
        manager.set_game_state(room_id, game_state)

        game_state_message = GameStateMessage(
            type=MessageType.GAME_STATE,
            gameStarted=game_state.get('gameStarted', False),
            gameEnded=game_state.get('gameEnded', False),
            gameId=game_state.get('gameId', ''),
            players=manager.get_players(room_id),
            loser=game_state.get('loser', None),
            winners=game_state.get('winners', []),
            mealSubmitted=game_state.get('mealSubmitted', {}),
            scores=game_state.get('scores', {}),
        )
        await websocket.send_json(game_state_message.model_dump())

        player_list_message = PlayerListMessage(
            type=MessageType.PLAYER_LIST,
            players=game_state['players']
        )
        await manager.broadcast(room_id, player_list_message)

    except Exception as e:
        error = ErrorNotification(message=str(e))
        await websocket.send_json(error.model_dump())

async def handle_user_disjoined(room_id: str, data: Dict, websocket: WebSocket):
    try:
        player = data.get('player')
        if not player:
            raise KeyError("Missing 'player' in data.")

        manager.remove_player(room_id, player)

        notification = UserDisjoinedNotification(player=player)
        await manager.broadcast(room_id, notification)

        player_list_message = PlayerListMessage(
            type=MessageType.PLAYER_LIST,
            players=manager.get_players(room_id)
        )
        await manager.broadcast(room_id, player_list_message)

        game_state = manager.get_game_state(room_id)
        game_state['players'] = manager.get_players(room_id)
        manager.set_game_state(room_id, game_state)
    except Exception as e:
        error = ErrorNotification(message=str(e))
        await websocket.send_json(error.model_dump())

MESSAGE_HANDLERS = {
    MessageType.JOIN: handle_join,
    MessageType.REJOIN: handle_rejoin,  
    MessageType.START_GAME: handle_start_game,
    MessageType.SPIN: handle_spin,
    MessageType.SUBMIT_MEAL: handle_submit_meal,
    MessageType.END_GAME: handle_end_game,
    MessageType.USER_DISJOINED: handle_user_disjoined,
}
