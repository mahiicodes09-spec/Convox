from django.conf import settings
from django.contrib.auth.hashers import make_password, check_password
from django.core.mail import send_mail
from django.utils import timezone
from datetime import timedelta
from .models import EmailOTP

OTP_RESEND_SECONDS = 60

def send_otp(user , purpose):
    latest = EmailOTP.objects.filter(user=user).order_by('-created_at').first()
    if latest and timezone.now() - latest.created_at < timedelta(seconds=OTP_RESEND_SECONDS):
        return False
    EmailOTP.objects.filter(user=user, purpose=purpose, is_used=False).update(is_used=True)
    code = EmailOTP.generate_code()
    EmailOTP.objects.create(user=user, purpose=purpose, code_hash=make_password(code))
    send_mail(
        subject="Your Smart Community verification code",
        message=f"Your code is {code}. It expires in {EmailOTP.OTP_VALID_MINUTES} minutes.",
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
    )
    return True

def verify_otp(user , purpose , code):
    otp = EmailOTP.objects.filter(user=user , purpose=purpose , is_used=False).order_by('-created_at').first()
    if otp is None or not otp.is_valid():
        return False
    if not check_password(code , otp.code_hash):
        otp.attempts += 1
        otp.save(update_fields=['attempts'])
        return False

    otp.is_used = True
    otp.save(update_fields=['is_used'])
    return True 
    



