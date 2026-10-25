from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from .managers import UserManager
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

# EmailOTP model hata diya: ab saare OTP Redis mein rehte hain (accounts/utils.py).
