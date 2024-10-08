from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from lunch_app.database import get_session
from lunch_app.modules.models.model import GameRoom
from lunch_app.modules.schemas.schema import GameRoomActivityModel, GameRoomBase, GameRoomModel

router = APIRouter(
    prefix='/v1/rooms',
    tags=['rooms'],
    dependencies=[]
)

@router.post("/create_room", response_model=GameRoomModel)
async def create_room(
    payload: GameRoomBase,
    session: AsyncSession = Depends(get_session)
) -> GameRoomModel:
    """Create a new virtual game room."""
    try:
        room = GameRoom(
            name=payload.name,
            code=payload.code,
        )

        session.add(room)
        await session.commit()
        await session.refresh(room)

        return GameRoomModel.model_validate(room)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create room: {str(e)}")
    
@router.get("/get_is_active/{id}", response_model=bool)
async def get_is_active(
    id: str,
    session: AsyncSession = Depends(get_session)
) -> bool:
    """Check if a specific room is active."""
    try:
        result = await session.execute(
            select(GameRoom.is_active).filter(GameRoom.id == id)
        )
        is_active = result.scalar()

        if is_active is None:
            raise HTTPException(status_code=404, detail=f"Room with id {id} not found.")
        
        return is_active
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to check if the room is active: {str(e)}")

@router.get("/get_rooms", response_model=List[GameRoomModel])
async def get_rooms(session: AsyncSession = Depends(get_session)) -> List[GameRoomModel]:
    """List all rooms that users can join and play game there."""
    try:
        result = await session.execute(
            select(GameRoom).filter(GameRoom.is_active == False)
        )

        rooms = result.scalars().all()
        return [GameRoomModel.model_validate(room) for room in rooms]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get rooms: {str(e)}")
    
@router.patch("/set_active/{id}", response_model=GameRoomModel)
async def set_active(
    id: str,
    payload: GameRoomActivityModel,
    session: AsyncSession = Depends(get_session)
) -> GameRoomModel:
    """Set a room as active."""
    try:
        await session.execute(
            update(GameRoom)
            .where(GameRoom.id == id)
            .values(is_active=payload.is_active)
        )
        await session.commit()

        result = await session.execute(
            select(GameRoom).filter(GameRoom.id == id)
        )
        updated_game_room = result.scalar()

        return GameRoomModel.model_validate(updated_game_room)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to set room as active: {str(e)}")
    
@router.get("/get_room/{id}", response_model=GameRoomModel)
async def get_room(
    id: str,
    session: AsyncSession = Depends(get_session)
) -> GameRoomModel:
    """Get details of a specific room based on room id."""
    try:
        result = await session.execute(
            select(GameRoom).filter(GameRoom.id == id)
        )
        room = result.scalar()

        if not room:
            raise HTTPException(status_code=404, detail=f"Room with id {id} not found.")
        return GameRoomModel.model_validate(room)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get room: {str(e)}")
