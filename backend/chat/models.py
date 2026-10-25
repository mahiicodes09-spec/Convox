from django.conf import settings
from django.db import models
from communities.models import Channel


class Message(models.Model):
    STATUS_CHOICES = [
        ("unchecked", "Unchecked"),
        ("clean", "Clean"),
        ("flagged", "Flagged"),
        ("reviewed", "Reviewed"),
    ]
    channel = models.ForeignKey(Channel, on_delete=models.CASCADE, related_name="messages")
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="messages",
    )
    content = models.TextField(max_length=2000)
    created_at = models.DateTimeField(auto_now_add=True)
    edited_at = models.DateTimeField(null=True, blank=True)

    # AI moderation ka result
    moderation_status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="unchecked")
    toxicity_label = models.CharField(max_length=50, blank=True)
    toxicity_score = models.FloatField(null=True, blank=True)
    model_version = models.CharField(max_length=50, blank=True)

    class Meta:
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["channel", "created_at"]),
        ]

    def __str__(self):
        return f"{self.author} in #{self.channel.name}: {self.content[:30]}"
