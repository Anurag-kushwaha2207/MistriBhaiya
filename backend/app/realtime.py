"""WebSocket hub. Customers subscribe with (lat, lng, radius_km) and receive live worker status changes inside that circle."""
import json
from fastapi import WebSocket
from .geo import haversine_km

class Hub:
    def __init__(self):
        self.conns = []   # [{ws, uid, sub}]

    async def add(self, ws: WebSocket, uid: int):
        await ws.accept()
        self.conns.append({"ws": ws, "uid": uid, "sub": None})

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

    async def worker_status(self, worker: dict):
        if worker.get("lat") is None:
            return
        for c in list(self.conns):
            s = c["sub"]
            if s and haversine_km(s["lat"], s["lng"], worker["lat"], worker["lng"]) <= s["radius_km"]:
                public = {k: v for k, v in worker.items() if k not in ("lat", "lng")}   # never leak exact home location
                await self._send(c, {"type": "worker_status", "worker": public})

hub = Hub()
