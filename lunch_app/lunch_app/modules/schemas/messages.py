from typing import Dict, List, Optional
from pydantic import BaseModel

from lunch_app.modules.schemas.schema import MealPrice
from lunch_app.modules.types.enums import MessageType

class JoinMessage(BaseModel):
    type: MessageType = MessageType.JOIN
    player: str
    
class GameStateMessage(BaseModel):
    type: MessageType = MessageType.GAME_STATE
    gameStarted: bool
    gameEnded: bool 
    gameId: str
    players: List[str]
    loser: Optional[str]
    winners: List[str]
    mealSubmitted: Dict[str, bool]
    scores: Dict[str, int]

# Outgoing Messages
class PlayerJoinedNotification(BaseModel):
    type: MessageType = MessageType.PLAYER_JOINED
    player: str

class GameStartedNotification(BaseModel):
    type: MessageType = MessageType.GAME_STARTED
    message: str
    game_id: str

class MealSubmittedNotification(BaseModel):
    type: MessageType = MessageType.MEAL_SUBMITTED
    message: str
    player: str
    meal: MealPrice

class AllMealsSubmittedNotification(BaseModel):
    type: MessageType = MessageType.ALL_MEALS_SUBMITTED
    message: str

class GameEndedNotification(BaseModel):
    type: MessageType = MessageType.GAME_ENDED
    message: str
    loser: str
    winners: List[str]

class ErrorNotification(BaseModel):
    type: MessageType = MessageType.ERROR
    message: str

class PlayerListMessage(BaseModel):
    type: MessageType = MessageType.PLAYER_LIST
    players: List[str]

class PlayerJoinedMessage(BaseModel):
    type: MessageType = MessageType.PLAYER_JOINED
    player: str

class SpinNotification(BaseModel):
    type: MessageType = MessageType.SPINED
    player: str
    score: int

class UserDisjoinedNotification(BaseModel):
    type: MessageType = MessageType.USER_DISJOINED
    player: str

class GameResetNotification(BaseModel):
    type: MessageType = MessageType.GAME_RESET
    message: str