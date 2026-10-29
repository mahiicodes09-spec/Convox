from django.db import transaction
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework import generics
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from .serializers import InvitePreviewSerializer, JoinServerSerializer, ServerSerializer, ChannelSerializer, MemberSerializer
from .models import Server, ServerMember, Channel
from .permissions import IsServerOwnerOrReadOnly
from rest_framework.filters import SearchFilter
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
            Channel.objects.create(server=server, name="general")


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


class ChannelListCreateView(generics.ListCreateAPIView):
    serializer_class = ChannelSerializer
    permission_classes = [IsAuthenticated]

    def get_server(self):
        return get_object_or_404(Server, id=self.kwargs["server_id"], members__user=self.request.user)

    def get_queryset(self):
        return Channel.objects.filter(server=self.get_server())

    def perform_create(self, serializer):
        server = self.get_server()
        member = ServerMember.objects.get(server=server, user=self.request.user)
        if member.role not in ["owner", "admin"]:
            raise PermissionDenied("Sirf owner ya admin channel bana sakte hain.")
        name = serializer.validated_data["name"]
        if Channel.objects.filter(server=server, name=name).exists():
            raise ValidationError({"name": "Is naam ka channel pehle se hai."})
        serializer.save(server=server)


class MemberListView(generics.ListAPIView):
    serializer_class = MemberSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [SearchFilter]
    search_fields = ["user__display_name"]

    def get_queryset(self):
        server = get_object_or_404(Server, id=self.kwargs["server_id"], members__user=self.request.user)
        queryset = ServerMember.objects.filter(server=server).select_related("user").order_by("joined_at")
        role = self.request.query_params.get("role")
        if role:
            queryset = queryset.filter(role=role)
        return queryset

class MemberRoleView(generics.UpdateAPIView):
    serializer_class = MemberSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["patch", "options"]

    def get_object(self):
        server = get_object_or_404(Server, id=self.kwargs["server_id"], members__user=self.request.user)
        if server.owner != self.request.user:
            raise PermissionDenied("Sirf owner roles badal sakta hai.")
        member = get_object_or_404(ServerMember, server=server, user_id=self.kwargs["user_id"])
        if member.user_id == server.owner_id:
            raise PermissionDenied("Owner ka role nahi badal sakte.")
        return member
