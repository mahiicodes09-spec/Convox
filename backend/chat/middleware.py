from urllib.parse import parse_qs
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from accounts.authentication import RedisJWTAuthentication


@database_sync_to_async
def get_user_from_token(token):
    try:
        auth = RedisJWTAuthentication()
        validated_token = auth.get_validated_token(token)
        return auth.get_user(validated_token)
    except Exception:
        return AnonymousUser()


class JWTAuthMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        query = parse_qs(scope["query_string"].decode())
        token = query.get("token", [None])[0]
        if token:
            scope["user"] = await get_user_from_token(token)
        else:
            scope["user"] = AnonymousUser()
        return await self.app(scope, receive, send)
