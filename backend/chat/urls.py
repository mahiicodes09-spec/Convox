from django.urls import path
from .views import MessageListCreateView

urlpatterns = [
    path("channels/<int:channel_id>/messages/", MessageListCreateView.as_view(), name="message_list_create"),
]
