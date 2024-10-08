from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime

from lunch_app.modules.models.model import Game, GameRoom, Meal

# GameRoom
class GameRoomActivityModel(BaseModel):
    is_active: bool

class GameRoomBase(BaseModel):
    name: str
    code: str

class GameRoomModel(GameRoomBase):
    id: str
    created_at_utc: datetime
    is_active: bool

    model_config = ConfigDict(from_attributes=True)

    @classmethod
    def get_orm_model(cls):
        return GameRoom

    def to_orm(self) -> GameRoom:
        return self.get_orm_model()(**self.model_dump())

# Meal
class MealPrice(BaseModel):
    amount: float
    currency: str

class MealModel(MealPrice):
    player: str
    game_id: Optional[str]

    model_config = ConfigDict(from_attributes=True)

    @classmethod
    def get_orm_model(cls):
        return Meal

    def to_orm(self) -> Meal:
        return self.get_orm_model()(**self.model_dump())

# Game
class GameBase(BaseModel):
    players: List[str]
    room_id: str

class GameModel(GameBase):
    id: str
    created_at_utc: datetime
    ended_at_utc: Optional[datetime]
    is_active: bool
    winners: Optional[List[str]]
    loser: Optional[str]
    meals: Optional[List['MealModel']] = []

    model_config = ConfigDict(from_attributes=True)
    
    @classmethod
    def get_orm_model(cls):
        return Game

    def to_orm(self) -> Game:
        return self.get_orm_model()(**self.model_dump())

class GameEndedModel(BaseModel):
    id: str
    winners: List[str]
    loser: str

GameModel.model_rebuild()
