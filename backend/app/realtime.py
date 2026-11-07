"""WebSocket hub. Customers subscribe with (lat, lng, radius_km) and receive live worker status changes inside that circle."""
import json
from fastapi import WebSocket
from .geo import haversine_km

class Hub:
    def __init__(self):
        self.conns = []   # [{ws, uid, sub}]

    async def add(self, ws: WebSocket, uid: int):
        await ws.accept()
        alive = []
        for c in self.conns:
            try:
                from starlette.websockets import WebSocketState
                if getattr(c["ws"], "client_state", None) == WebSocketState.CONNECTED:
                    alive.append(c)
            except Exception:
                pass
        alive.append({"ws": ws, "uid": uid, "sub": None})
        self.conns = alive

    def remove(self, ws):
        self.conns = [c for c in self.conns if c["ws"] is not ws]

    def subscribe(self, ws, sub):
        for c in self.conns:
            if c["ws"] is ws:
                c["sub"] = sub

    async def _send(self, c, payload):
        try:
            await c["ws"].send_text(json.dumps(payload))
        except Exception:
            self.remove(c["ws"])

    async def to_user(self, uid: int, payload: dict) -> int:
        """Returns how many live connections the message was sent to (0 = user is offline)."""
        n = 0
        for c in list(self.conns):
            if c["uid"] == uid:
                await self._send(c, payload)
                n += 1
        return n

    def is_online(self, uid: int) -> bool:
        return any(c["uid"] == uid for c in self.conns)

    async def broadcast(self, payload: dict):
        for c in list(self.conns):
            await self._send(c, payload)

    async def worker_status(self, worker: dict):
        if worker.get("lat") is None:
            return
        for c in list(self.conns):
            s = c["sub"]
            if s and haversine_km(s["lat"], s["lng"], worker["lat"], worker["lng"]) <= s["radius_km"]:
                public = {k: v for k, v in worker.items() if k not in ("lat", "lng")}   # never leak exact home location
                await self._send(c, {"type": "worker_status", "worker": public})

hub = Hub()

async def notify(user_id: int, payload: dict, c=None) -> int:
    """Persists notification into DB (so offline users see missed events) and delivers via live WebSocket."""
    import time
    from .db import db
    try:
        if c is not None:
            c.execute(
                "INSERT INTO notifications(user_id, type, payload_json, created_at, read) VALUES(?,?,?,?,0)",
                (user_id, payload.get("type", "notification"), json.dumps(payload), time.time())
            )
        else:
            with db() as conn:
                conn.execute(
                    "INSERT INTO notifications(user_id, type, payload_json, created_at, read) VALUES(?,?,?,?,0)",
                    (user_id, payload.get("type", "notification"), json.dumps(payload), time.time())
                )
    except Exception as e:
        import logging
        logging.getLogger("realtime").warning(f"Could not persist notification for {user_id}: {e}")
    return await hub.to_user(user_id, payload)
