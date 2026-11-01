from django.urls import path
from .views import MessageListCreateView, MessageDetailView, AttachmentUploadView

urlpatterns = [
    path("channels/<int:channel_id>/messages/", MessageListCreateView.as_view(), name="message_list_create"),
    path("channels/<int:channel_id>/attachments/", AttachmentUploadView.as_view(), name="attachment_upload"),
    path("messages/<int:pk>/", MessageDetailView.as_view(), name="message_detail"),
]
