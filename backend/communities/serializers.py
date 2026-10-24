from django.conf import settings
from rest_framework import serializers
from .models import Server


class ServerSerializer(serializers.ModelSerializer):
    invite_link = serializers.SerializerMethodField()

    class Meta:
        model = Server
        fields = ["id", "name", "description", "icon", "owner",
                  "invite_code", "invite_link", "created_at"]
        read_only_fields = ["owner", "invite_code", "created_at"]

    def get_invite_link(self, obj):
        if not obj.invite_code:
            return None
        return f"{settings.FRONTEND_URL}/invite/{obj.invite_code}"


class JoinServerSerializer(serializers.Serializer):
    invite_code = serializers.CharField(max_length=200)

    def validate_invite_code(self, value):
        return value.strip().rstrip("/").split("/")[-1]


class InvitePreviewSerializer(serializers.ModelSerializer):
    member_count = serializers.SerializerMethodField()

    class Meta:
        model = Server
        fields = ["name", "description", "icon", "member_count"]

    def get_member_count(self, obj):
        return obj.members.count()