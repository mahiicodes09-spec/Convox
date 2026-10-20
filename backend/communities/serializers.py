from rest_framework import serializers
from .models import Server

class ServerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Server
        fields = ["id", "name", "description", "icon", "owner", "created_at"]
        read_only_fields = ["owner", "created_at"]