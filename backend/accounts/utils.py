import secrets
import time
from django.conf import settings
from django.contrib.auth.hashers import make_password, check_password
from django.core.cache import cache
from django.core.mail import send_mail

OTP_TTL = 600              
MAX_ATTEMPTS = 5           
RESEND_SECONDS = 60        
RESET_TOKEN_TTL = 600      
LOGIN_MAX_FAILS = 5        
LOGIN_LOCK_SECONDS = 900   

def _reg_key(email):
    return f"pending_reg:{email.lower()}"

def _reset_otp_key(email):
    return f"reset_otp:{email.lower()}"

def _reset_token_key(email):
    return f"reset_token:{email.lower()}"

def _login_fail_key(email):
    return f"login_fail:{email.lower()}"

def _blacklist_key(jti):
    return f"blacklist:{jti}"


def _new_code():
    return f"{secrets.randbelow(10**6):06d}"


def _mail_code(email, code, subject):
    send_mail(
        subject=subject,
        message=f"Your verification code is {code}. It is valid for 10 minutes.",
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[email],
    )


def _create_otp(key, email, subject, extra=None):
    old = cache.get(key)
    if old and time.time() - old["created_at"] < RESEND_SECONDS:
        return False
    code = _new_code()
    data = dict(extra or {})
    data.update({
        "otp_hash": make_password(code),
        "attempts": 0,
        "created_at": time.time(),
    })
    cache.set(key, data, timeout=OTP_TTL)
    _mail_code(email, code, subject)
    return True


def _check_otp(key, code):
    data = cache.get(key)
    if not data:
        return None
    if data["attempts"] >= MAX_ATTEMPTS:
        cache.delete(key)
        return None
    if not check_password(code, data["otp_hash"]):
        data["attempts"] += 1
        remaining = max(1, OTP_TTL - int(time.time() - data["created_at"]))
        cache.set(key, data, timeout=remaining)
        return None
    cache.delete(key)
    return data


def _resend_otp(key, email, subject):
    data = cache.get(key)
    if not data:
        return False
    if time.time() - data["created_at"] < RESEND_SECONDS:
        return False
    code = _new_code()
    data["otp_hash"] = make_password(code)
    data["attempts"] = 0
    data["created_at"] = time.time()
    cache.set(key, data, timeout=OTP_TTL)
    _mail_code(email, code, subject)
    return True


REG_SUBJECT = "Smart Community - Email verification code"

def start_registration(email, display_name, raw_password):
    extra = {"display_name": display_name, "password_hash": make_password(raw_password)}
    return _create_otp(_reg_key(email), email, REG_SUBJECT, extra)


def verify_registration(email, code):
    return _check_otp(_reg_key(email), code)


def resend_registration(email):
    return _resend_otp(_reg_key(email), email, REG_SUBJECT)


RESET_SUBJECT = "Smart Community - Password reset code"

def start_password_reset(email):
    return _create_otp(_reset_otp_key(email), email, RESET_SUBJECT)


def verify_reset_otp(email, code):
    if _check_otp(_reset_otp_key(email), code) is None:
        return None
    token = secrets.token_urlsafe(32)
    cache.set(_reset_token_key(email), make_password(token), timeout=RESET_TOKEN_TTL)
    return token


def use_reset_token(email, token):
    key = _reset_token_key(email)
    token_hash = cache.get(key)
    if not token_hash or not check_password(token, token_hash):
        return False
    cache.delete(key)
    return True


def is_login_locked(email):
    fails = cache.get(_login_fail_key(email), 0)
    return fails >= LOGIN_MAX_FAILS


def record_failed_login(email):
    key = _login_fail_key(email)
    cache.add(key, 0, timeout=LOGIN_LOCK_SECONDS)
    cache.incr(key)


def clear_failed_logins(email):
    cache.delete(_login_fail_key(email))

def blacklist_token(token):
    seconds_left = int(token["exp"] - time.time())
    if seconds_left > 0:
        cache.set(_blacklist_key(token["jti"]), True, timeout=seconds_left)


def is_blacklisted(jti):
    return cache.get(_blacklist_key(jti)) is not None
