from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timezone
from sqlalchemy.orm import selectinload

from lunch_app.database import get_session

from lunch_app.modules.models.model import Game, Meal
from lunch_app.modules.schemas.schema import GameBase, GameEndedModel, GameModel, MealModel

router = APIRouter(
    prefix='/v1/games',
    tags=['games'],
    dependencies=[]
)

@router.post("/start_game", response_model=GameModel)
async def start_game(
    payload: GameBase,
    session: AsyncSession = Depends(get_session)
) -> GameModel:
    """Start a new game in a room."""
    try:
        result = await session.execute(
            select(Game).filter(Game.room_id == payload.room_id, Game.is_active == True)
        )
        existing_game = result.scalar()
        if existing_game:
            raise HTTPException(status_code=400, detail="A game is already active in this room.")

        game = Game(
            room_id=payload.room_id,
            players=payload.players
        )

        session.add(game)
        await session.commit()

        gameSaved = await session.scalars(
            select(Game).filter(Game.id == game.id).options(selectinload(Game.meals))
        )
        
        return GameModel.model_validate(gameSaved.first())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start game: {str(e)}")

@router.patch("/{id}/end_game", response_model=GameEndedModel)
async def end_game(
    id: str,
    payload: GameEndedModel,
    session: AsyncSession = Depends(get_session)
) -> GameModel:
    """End a game in a room."""
    try:
        await session.execute(
            update(Game)
                .where(Game.id == payload.id)
            .values(winners=payload.winners, loser=payload.loser)
        )
        await session.commit()

        result = await session.execute(
            select(Game).filter(Game.id == payload.id).options(selectinload(Game.meals))
        )
        updated_game = result.scalar()

        return GameModel.model_validate(updated_game)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to end game: {str(e)}")


@router.post("/{id}/submit_meal", response_model=MealModel)
async def submit_meal(
    id: str,
    payload: MealModel,
    session: AsyncSession = Depends(get_session) 
) -> MealModel:
    """Submit a meal for a player in a game."""
    try:
        result = await session.execute(
            select(Game).filter(Game.id == payload.game_id)
        )
        game = result.scalar()
        if not game:
            raise HTTPException(status_code=404, detail=f"Game with id: {id} not found or is not active.")
        
        player_names = [player for player in game.players]
        if payload.player not in player_names:
            raise HTTPException(status_code=400, detail="Player is not part of this lunch game.")

        existing_meal = await session.execute(
            select(Meal).filter(
                Meal.game_id == payload.game_id,
                Meal.player == payload.player
            )
        )
        if existing_meal.scalar():
            raise HTTPException(status_code=400, detail="Meal already submitted for this player.")

        meal = Meal(
            player=payload.player,
            amount=payload.amount,
            currency=payload.currency,
            game_id=payload.game_id
        )
        session.add(meal)
        await session.commit()

        await session.refresh(game, ["meals"])

        # all meals submitted?
        result = await session.execute(
            select(Meal).filter(Meal.game_id == payload.game_id)
        )
        all_meals = result.scalars().all()
        meals_count = len(all_meals)
        if meals_count == len(player_names):
            # game completed
            await session.execute(
                update(Game)
                .where(Game.id == payload.game_id)
                .values(is_active=False, ended_at_utc=datetime.now(timezone.utc).timestamp())
            )
            await session.commit()
            await session.refresh(game)

        return MealModel.model_validate(meal)
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to submit meal: {str(e)}")

@router.get("/get_game/{id}", response_model=GameModel)
async def get_game(
    id: str,
    session: AsyncSession = Depends(get_session)
) -> GameModel:
    """Get details of a game with the given id."""
    try:
        result = await session.execute(
            select(Game).filter(Game.id == id)
        )
        game = result.scalar()

        if not game:
            raise HTTPException(status_code=404, detail=f"Game with id: {id} not found.")

        await session.refresh(game, ["meals"])

        return GameModel.model_validate(game)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get game: {str(e)}")

@router.get("/history", response_model=List[GameModel])
async def get_history(
    session: AsyncSession = Depends(get_session)
) -> List[GameModel]:
    """Get history of all games."""
    try:
        result = await session.execute(
            select(Game).filter(Game.is_active == False).options(selectinload(Game.meals)).order_by(Game.ended_at_utc.desc())
        )
        games = result.scalars().all()
        history = [GameModel.model_validate(game) for game in games]
        return history
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get games history: {str(e)}")
