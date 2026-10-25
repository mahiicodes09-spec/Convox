from django.conf import settings
from django.db import models
from communities.models import Server


class ModerationLog(models.Model):
    ACTION_CHOICES = [
        ("dismiss", "Dismiss"),
        ("warn", "Warn"),
        ("remove", "Remove"),
    ]
    server = models.ForeignKey(Server, on_delete=models.CASCADE, related_name="moderation_logs")
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="moderation_actions",
    )
    target_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="moderation_received",
    )
    # message delete ho sakta hai, isliye sirf uski id rakhte hain (ForeignKey nahi)
    message_id = models.IntegerField(null=True, blank=True)
    action = models.CharField(max_length=10, choices=ACTION_CHOICES)
    reason = models.TextField(max_length=500)
    toxicity_label = models.CharField(max_length=50, blank=True)
    toxicity_score = models.FloatField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.actor} {self.action} message {self.message_id} ({self.server})"
