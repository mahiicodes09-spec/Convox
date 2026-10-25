from drf_spectacular.contrib.rest_framework_simplejwt import SimpleJWTScheme
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken
from .utils import is_blacklisted


class RedisJWTAuthentication(JWTAuthentication):
    def get_validated_token(self, raw_token):
        token = super().get_validated_token(raw_token)
        if is_blacklisted(token["jti"]):
            raise InvalidToken("Token logout ho chuka hai. Dobara login karo.")
        return token


# Swagger ko batata hai ki ye bhi Bearer token wala login hai (Authorize button ke liye)
class RedisJWTScheme(SimpleJWTScheme):
    target_class = RedisJWTAuthentication
    name = "jwtAuth"
