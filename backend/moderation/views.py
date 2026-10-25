from django.db import transaction
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework import generics, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from chat.models import Message
from communities.models import Server
from .models import ModerationLog
from .permissions import is_moderator
from .serializers import ActionSerializer, FlaggedMessageSerializer, ModerationLogSerializer
# Create your views here.


def get_server_for_moderator(user, server_id):
    server = get_object_or_404(Server, id=server_id, members__user=user)
    if not is_moderator(user, server):
        raise PermissionDenied("Sirf owner, admin ya moderator ye dekh sakte hain.")
    return server


class ModerationQueueView(generics.ListAPIView):
    serializer_class = FlaggedMessageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        server = get_server_for_moderator(self.request.user, self.kwargs["server_id"])
        return (Message.objects
                .filter(channel__server=server, moderation_status="flagged")
                .select_related("author", "channel")
                .order_by("-created_at"))


class ModerationActionView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(request=ActionSerializer, responses=ModerationLogSerializer)
    def post(self, request, message_id):
        message = get_object_or_404(
            Message.objects.select_related("channel__server"),
            id=message_id,
            channel__server__members__user=request.user,
        )
        server = message.channel.server
        if not is_moderator(request.user, server):
            raise PermissionDenied("Sirf owner, admin ya moderator action le sakte hain.")

        s = ActionSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        action = s.validated_data["action"]

        with transaction.atomic():
            log = ModerationLog.objects.create(
                server=server,
                actor=request.user,
                target_user=message.author,
                message_id=message.id,
                action=action,
                reason=s.validated_data["reason"],
                toxicity_label=message.toxicity_label,
                toxicity_score=message.toxicity_score,
            )
            if action == "dismiss":
                message.moderation_status = "clean"
                message.save(update_fields=["moderation_status"])
            elif action == "warn":
                message.moderation_status = "reviewed"
                message.save(update_fields=["moderation_status"])
            elif action == "remove":
                message.delete()

        return Response(ModerationLogSerializer(log).data, status=status.HTTP_201_CREATED)


class ModerationLogListView(generics.ListAPIView):
    serializer_class = ModerationLogSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        server = get_server_for_moderator(self.request.user, self.kwargs["server_id"])
        return ModerationLog.objects.filter(server=server).select_related("actor", "target_user")
