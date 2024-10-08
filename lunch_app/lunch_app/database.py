import re
import logging
from typing import AsyncIterator
from contextlib import asynccontextmanager
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base 

from lunch_app.modules.types.constants import DATABASE_URL

log = logging.getLogger(__name__)

if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is not set.")

if "+asyncpg" not in DATABASE_URL:
    DATABASE_URL = re.sub(r'^postgresql', 'postgresql+asyncpg', DATABASE_URL)

engine = create_async_engine(DATABASE_URL, echo=True)

SessionLocal = async_sessionmaker(
    bind=engine,
    expire_on_commit=False,
)

Base = declarative_base()

async def get_session() -> AsyncIterator[AsyncSession]:
    async with SessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

@asynccontextmanager
async def get_session_context():
    async with SessionLocal() as session:
        yield session

# TODO: Should not be here. We should have migrations instead.
async def setup_database() -> None:
    log.info("Setting up database.")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
