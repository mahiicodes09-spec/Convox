from django.db import transaction
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework import generics
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from .serializers import InvitePreviewSerializer, JoinServerSerializer, ServerSerializer
from .models import Server, ServerMember
from .permissions import IsServerOwnerOrReadOnly
# Create your views here.


class ServerListCreateView(generics.ListCreateAPIView):
    serializer_class = ServerSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Server.objects.filter(members__user=self.request.user).order_by("-created_at")

    def perform_create(self, serializer):
        with transaction.atomic():
            server = serializer.save(owner=self.request.user)
            ServerMember.objects.create(server=server, user=self.request.user, role="owner")


class ServerDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ServerSerializer
    permission_classes = [IsAuthenticated, IsServerOwnerOrReadOnly]
    http_method_names = ["get", "patch", "delete", "head", "options"]

    def get_queryset(self):
        return Server.objects.filter(members__user=self.request.user)


class JoinServerView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(request=JoinServerSerializer, responses={200: ServerSerializer, 201: ServerSerializer})
    def post(self, request):
        s = JoinServerSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        server = get_object_or_404(Server, invite_code=s.validated_data["invite_code"])
        _, created = ServerMember.objects.get_or_create(server=server, user=request.user)
        data = ServerSerializer(server, context={"request": request}).data
        return Response(data, status=201 if created else 200)


class InvitePreviewView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(responses=InvitePreviewSerializer)
    def get(self, request, code):
        server = get_object_or_404(Server, invite_code=code)
        return Response(InvitePreviewSerializer(server, context={"request": request}).data)
