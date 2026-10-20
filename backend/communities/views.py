from django.shortcuts import render
from django.db import transaction
from rest_framework import generics, permissions
from .models import Server, ServerMember
from .serializers import ServerSerializer
from .permissions import IsServerOwnerOrReadOnly
# Create your views here.

class ServerListCreateView(generics.ListCreateAPIView):
    serializer_class = ServerSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Server.objects.filter(members__user=self.request.user)

    @transaction.atomic
    def perform_create(self, serializer):
        server = serializer.save(owner=self.request.user)
        ServerMember.objects.create(server=server, user=self.request.user, role="owner")


class ServerDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ServerSerializer
    permission_classes = [permissions.IsAuthenticated, IsServerOwnerOrReadOnly]

    def get_queryset(self):
        return Server.objects.filter(members__user=self.request.user)