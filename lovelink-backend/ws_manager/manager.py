from fastapi import WebSocket


class ConnectionManager:
    def __init__(self):
        # Maps couple_id to a list of active websocket connections
        self.connections: dict[str, list[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, couple_id: str):
        if couple_id not in self.connections:
            self.connections[couple_id] = []
        self.connections[couple_id].append(websocket)

    def disconnect(self, websocket: WebSocket, couple_id: str):
        if couple_id in self.connections:
            if websocket in self.connections[couple_id]:
                self.connections[couple_id].remove(websocket)
            if not self.connections[couple_id]:
                del self.connections[couple_id]

    async def broadcast(self, couple_id: str, data: dict, exclude: WebSocket = None):
        """Broadcast data to all connected partners in a couple, cleaning up dead sockets"""
        connections = self.connections.get(couple_id, [])
        dead_sockets = []

        for connection in connections:
            if connection != exclude:
                try:
                    await connection.send_json(data)
                except Exception:
                    # Client disconnected abruptly (network drop, app closed)
                    dead_sockets.append(connection)

        # Evict dead sockets from memory to prevent RAM leak
        if dead_sockets and couple_id in self.connections:
            for dead in dead_sockets:
                if dead in self.connections[couple_id]:
                    self.connections[couple_id].remove(dead)
            if not self.connections[couple_id]:
                del self.connections[couple_id]

    async def send_personal(self, websocket: WebSocket, data: dict):
        try:
            await websocket.send_json(data)
        except Exception:
            pass


manager = ConnectionManager()
