from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from accounts.models import User

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True , validators = [validate_password])
    password2 = serializers.CharField(write_only=True )

    class Meta:
        model = User
        fields = ('id', 'email', 'display_name', 'password', 'password2')
        extra_kwargs = {
            'id' : {'read_only':True},
        }

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password2": "Passwords do not match."})
        return attrs
    def create(self, validated_data):
        validated_data.pop('password2')  # password2 ko dictionary se remove kar diya
        user = User.objects.create_user(**validated_data)
        return user
    def validate_email(self , value):
        value = value.lower()
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("User with this Email already exists.")
        return value

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
    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Email already exists.")
        return value.lower()

class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField()

class OTPSerializer(serializers.Serializer):
    email = serializers.EmailField()

class OTPValidateSerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp = serializers.CharField(min_length=6, max_length=6)

class ResetPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()
    reset_token = serializers.CharField()
    new_password = serializers.CharField(write_only=True, validators=[validate_password])
    new_password2 = serializers.CharField(write_only=True)

    def validate(self, attrs):
        if attrs["new_password"] != attrs["new_password2"]:
            raise serializers.ValidationError({"new_password2": "Passwords do not match."})
        return attrs
