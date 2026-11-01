from django.urls import path
from .views import ModerationQueueView, ModerationActionView, ModerationLogListView, ServerAnalyticsView

urlpatterns = [
    path("servers/<int:server_id>/moderation/queue/", ModerationQueueView.as_view(), name="moderation_queue"),
    path("servers/<int:server_id>/moderation/logs/", ModerationLogListView.as_view(), name="moderation_logs"),
    path("moderation/messages/<int:message_id>/action/", ModerationActionView.as_view(), name="moderation_action"),
    path("servers/<int:server_id>/analytics/", ServerAnalyticsView.as_view(), name="server_analytics"),
]
