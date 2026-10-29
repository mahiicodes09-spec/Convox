from rest_framework import serializers
from chat.models import Message
from chat.serializers import AuthorSerializer
from .models import ModerationLog


class FlaggedMessageSerializer(serializers.ModelSerializer):
    author = AuthorSerializer(read_only=True)
    channel_name = serializers.CharField(source="channel.name", read_only=True)

    class Meta:
        model = Message
        fields = ["id", "channel", "channel_name", "author", "content",
                  "toxicity_label", "toxicity_score", "model_version", "created_at"]


class ActionSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=["dismiss", "warn", "remove", "mute", "suspend"])
    reason = serializers.CharField(max_length=500)
    duration_minutes = serializers.IntegerField(required=False, min_value=1, max_value=10080)

class ModerationLogSerializer(serializers.ModelSerializer):
    actor = AuthorSerializer(read_only=True)
    target_user = AuthorSerializer(read_only=True)

    class Meta:
        model = ModerationLog
        fields = ["id", "action", "reason", "actor", "target_user", "message_id",
                  "toxicity_label", "toxicity_score", "created_at"]
