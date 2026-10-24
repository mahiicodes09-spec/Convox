from django.contrib.auth import get_user_model
from django.db import IntegrityError
from drf_spectacular.utils import extend_schema
from rest_framework import status , generics
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.permissions import AllowAny , IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .serializers import OTPSerializer, OTPValidateSerializer, RegisterSerializer, UserSerializer , ResetPasswordSerializer , LogoutSerializer, RedisTokenRefreshSerializer
from .utils import (
    start_registration, verify_registration, resend_registration,
    start_password_reset, verify_reset_otp, use_reset_token,
    is_login_locked, record_failed_login, clear_failed_logins,
    blacklist_token,
)

User = get_user_model()

# Create your views here.
class RegisterView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(request=RegisterSerializer)
    def post(self, request):
        s = RegisterSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        d = s.validated_data
        start_registration(d["email"], d["display_name"], d["password"])
        return Response(
            {"detail": "OTP bhej diya gaya hai. 10 minute me verify karo."},
            status=status.HTTP_202_ACCEPTED,
        )


class VerifyOTPView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(request=OTPValidateSerializer)
    def post(self, request):
        s = OTPValidateSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        email = s.validated_data["email"].lower()
        data = verify_registration(email, s.validated_data["otp"])
        if data is None:
            return Response({"detail": "OTP galat hai ya expire ho gaya."},
                            status=status.HTTP_400_BAD_REQUEST)
        try:
            user = User.objects.create(
                email=email,
                display_name=data["display_name"],
                password=data["password_hash"],
                is_email_verified=True,
            )
        except IntegrityError:
            return Response({"detail": "Account pehle se bana hua hai."},
                            status=status.HTTP_400_BAD_REQUEST)
        refresh = RefreshToken.for_user(user)
        return Response({
            "user": UserSerializer(user, context={"request": request}).data,
            "access": str(refresh.access_token),
            "refresh": str(refresh),
        }, status=status.HTTP_201_CREATED)


class ResendVerificationView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(request=OTPSerializer)
    def post(self, request):
        s = OTPSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        resend_registration(s.validated_data["email"].lower())
        return Response({"detail": "Agar registration pending hai to naya OTP bhej diya gaya hai (60 second ka gap rakho)."})


class LoginView(TokenObtainPairView):
    def post(self, request, *args, **kwargs):
        email = str(request.data.get("email", "")).lower()
        if is_login_locked(email):
            return Response({"detail": "Bahut saare galat try. 15 minute baad dobara try karo."},
                            status=status.HTTP_429_TOO_MANY_REQUESTS)
        try:
            response = super().post(request, *args, **kwargs)
        except AuthenticationFailed:
            record_failed_login(email)
            raise
        clear_failed_logins(email)
        return response


class RedisTokenRefreshView(TokenRefreshView):
    serializer_class = RedisTokenRefreshSerializer


class UserProfileView(generics.RetrieveUpdateAPIView):
    http_method_names = ['get', 'patch', 'head', 'options']
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


class ForgotPasswordView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(request=OTPSerializer, responses={200: None})
    def post(self, request):
        serializer = OTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"].lower()

        if User.objects.filter(email__iexact=email).exists():
            start_password_reset(email)

        return Response({"detail": "If the email is registered, a reset code has been sent."})


class VerifyResetOTPView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(request=OTPValidateSerializer, responses={200: None})
    def post(self, request):
        serializer = OTPValidateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"].lower()

        reset_token = verify_reset_otp(email, serializer.validated_data["otp"])
        if reset_token is None:
            return Response({"detail": "OTP is invalid or expired."}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"reset_token": reset_token})


class ResetPasswordView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(request=ResetPasswordSerializer, responses={200: None})
    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"].lower()

        user = User.objects.filter(email__iexact=email).first()
        if not user or not use_reset_token(email, serializer.validated_data["reset_token"]):
            return Response({"detail": "Invalid or expired reset token."}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(serializer.validated_data["new_password"])
        user.save(update_fields=["password"])
        clear_failed_logins(email)
        return Response({"detail": "Password reset successful."})


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(request=LogoutSerializer, responses={204: None})
    def post(self, request):
        s = LogoutSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        try:
            refresh = RefreshToken(s.validated_data["refresh"])
        except TokenError:
            return Response({"detail": "Invalid token."}, status=status.HTTP_400_BAD_REQUEST)
        blacklist_token(refresh)        # refresh token ab naya access nahi bana payega
        blacklist_token(request.auth)   # abhi wala access token bhi turant band
        return Response(status=status.HTTP_204_NO_CONTENT)
