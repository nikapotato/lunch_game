from fastapi import WebSocket
from typing import Dict, List
from collections import defaultdict
from pydantic import BaseModel
import logging

log = logging.getLogger(__name__)

class PlayerConnection:
    def __init__(self, websocket: WebSocket, player: str):
        self.websocket = websocket
        self.player = player

class ConnectionManager:
    def __init__(self):
        # room_id - player connections
        self.active_connections: Dict[str, List[PlayerConnection]] = defaultdict(list)
        self.meal_submissions: Dict[str, set] = defaultdict(set)
        self.game_states: Dict[str, Dict] = {}
        self.scores: Dict[str, Dict[str, int]] = defaultdict(dict)
    
    def set_game_state(self, room_id: str, state: Dict):
        """Set the current game state for a room."""
        self.game_states[room_id] = state
        log.info(f"Game state updated for room_id: {room_id}")

    def get_game_state(self, room_id: str) -> Dict:
        """Get the current game state for a room."""
        game_state = self.game_states.get(room_id, {})
        game_state['players'] = self.get_players(room_id)
        return game_state

    async def connect(self, room_id: str, websocket: WebSocket, player: str):
        await websocket.accept()
        self.add_player(room_id, websocket, player)

    def add_player(self, room_id: str, websocket: WebSocket, player: str):
        if not any(conn.player == player for conn in self.active_connections[room_id]):
            player_connection = PlayerConnection(websocket, player)
            self.active_connections[room_id].append(player_connection)
            log.info(f"Player {player} added to room_id: {room_id}")
        else:
            log.info(f"Player {player} is already in room_id: {room_id}, not adding again.")
    
    def disconnect(self, room_id: str, websocket: WebSocket):
        connections = self.active_connections.get(room_id, [])
        for conn in connections:
            if conn.websocket == websocket:
                connections.remove(conn)
                log.info(f"WebSocket disconnected for player {conn.player} from room_id: {room_id}")
                break
        if not connections and room_id in self.active_connections:
            del self.active_connections[room_id]
            log.info(f"No active connections left in room_id: {room_id}")

    async def broadcast(self, room_id: str, message: BaseModel):
        connections = self.active_connections.get(room_id, [])
        log.info(f"Broadcasting message to connections in room_id: {room_id}")
        for connection in connections:
            try:
                await connection.websocket.send_json(message.model_dump())
            except Exception as e:
                log.error(f"Failed to send message to player {connection.player} in room_id {room_id}: {e}")

    def get_connections(self, room_id: str) -> List[PlayerConnection]:
        """Return the list of active PlayerConnection objects for a given room_id."""
        return self.active_connections.get(room_id, [])

    def remove_player(self, room_id: str, player: str):
        """Remove a player from the list of players in a room."""
        connections = self.active_connections.get(room_id, [])
        for conn in connections:
            if conn.player == player:
                connections.remove(conn)
                log.info(f"Player {player} removed from room_id: {room_id}")
                break
        if not connections:
            del self.active_connections[room_id]
            log.info(f"No active connections left in room_id: {room_id}")

    def get_players(self, room_id: str) -> List[str]:
        """Get the list of players currently connected in a room."""
        return [conn.player for conn in self.active_connections.get(room_id, [])]

    async def broadcast_to_others(self, room_id: str, message: BaseModel, exclude: WebSocket):
        connections = self.active_connections.get(room_id, [])
        for connection in connections:
            if connection.websocket != exclude:
                try:
                    await connection.websocket.send_json(message.model_dump())
                except Exception as e:
                    log.error(f"Failed to send message to player {connection.player} in room_id {room_id}: {e}")

    def get_player_from_websocket(self, room_id: str, websocket: WebSocket) -> str | None:
        """Retrieve the player associated with a given WebSocket in a specific room."""
        connections = self.active_connections.get(room_id, [])
        for connection in connections:
            if connection.websocket == websocket:
                return connection.player

        return None

    def mark_meal_submitted(self, room_id: str, player: str):
        """Mark a player's meal as submitted."""
        self.meal_submissions[room_id].add(player)
        log.info(f"Player {player} has submitted their meal in room_id: {room_id}")

    def all_meals_submitted(self, room_id: str) -> bool:
        """Check if all players have submitted their meals."""
        players = self.get_players(room_id)
        submitted_players = self.meal_submissions.get(room_id, set())
        return len(players) == len(submitted_players)

    def reset_meal_submissions(self, room_id: str):
        """Reset meal submissions for a room."""
        self.meal_submissions[room_id] = set()
        log.info(f"Meal submissions reset for room_id: {room_id}")

    def reset_game_state(self, room_id: str):
        """Reset the game state for a room."""
        if room_id in self.game_states:
            del self.game_states[room_id]
            log.info(f"Game state reset for room_id: {room_id}")
