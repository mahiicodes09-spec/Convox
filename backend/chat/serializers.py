from django.contrib.auth import get_user_model
from rest_framework import serializers
from .models import Message

User = get_user_model()


class AuthorSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "display_name", "avatar"]


class MessageSerializer(serializers.ModelSerializer):
    author = AuthorSerializer(read_only=True)

    class Meta:
        model = Message
        fields = ["id", "channel", "author", "content", "created_at", "edited_at", "moderation_status"]
        read_only_fields = ["channel", "created_at", "edited_at", "moderation_status"]
    def to_representation(self, instance):
        data = super().to_representation(instance)
        if instance.moderation_status in ("flagged", "reviewed"):
            request = self.context.get("request")
            is_author = request is not None and request.user == instance.author
            if not is_author:
                data["content"] = "*" * len(instance.content)
        return data
