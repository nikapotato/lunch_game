import uvicorn
from fastapi import FastAPI, status
from fastapi.responses import JSONResponse, RedirectResponse
from contextlib import asynccontextmanager

from lunch_app.router import games, rooms, ws
from lunch_app.database import setup_database

@asynccontextmanager
async def lifespan(app: FastAPI):
    # TODO: Should not be here. We should have migrations instead
    await setup_database()
    yield

app = FastAPI(lifespan=lifespan)

app.include_router(rooms.router)
app.include_router(games.router)
app.include_router(ws.router)

@app.get("/", include_in_schema=False)
async def redirect_root_to_openapi():
    return RedirectResponse("/docs")

@app.get("/v1/hello-world")
async def hello_world():
    """Dummy endpoint"""
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={"message": "Hello world"}
    )

if __name__ == '__main__':
    uvicorn.run(app, host='0.0.0.0', port=8000, log_level="info", loop='asyncio')
