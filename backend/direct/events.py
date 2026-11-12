from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer


def broadcast(conversation_id, event_type, **payload):
    async_to_sync(get_channel_layer().group_send)(
        f"direct_{conversation_id}",
        {"type": event_type, **payload},
    )