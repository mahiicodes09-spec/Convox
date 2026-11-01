from django.urls import path
from .consumers import ChatConsumer
from .voice import VoiceConsumer

websocket_urlpatterns = [
    path("ws/channels/<int:channel_id>/", ChatConsumer.as_asgi()),
    path("ws/voice/<int:channel_id>/", VoiceConsumer.as_asgi()),
]