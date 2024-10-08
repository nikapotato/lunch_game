import uuid
from sqlalchemy import BigInteger, Column, String, ForeignKey, Float, Boolean
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

from lunch_app.database import Base

class Game(Base):
    """Represents a round played within a game room."""
    __tablename__='games'
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    created_at_utc = Column(BigInteger, default=lambda: datetime.now(timezone.utc).timestamp())
    ended_at_utc = Column(BigInteger, nullable=True)
    is_active = Column(Boolean, default=True) # if true, game is ongoing, if false game ended
    players = Column(ARRAY(String), nullable=False)
    winners = Column(ARRAY(String), nullable=True)
    loser = Column(String, nullable=True)
    meals = relationship('Meal', back_populates='game')
    room_id = Column(String, ForeignKey('game_rooms.id'), nullable=False)
    room = relationship('GameRoom', back_populates='games')

class Meal(Base):
    """Represents a meal cost for each player in a game."""
    __tablename__='meals'
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    player = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    currency = Column(String, nullable=False)
    game_id = Column(String, ForeignKey('games.id'), nullable=False)

    game = relationship('Game', back_populates='meals')

class GameRoom(Base):
    """Represents a virtual space where users can play games together."""
    __tablename__='game_rooms'
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    code = Column(String, nullable=False)
    created_at_utc = Column(BigInteger, default=lambda: datetime.now(timezone.utc).timestamp())
    is_active = Column(Boolean, default=False) # if true, game is ongoing
    games = relationship('Game', back_populates='room')
    