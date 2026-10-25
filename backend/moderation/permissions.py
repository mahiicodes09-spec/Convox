from communities.models import ServerMember

MODERATOR_ROLES = ["owner", "admin", "moderator"]


def is_moderator(user, server):
    return ServerMember.objects.filter(server=server, user=user, role__in=MODERATOR_ROLES).exists()
