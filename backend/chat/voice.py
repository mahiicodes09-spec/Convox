from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from communities.models import Channel


class VoiceConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.user = self.scope["user"]
        self.channel_id = self.scope["url_route"]["kwargs"]["channel_id"]
        self.group_name = f"voice_{self.channel_id}"
        self.joined = False

        if self.user.is_anonymous or not await self.is_member():
            await self.close(code=4003)
            return

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        self.joined = True
        await self.broadcast({"type": "peer.joined", "from": self.user.id})

    async def disconnect(self, code):
        if self.joined:
            await self.broadcast({"type": "peer.left", "from": self.user.id})
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive_json(self, content):
        if content.get("type") not in ("offer", "answer", "ice"):
            return
        await self.broadcast({
            "type": content["type"],
            "from": self.user.id,
            "to": content.get("to"),
            "data": content.get("data"),
        })

    async def broadcast(self, payload):
        await self.channel_layer.group_send(self.group_name, {
            "type": "voice.relay",
            "payload": payload,
            "sender": self.channel_name,
        })

    async def voice_relay(self, event):
        if event["sender"] == self.channel_name:
            return
        payload = event["payload"]
        if payload.get("to") is not None and payload["to"] != self.user.id:
            return
        await self.send_json(payload)

    @database_sync_to_async
    def is_member(self):
        return Channel.objects.filter(id=self.channel_id, server__members__user=self.user).exists()