from django.urls import path
from .views import ServerListCreateView, ServerDetailView

urlpatterns = [
    path("servers/", ServerListCreateView.as_view(), name="server_list_create"),
    path("servers/<int:pk>/", ServerDetailView.as_view(), name="server_detail"),
]