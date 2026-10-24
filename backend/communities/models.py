from django.conf import settings
from django.db import models
import secrets


class Server(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    icon = models.ImageField(upload_to="server_icons/", blank=True, null=True)
    invite_code = models.CharField(max_length=100, unique=True , null=True , blank = True , editable=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="owned_servers",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self , *args , **kwargs):
        if not self.invite_code:
            self.invite_code = secrets.token_urlsafe(6)
        super().save(*args, **kwargs)


    def __str__(self):
        return self.name

class ServerMember(models.Model):
    ROLE_CHOICES = [
        ("owner", "Owner"),
        ("admin", "Admin"),
        ("moderator", "Moderator"),
        ("member", "Member"),
    ]
    server = models.ForeignKey(Server, on_delete=models.CASCADE, related_name="members")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="memberships",
    )
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default="member")
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["server", "user"], name="unique_server_member")
        ]

    def __str__(self):
        return f"{self.user} in {self.server} ({self.role})"


class Channel(models.Model):
    server = models.ForeignKey(Server, on_delete=models.CASCADE, related_name="channels")
    name = models.CharField(max_length=50)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]
        constraints = [
            models.UniqueConstraint(fields=["server", "name"], name="unique_channel_name_in_server")
        ]

    def __str__(self):
        return f"#{self.name} ({self.server})"
