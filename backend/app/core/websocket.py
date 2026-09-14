"""WebSocket connection manager for live order updates."""

import logging
from collections.abc import Iterable
from typing import Any

from fastapi import WebSocket

logger = logging.getLogger("app.core.websocket")


class ConnectionManager:
    """Tracks sockets in role rooms and order-specific rooms."""

    def __init__(self) -> None:
        self.rooms: dict[str, set[WebSocket]] = {}
        self.socket_rooms: dict[WebSocket, set[str]] = {}

    async def connect(self, websocket: WebSocket, roles: Iterable[str], user_id: int) -> None:
        await websocket.accept()

        normalized_roles = {role.strip().lower() for role in roles if role.strip()}
        if not normalized_roles:
            normalized_roles = {"client"}

        for role in normalized_roles:
            self._join_room(websocket, f"role:{role}")

        logger.info(
            "WebSocket connected user_id=%s roles=%s rooms=%s",
            user_id,
            sorted(normalized_roles),
            len(self.rooms),
        )

    def disconnect(self, websocket: WebSocket) -> None:
        rooms = self.socket_rooms.pop(websocket, set())
        for room in rooms:
            connections = self.rooms.get(room)
            if connections is None:
                continue
            connections.discard(websocket)
            if not connections:
                del self.rooms[room]

    def join_order_room(self, websocket: WebSocket, order_id: int) -> None:
        self._join_room(websocket, f"order:{order_id}")

    def leave_order_room(self, websocket: WebSocket, order_id: int) -> None:
        room = f"order:{order_id}"
        connections = self.rooms.get(room)
        if connections is None:
            return

        connections.discard(websocket)
        if websocket in self.socket_rooms:
            self.socket_rooms[websocket].discard(room)
        if not connections:
            del self.rooms[room]

    async def broadcast_to_order(self, order_id: int, event: str, data: dict[str, Any]) -> None:
        await self._emit_to_room(f"order:{order_id}", event, data)

    async def broadcast_to_roles(
        self,
        roles: Iterable[str],
        event: str,
        data: dict[str, Any],
    ) -> None:
        payload = {"event": event, "data": data}
        sent_to: set[WebSocket] = set()

        for role in roles:
            room = f"role:{role.strip().lower()}"
            for connection in list(self.rooms.get(room, set())):
                if connection in sent_to:
                    continue
                try:
                    await connection.send_json(payload)
                    sent_to.add(connection)
                except RuntimeError:
                    self.disconnect(connection)

    def get_active_connections_count(self) -> int:
        return len(self.socket_rooms)

    def get_rooms_info(self) -> dict[str, int]:
        return {room: len(connections) for room, connections in self.rooms.items()}

    def _join_room(self, websocket: WebSocket, room: str) -> None:
        self.rooms.setdefault(room, set()).add(websocket)
        self.socket_rooms.setdefault(websocket, set()).add(room)

    async def _emit_to_room(self, room: str, event: str, data: dict[str, Any]) -> None:
        payload = {"event": event, "data": data}
        for connection in list(self.rooms.get(room, set())):
            try:
                await connection.send_json(payload)
            except RuntimeError:
                self.disconnect(connection)


manager = ConnectionManager()
