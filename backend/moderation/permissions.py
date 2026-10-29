from communities.models import ServerMember
from django.utils import timezone

MODERATOR_ROLES = ["owner", "admin", "moderator"]


def is_moderator(user, server):
    return ServerMember.objects.filter(server=server, user=user, role__in=MODERATOR_ROLES).exists()

def get_restriction(user, server):
    member = ServerMember.objects.filter(server=server, user=user).first()
    if member is None:
        return None
    now = timezone.now()
    if member.suspended_until and member.suspended_until > now:
        return "suspended"
    if member.muted_until and member.muted_until > now:
        return "muted"
    return None