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