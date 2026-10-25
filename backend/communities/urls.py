from django.urls import path
from .views import ServerListCreateView, ServerDetailView, JoinServerView, InvitePreviewView, ChannelListCreateView

urlpatterns = [
    path("servers/", ServerListCreateView.as_view(), name="server_list_create"),
    path("servers/join/", JoinServerView.as_view(), name="server_join"),
    path("servers/<int:pk>/", ServerDetailView.as_view(), name="server_detail"),
    path("servers/<int:server_id>/channels/", ChannelListCreateView.as_view(), name="channel_list_create"),
    path("invites/<str:code>/", InvitePreviewView.as_view(), name="invite_preview"),
]
