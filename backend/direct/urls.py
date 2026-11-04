from django.urls import path
from .views import ConversationListCreateView, DirectMessageListCreateView, DirectMessageDetailView , ConversationMemberAddView , ConversationMemberRemoveView

urlpatterns = [
    path("conversations/", ConversationListCreateView.as_view(), name="conversation_list_create"),
    path("conversations/<int:conversation_id>/messages/", DirectMessageListCreateView.as_view(), name="direct_message_list_create"),
    path("direct-messages/<int:pk>/", DirectMessageDetailView.as_view(), name="direct_message_detail"),
    path("conversations/<int:conversation_id>/members/", ConversationMemberAddView.as_view(), name="conversation_member_add"),
    path("conversations/<int:conversation_id>/members/<int:user_id>/", ConversationMemberRemoveView.as_view(), name="conversation_member_remove"),
]