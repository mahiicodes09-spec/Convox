from django.contrib import admin
from .models import Server , ServerMember , Channel
# Register your models here.
admin.site.register(Server)
admin.site.register(ServerMember)
admin.site.register(Channel)
