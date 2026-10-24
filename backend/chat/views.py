from django.shortcuts import get_object_or_404
from rest_framework import generics
from rest_framework.pagination import CursorPagination
from rest_framework.permissions import IsAuthenticated
from communities.models import Channel
from .models import Message
from .serializers import MessageSerializer
# Create your views here.


class MessagePagination(CursorPagination):
    page_size = 50
    ordering = "-created_at"


class MessageListCreateView(generics.ListCreateAPIView):
    serializer_class = MessageSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = MessagePagination

    def get_channel(self):
        return get_object_or_404(Channel, id=self.kwargs["channel_id"], server__members__user=self.request.user)

    def get_queryset(self):
        return Message.objects.filter(channel=self.get_channel()).select_related("author")

    def perform_create(self, serializer):
        serializer.save(channel=self.get_channel(), author=self.request.user)
