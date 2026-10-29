from django.conf import settings
from rest_framework import serializers
from .models import Server, ServerMember, Channel


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


class ChannelSerializer(serializers.ModelSerializer):
    class Meta:
        model = Channel
        fields = ["id", "server", "name", "created_at"]
        read_only_fields = ["server", "created_at"]

    def validate_name(self, value):
        return value.strip().lower().replace(" ", "-")


class MemberSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(source="user.id", read_only=True)
    display_name = serializers.CharField(source="user.display_name", read_only=True)
    avatar = serializers.ImageField(source="user.avatar", read_only=True)

    class Meta:
        model = ServerMember
        fields = ["user_id", "display_name", "avatar", "role", "joined_at"]
        read_only_fields = ["joined_at"]

    def validate_role(self, value):
        if value == "owner":
            raise serializers.ValidationError("Kisi ko owner nahi bana sakte.")
        return value
