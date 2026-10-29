from django.db import transaction
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from chat.models import Message
from .models import ModerationLog
from .permissions import is_moderator
from .serializers import ActionSerializer, FlaggedMessageSerializer, ModerationLogSerializer
from rest_framework.exceptions import PermissionDenied, ValidationError
from communities.models import Server, ServerMember , Channel
from datetime import timedelta
from django.utils import timezone
from rest_framework.pagination import PageNumberPagination
from django.db.models import Count
# Create your views here.

ROLE_RANK = {"member": 0, "moderator": 1, "admin": 2, "owner": 3}
class StandardPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100
def get_server_for_moderator(user, server_id):
    server = get_object_or_404(Server, id=server_id, members__user=user)
    if not is_moderator(user, server):
        raise PermissionDenied("Sirf owner, admin ya moderator ye dekh sakte hain.")
    return server


class ModerationQueueView(generics.ListAPIView):
    serializer_class = FlaggedMessageSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardPagination

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
        if action in ("dismiss", "warn") and message.moderation_status != "flagged":
            raise ValidationError({"detail": "Ye message flagged nahi hai."})
        if action in ("mute", "suspend") and message.moderation_status not in ("flagged", "reviewed"):
            raise ValidationError({"detail": "Sirf flagged ya reviewed message par mute/suspend ho sakta hai."})
        my_role = ServerMember.objects.get(server=server, user=request.user).role
        target_member = ServerMember.objects.filter(server=server, user=message.author).first()
        target_rank = ROLE_RANK[target_member.role] if target_member else 0
        if ROLE_RANK[my_role] <= target_rank:
            raise PermissionDenied("Apne barabar ya upar ke role par action nahi le sakte.")
        expires_at = None
        if action in ("mute", "suspend"):
            minutes = s.validated_data.get("duration_minutes")
            if not minutes:
                raise ValidationError({"duration_minutes": "Mute/suspend ke liye ye zaroori hai."})
            if target_member is None:
                raise ValidationError({"detail": "User ab is server mein nahi hai."})
            expires_at = timezone.now() + timedelta(minutes=minutes)
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
                expires_at=expires_at,
            )
            if action == "dismiss":
                message.moderation_status = "clean"
                message.save(update_fields=["moderation_status"])
            elif action == "warn":
                message.moderation_status = "reviewed"
                message.save(update_fields=["moderation_status"])
            elif action == "remove":
                message.delete()
            elif action in ("mute", "suspend"):
                field = "muted_until" if action == "mute" else "suspended_until"
                setattr(target_member, field, expires_at)
                target_member.save(update_fields=[field])
                message.moderation_status = "reviewed"
                message.save(update_fields=["moderation_status"])

        return Response(ModerationLogSerializer(log).data, status=status.HTTP_201_CREATED)


class ModerationLogListView(generics.ListAPIView):
    serializer_class = ModerationLogSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardPagination

    def get_queryset(self):
        server = get_server_for_moderator(self.request.user, self.kwargs["server_id"])
        return ModerationLog.objects.filter(server=server).select_related("actor", "target_user")

class ServerAnalyticsView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: None})
    def get(self, request, server_id):
        server = get_server_for_moderator(request.user, server_id)
        week_ago = timezone.now() - timedelta(days=7)
        messages = Message.objects.filter(channel__server=server)
        recent = messages.filter(created_at__gte=week_ago)
        actions = ModerationLog.objects.filter(server=server).values("action").annotate(total=Count("id"))
        busiest = recent.values("channel__name").annotate(total=Count("id")).order_by("-total")[:5]
        return Response({
            "member_count": ServerMember.objects.filter(server=server).count(),
            "channel_count": Channel.objects.filter(server=server).count(),
            "total_messages": messages.count(),
            "messages_last_7_days": recent.count(),
            "flagged_pending": messages.filter(moderation_status="flagged").count(),
            "moderation_actions": {a["action"]: a["total"] for a in actions},
            "active_channels": [{"channel": b["channel__name"], "messages": b["total"]} for b in busiest],
        })