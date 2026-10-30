from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics
from rest_framework.exceptions import PermissionDenied
from rest_framework.pagination import CursorPagination
from rest_framework.permissions import IsAuthenticated
from communities.models import Channel, ServerMember
from moderation.permissions import get_restriction
from .models import Message , Attachment
from .moderation import moderate
from rest_framework.filters import SearchFilter
from .serializers import MessageSerializer , AttachmentUploadSerializer
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db import transaction
from drf_spectacular.utils import extend_schema
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView
# Create your views here.


class MessagePagination(CursorPagination):
    page_size = 50
    ordering = "-created_at"


class MessageListCreateView(generics.ListCreateAPIView):
    serializer_class = MessageSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = MessagePagination
    filter_backends = [SearchFilter]
    search_fields = ["content"]

    def get_channel(self):
        return get_object_or_404(Channel, id=self.kwargs["channel_id"], server__members__user=self.request.user)

    def get_queryset(self):
        queryset = Message.objects.filter(channel=self.get_channel()).select_related("author")
        if self.request.query_params.get("search"):
            queryset = queryset.exclude(moderation_status__in=["flagged", "reviewed"])
        author = self.request.query_params.get("author")
        if author and author.isdigit():
            queryset = queryset.filter(author_id=author)
        return queryset

    def perform_create(self, serializer):
        channel = self.get_channel()
        restriction = get_restriction(self.request.user, channel.server)
        if restriction:
            raise PermissionDenied(f"you are {restriction}, cannot send messages")
        content = serializer.validated_data["content"]
        message = serializer.save(channel=channel, author=self.request.user, **moderate(content))
        try:
            async_to_sync(get_channel_layer().group_send)(
                f"chat_{channel.id}",
                {"type": "chat.message", "message": dict(MessageSerializer(message).data)},
            )
        except Exception:
            pass


class MessageDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = MessageSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "patch", "delete", "head", "options"]

    def get_queryset(self):
        return Message.objects.filter(channel__server__members__user=self.request.user).select_related("author")

    def perform_update(self, serializer):
        if serializer.instance.author != self.request.user:
            raise PermissionDenied("you can edit only your message")
        content = serializer.validated_data.get("content", serializer.instance.content)
        serializer.save(edited_at=timezone.now(), **moderate(content))

    def perform_destroy(self, instance):
        if instance.author != self.request.user:
            member = ServerMember.objects.get(server=instance.channel.server, user=self.request.user)
            if member.role not in ["owner", "admin", "moderator"]:
                raise PermissionDenied("messages from other person can only be deleted by owner , admin or moderator")
        instance.delete()
ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "application/pdf", "video/mp4"}
MAX_FILE_SIZE = 10 * 1024 * 1024


class AttachmentUploadView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    @extend_schema(request=AttachmentUploadSerializer, responses=MessageSerializer)
    def post(self, request, channel_id):
        channel = get_object_or_404(Channel, id=channel_id, server__members__user=request.user)
        restriction = get_restriction(request.user, channel.server)
        if restriction:
            raise PermissionDenied(f"you are {restriction}, cannot share files")

        upload = request.FILES.get("file")
        if upload is None:
            raise ValidationError({"file": "File should be there"})
        if upload.size > MAX_FILE_SIZE:
            raise ValidationError({"file": "File size should be less than 10mb"})
        if upload.content_type not in ALLOWED_TYPES:
            raise ValidationError({"file": "only jpg, png, webp, pdf ya mp4 is allowed"})

        caption = str(request.data.get("content", "")).strip()[:2000]
        extra = moderate(caption) if caption else {}

        with transaction.atomic():
            message = Message.objects.create(channel=channel, author=request.user, content=caption, **extra)
            Attachment.objects.create(
                message=message,
                file=upload,
                original_name=upload.name[:255],
                content_type=upload.content_type,
                size=upload.size,
            )

        data = dict(MessageSerializer(message, context={"request": request}).data)
        try:
            async_to_sync(get_channel_layer().group_send)(
                f"chat_{channel.id}",
                {"type": "chat.message", "message": data},
            )
        except Exception:
            pass
        return Response(data, status=201)