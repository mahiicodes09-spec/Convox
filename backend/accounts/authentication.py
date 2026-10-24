from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken
from .utils import is_blacklisted


class RedisJWTAuthentication(JWTAuthentication):
    def get_validated_token(self, raw_token):
        token = super().get_validated_token(raw_token)
        if is_blacklisted(token["jti"]):
            raise InvalidToken("Token logout ho chuka hai. Dobara login karo.")
        return token
