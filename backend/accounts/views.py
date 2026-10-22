from django.shortcuts import render
from rest_framework import generics
from rest_framework.permissions import AllowAny
from accounts.models import User , EmailOTP
from accounts.serializers import RegisterSerializer , UserSerializer , LogoutSerializer , OTPSerializer , OTPValidateSerializer , ResetPasswordSerializer
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema
from .utils import send_otp , verify_otp
from django.contrib.auth.tokens import default_token_generator

# Create your views here.
class RegisterView(generics.CreateAPIView):
    authentication_classes = []
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]
    def perform_create(self , serializer):
        user = serializer.save()
        send_otp(user , "verify")

class LogoutView(APIView):
    permission_classes = [IsAuthenticated]
    @extend_schema(request=LogoutSerializer, responses={205: None})
    def post(self, request):
        try:
            refresh_token = request.data.get("refresh")
            if not refresh_token:
                return Response(
                    {"detail": "Refresh token is required."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response(
                status=status.HTTP_205_RESET_CONTENT
            )
        except TokenError:
            return Response(
                {"detail": "Token is invalid or already expired."},
                status=status.HTTP_400_BAD_REQUEST
            )
class UserProfileView(generics.RetrieveUpdateAPIView):
    http_method_names = ['get', 'patch', 'head', 'options']
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user

class VerifyOTPView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(request=OTPValidateSerializer, responses={200: None})
    def post(self, request):
        serializer = OTPValidateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]
        otp = serializer.validated_data["otp"]

        user = User.objects.filter(email__iexact=email).first()
        if not user or not verify_otp(user, "verify", otp):
            return Response({"detail": "OTP is invalid or expired."}, status=status.HTTP_400_BAD_REQUEST)

        user.is_email_verified = True
        user.save(update_fields=["is_email_verified"])
        return Response({"detail": "Email verified successfully."})
    
class ResendVerificationView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(request=OTPSerializer, responses={200: None})
    def post(self, request):
        serializer = OTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]

        user = User.objects.filter(email__iexact=email).first()
        if user and not user.is_email_verified:
            send_otp(user, "verify")

        return Response({"detail": "If the email is registered, an OTP has been sent."})

class ForgotPasswordView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(request=OTPSerializer, responses={200: None})
    def post(self, request):
        serializer = OTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]

        user = User.objects.filter(email__iexact=email).first()
        if user:
            send_otp(user, "reset_password")

        return Response({"detail": "If the email is registered, a reset code has been sent."})

class ResetPasswordView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(request=ResetPasswordSerializer, responses={200: None})
    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]
        reset_token = serializer.validated_data["reset_token"]
        new_password = serializer.validated_data["new_password"]

        user = User.objects.filter(email__iexact=email).first()
        if not user or not default_token_generator.check_token(user, reset_token):
            return Response({"detail": "Invalid or expired reset token."}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save(update_fields=["password"])
        return Response({"detail": "Password reset successful."})

class VerifyResetOTPView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(request=OTPValidateSerializer, responses={200: None})
    def post(self, request):
        serializer = OTPValidateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]
        otp = serializer.validated_data["otp"]

        user = User.objects.filter(email__iexact=email).first()
        if not user or not verify_otp(user, "reset_password", otp):
            return Response({"detail": "OTP is invalid or expired."}, status=status.HTTP_400_BAD_REQUEST)

        reset_token = default_token_generator.make_token(user)
        return Response({"reset_token": reset_token})