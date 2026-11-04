from django.contrib.auth import get_user_model
from rest_framework import serializers
from .models import Conversation, DirectMessage

User = get_user_model()


class UserBriefSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "display_name", "avatar"]


class ConversationSerializer(serializers.ModelSerializer):
    members = serializers.SerializerMethodField()
    user_ids = serializers.ListField(child=serializers.IntegerField(), write_only=True)

    class Meta:
        model = Conversation
        fields = ["id", "is_group", "name", "created_by", "created_at", "members", "user_ids"]
        read_only_fields = ["is_group", "created_by", "created_at"]

    def get_members(self, obj):
        users = [member.user for member in obj.members.all()]
        return UserBriefSerializer(users, many=True, context=self.context).data

    def validate_user_ids(self, value):
        ids = set(value)
        ids.discard(self.context["request"].user.id)
        if not ids:
            raise serializers.ValidationError("Select at least one other user.")
        if len(ids) > 49:
            raise serializers.ValidationError("A group can have at most 50 members.")
        if User.objects.filter(id__in=ids, is_active=True).count() != len(ids):
            raise serializers.ValidationError("One or more users do not exist.")
        return list(ids)


class DirectMessageSerializer(serializers.ModelSerializer):
    author = UserBriefSerializer(read_only=True)

    class Meta:
        model = DirectMessage
        fields = ["id", "conversation", "author", "content", "created_at", "edited_at"]
        read_only_fields = ["conversation", "created_at", "edited_at"]