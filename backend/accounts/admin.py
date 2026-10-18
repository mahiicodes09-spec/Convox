from django.contrib import admin
from .models import User
# Register your models here.

@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ('email' , 'display_name' , 'is_staff' , 'is_email_verified')
    search_fields = ('email' , 'display_name')