from django.urls import path
from .views import MessageListCreateView, MessageDetailView

urlpatterns = [
    path("channels/<int:channel_id>/messages/", MessageListCreateView.as_view(), name="message_list_create"),
    path("messages/<int:pk>/", MessageDetailView.as_view(), name="message_detail"),
]
