from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from .models import ConversationMember, DirectMessage
from .serializers import DirectMessageSerializer


class DirectConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.user = self.scope["user"]
        self.conversation_id = self.scope["url_route"]["kwargs"]["conversation_id"]
        self.group_name = f"direct_{self.conversation_id}"

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
            await self.send_json({"type": "error", "detail": "Message cannot be empty."})
            return
        if len(text) > 2000:
            await self.send_json({"type": "error", "detail": "Message is longer than 2000 characters."})
            return

        message = await self.save_message(text)
        await self.channel_layer.group_send(self.group_name, {
            "type": "direct.message",
            "message": message,
        })

    async def direct_message(self, event):
        await self.send_json({"type": "message.new", "message": event["message"]})
        
    async def direct_updated(self, event):
        await self.send_json({"type": "message.updated", "message": event["message"]})

    async def direct_deleted(self, event):
        await self.send_json({
            "type": "message.deleted",
            "id": event["id"],
            "conversation": event["conversation"],
        })

    async def direct_member_added(self, event):
        await self.send_json({"type": "member.added", "user_ids": event["user_ids"]})

    async def direct_member_removed(self, event):
        await self.send_json({"type": "member.removed", "user_id": event["user_id"]})
        if event["user_id"] == self.user.id:
            await self.close(code=4004)

    @database_sync_to_async
    def is_member(self):
        return ConversationMember.objects.filter(
            conversation_id=self.conversation_id, user=self.user
        ).exists()

    @database_sync_to_async
    def save_message(self, text):
        message = DirectMessage.objects.create(
            conversation_id=self.conversation_id, author=self.user, content=text
        )
        return dict(DirectMessageSerializer(message).data)