from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics
from rest_framework.exceptions import PermissionDenied
from rest_framework.pagination import CursorPagination
from rest_framework.permissions import IsAuthenticated
from communities.models import Channel, ServerMember
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


class MessageDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = MessageSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "patch", "delete", "head", "options"]

    def get_queryset(self):
        return Message.objects.filter(channel__server__members__user=self.request.user).select_related("author")

    def perform_update(self, serializer):
        if serializer.instance.author != self.request.user:
            raise PermissionDenied("Sirf apna message edit kar sakte ho.")
        serializer.save(edited_at=timezone.now())

    def perform_destroy(self, instance):
        if instance.author != self.request.user:
            member = ServerMember.objects.get(server=instance.channel.server, user=self.request.user)
            if member.role not in ["owner", "admin", "moderator"]:
                raise PermissionDenied("Dusre ka message sirf owner, admin ya moderator delete kar sakte hain.")
        instance.delete()
