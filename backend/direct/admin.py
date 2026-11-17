from django.contrib import admin
from .models import Conversation, ConversationMember, DirectMessage

admin.site.register(Conversation)
admin.site.register(ConversationMember)
admin.site.register(DirectMessage)