from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from .managers import UserManager
import random
from datetime import timedelta
from django.conf import settings
from django.utils import timezone
# Create your models here.

class User(AbstractBaseUser , PermissionsMixin):
    STATUS_CHOICES = [
        ("online", "Online"),
        ("away", "Away"),
        ("dnd", "Do not disturb"),
    ]
    email = models.EmailField(max_length=100 , unique=True)
    display_name = models.CharField(max_length= 50)
    bio = models.TextField(max_length=200 , blank = True)
    status = models.CharField(max_length=10 , choices=STATUS_CHOICES , default='online')
    avatar = models.ImageField(upload_to='avatar/' , blank = True , null = True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    is_email_verified = models.BooleanField(default = False)
    date_joined = models.DateTimeField(auto_now_add=True)

    objects = UserManager()
    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ['display_name']
    def __str__(self):
        return self.email
    
class EmailOTP(models.Model):
    PURPOSE_CHOICES = [
        ('verify' , "Email verification"),
        ("reset_password", "Reset Password"),
    ]
    user = models.ForeignKey(settings.AUTH_USER_MODEL , on_delete = models.CASCADE , related_name = 'otps')
    code_hash  = models.CharField(max_length=128)
    purpose = models.CharField(max_length=20 , choices=PURPOSE_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)
    is_used = models.BooleanField(default=False)
    attempts = models.PositiveSmallIntegerField(default=0)
    OTP_VALID_MINUTES = 10
    MAX_ATTEMPTS = 5
    @staticmethod
    def generate_code():
        return f"{random.SystemRandom().randint(0, 999999):06d}"

    def is_expired(self):
        return timezone.now() > self.created_at + timedelta(minutes=self.OTP_VALID_MINUTES)
    def is_valid(self):
        if not self.is_used and not self.is_expired() and self.attempts < self.MAX_ATTEMPTS:
            return True 
        return False
    def __str__(self):
        return f"{self.purpose} OTP for {self.user.email}"
    

