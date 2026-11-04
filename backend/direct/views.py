from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics
from rest_framework.exceptions import PermissionDenied
from rest_framework.filters import SearchFilter
from rest_framework.pagination import CursorPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Conversation, ConversationMember, DirectMessage
from .serializers import ConversationSerializer, DirectMessageSerializer , AddMembersSerializer
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db.models import F, Max
from drf_spectacular.utils import extend_schema
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.views import APIView


class MessagePagination(CursorPagination):
    page_size = 50
    ordering = "-created_at"


class ConversationListCreateView(generics.ListCreateAPIView):
    serializer_class = ConversationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            Conversation.objects.filter(members__user=self.request.user)
            .prefetch_related("members__user")
            .annotate(last_activity=Max("messages__created_at"))
            .order_by(F("last_activity").desc(nulls_last=True), "-created_at")
        )

    def find_existing(self, me, other):
        return (
            Conversation.objects.filter(is_group=False, members__user_id=me)
            .filter(members__user_id=other)
            .prefetch_related("members__user")
            .first()
        )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user_ids = serializer.validated_data["user_ids"]
        name = serializer.validated_data.get("name", "")
        is_group = len(user_ids) > 1

        if not is_group:
            existing = self.find_existing(request.user.id, user_ids[0])
            if existing:
                return Response(self.get_serializer(existing).data, status=200)

        with transaction.atomic():
            conversation = Conversation.objects.create(
                is_group=is_group,
                name=name if is_group else "",
                created_by=request.user,
            )
            ConversationMember.objects.bulk_create(
                [ConversationMember(conversation=conversation, user_id=uid) for uid in [request.user.id, *user_ids]]
            )

        conversation = self.get_queryset().get(id=conversation.id)
        return Response(self.get_serializer(conversation).data, status=201)


class DirectMessageListCreateView(generics.ListCreateAPIView):
    serializer_class = DirectMessageSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = MessagePagination
    filter_backends = [SearchFilter]
    search_fields = ["content"]

    def get_conversation(self):
        return get_object_or_404(
            Conversation,
            id=self.kwargs["conversation_id"],
            members__user=self.request.user,
        )

    def get_queryset(self):
        return DirectMessage.objects.filter(conversation=self.get_conversation()).select_related("author")

    def perform_create(self, serializer):
        conversation = self.get_conversation()
        message = serializer.save(conversation=conversation, author=self.request.user)
        async_to_sync(get_channel_layer().group_send)(
            f"direct_{conversation.id}",
            {"type": "direct.message", "message": dict(DirectMessageSerializer(message).data)},
        )


class DirectMessageDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = DirectMessageSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "patch", "delete", "head", "options"]

    def get_queryset(self):
        return DirectMessage.objects.filter(conversation__members__user=self.request.user).select_related("author")

    def perform_update(self, serializer):
        if serializer.instance.author != self.request.user:
            raise PermissionDenied("You can only edit your own messages.")
        serializer.save(edited_at=timezone.now())

    def perform_destroy(self, instance):
        if instance.author != self.request.user:
            raise PermissionDenied("You can only delete your own messages.")
        instance.delete()
class ConversationMemberAddView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(request=AddMembersSerializer, responses=ConversationSerializer)
    def post(self, request, conversation_id):
        conversation = get_object_or_404(
            Conversation, id=conversation_id, members__user=request.user
        )
        if not conversation.is_group:
            raise PermissionDenied("You cannot add members to a one-to-one chat.")

        serializer = AddMembersSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        current = set(conversation.members.values_list("user_id", flat=True))
        new_ids = [uid for uid in serializer.validated_data["user_ids"] if uid not in current]
        if len(current) + len(new_ids) > 50:
            raise ValidationError({"user_ids": "A group can have at most 50 members."})

        ConversationMember.objects.bulk_create(
            [ConversationMember(conversation=conversation, user_id=uid) for uid in new_ids],
            ignore_conflicts=True,
        )
        conversation = Conversation.objects.prefetch_related("members__user").get(id=conversation.id)
        return Response(ConversationSerializer(conversation, context={"request": request}).data)


class ConversationMemberRemoveView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(request=None, responses={204: None})
    def delete(self, request, conversation_id, user_id):
        conversation = get_object_or_404(
            Conversation, id=conversation_id, members__user=request.user
        )
        if not conversation.is_group:
            raise PermissionDenied("You cannot leave a one-to-one chat.")
        if user_id != request.user.id and conversation.created_by_id != request.user.id:
            raise PermissionDenied("Only the group creator can remove other members.")

        member = get_object_or_404(ConversationMember, conversation=conversation, user_id=user_id)
        member.delete()
        if not conversation.members.exists():
            conversation.delete()
        return Response(status=204)