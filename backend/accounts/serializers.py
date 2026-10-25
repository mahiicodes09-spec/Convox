from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password as django_validate_password
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import InvalidToken
from .utils import is_blacklisted

User = get_user_model()
class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    display_name = serializers.CharField(max_length=50)
    password = serializers.CharField(write_only=True)
    password2 = serializers.CharField(write_only=True)

    def validate_email(self, value):
        value = value.lower()
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Is email se account pehle se hai.")
        return value

    def validate_password(self, value):
        django_validate_password(value)       # Django ke password rules
        return value

    def validate(self, attrs):
        if attrs["password"] != attrs["password2"]:
            raise serializers.ValidationError({"password2": "Passwords match nahi karte."})
        return attrs
    
class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'email', 'display_name', 'bio' , 'status' , 'avatar' , 'is_email_verified' , 'date_joined')
        read_only_fields = ('id', 'email', 'date_joined' , 'is_email_verified')
    def validate_avatar(self, value):
        if value is None:
            return value 
        max_size = 2 * 1024 * 1024
        if value.size > max_size:
            raise serializers.ValidationError("Avatar size should be less than 2MB")
        valid_extensions = ['jpg' , 'jpeg' , 'png', 'webp']
        extension = value.name.split('.')[-1].lower()
        if extension not in valid_extensions:
            raise serializers.ValidationError(
                f"Unsupported file format. Allowed formats: {', '.join(valid_extensions)}"
            )
        return value
    
class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField()


class RedisTokenRefreshSerializer(TokenRefreshSerializer):
    def validate(self, attrs):
        refresh = RefreshToken(attrs["refresh"])
        if is_blacklisted(refresh["jti"]):
            raise InvalidToken("Token logout ho chuka hai. Dobara login karo.")
        return super().validate(attrs)

class OTPSerializer(serializers.Serializer):
    email = serializers.EmailField()

class OTPValidateSerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp = serializers.CharField(min_length=6, max_length=6)

class ResetPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()
    reset_token = serializers.CharField()
    new_password = serializers.CharField(write_only=True, validators=[django_validate_password])
    new_password2 = serializers.CharField(write_only=True)

    def validate(self, attrs):
        if attrs["new_password"] != attrs["new_password2"]:
            raise serializers.ValidationError({"new_password2": "Passwords do not match."})
        return attrs
