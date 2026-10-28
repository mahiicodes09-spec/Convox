from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from communities.models import Channel
from .models import Message
from .moderation import moderate
from .serializers import MessageSerializer
from moderation.permissions import get_restriction


class ChatConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.user = self.scope["user"]
        self.channel_id = self.scope["url_route"]["kwargs"]["channel_id"]
        self.group_name = f"chat_{self.channel_id}"

        if self.user.is_anonymous or not await self.is_member():
            await self.close(code=4003)
            return

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive_json(self, content):
        text = str(content.get("content", "")).strip()
        if not text:
            await self.send_json({"type": "error", "detail": "Message khaali nahi ho sakta."})
            return
        if len(text) > 2000:
            await self.send_json({"type": "error", "detail": "Message 2000 characters se lamba hai."})
            return

        restriction = await self.get_restriction()
        if restriction:
            await self.send_json({"type": "error", "detail": f"Aap abhi {restriction} hain, message nahi bhej sakte."})
            return
        
        message = await self.save_message(text)
        await self.channel_layer.group_send(self.group_name, {
            "type": "chat.message",
            "message": message,
        })

    async def chat_message(self, event):
        await self.send_json({"type": "message.new", "message": event["message"]})

    @database_sync_to_async
    def is_member(self):
        return Channel.objects.filter(id=self.channel_id, server__members__user=self.user).exists()

    @database_sync_to_async
    def save_message(self, text):
        message = Message.objects.create(channel_id=self.channel_id, author=self.user, content=text, **moderate(text))
        return dict(MessageSerializer(message).data)
    @database_sync_to_async
    def get_restriction(self):
        channel = Channel.objects.select_related("server").get(id=self.channel_id)
        return get_restriction(self.user, channel.server)
