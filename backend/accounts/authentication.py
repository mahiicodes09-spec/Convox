from drf_spectacular.contrib.rest_framework_simplejwt import SimpleJWTScheme
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken
from .utils import is_blacklisted


class RedisJWTAuthentication(JWTAuthentication):
    def get_validated_token(self, raw_token):
        token = super().get_validated_token(raw_token)
        if is_blacklisted(token["jti"]):
            raise InvalidToken("token has been logged out , Login again")
        return token


class RedisJWTScheme(SimpleJWTScheme):
    target_class = RedisJWTAuthentication
    name = "jwtAuth"
