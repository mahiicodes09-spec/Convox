from django.urls import path
from .views import (
    RegisterView, LoginView, RedisTokenRefreshView, LogoutView, UserProfileView,
    VerifyOTPView, ResendVerificationView, ForgotPasswordView, ResetPasswordView, VerifyResetOTPView,
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', RedisTokenRefreshView.as_view(), name='refresh_token'),
    path('logout/', LogoutView.as_view(), name = 'logout' ),
    path('me/' , UserProfileView.as_view(), name= 'user_profile'),
    path('verify-email/', VerifyOTPView.as_view(), name='verify_email'),
    path('resend-verification/', ResendVerificationView.as_view(), name='resend_verification'),
    path('forgot-password/', ForgotPasswordView.as_view(), name='forgot_password'),
    path('reset-password/', ResetPasswordView.as_view(), name='reset_password'),
    path('verify-reset-otp/', VerifyResetOTPView.as_view(), name='verify_reset_otp'),
]
