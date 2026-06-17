from rest_framework import serializers
from .models import Room, Message, Reaction
from django.contrib.auth import get_user_model
from django.db.models import Count

User = get_user_model()

class ReactionSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = Reaction
        fields = ['emoji', 'username']

class MessageSerializer(serializers.ModelSerializer):
    sender = serializers.StringRelatedField()
    file_url = serializers.SerializerMethodField()
    reactions_summary = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = ['id', 'sender', 'content', 'file', 'file_url', 'reactions_summary', 'timestamp']

    def get_file_url(self, obj):
        if obj.file:
            return obj.file.url
        return None
    
    def get_reactions_summary(self, obj):
        # Returns counts of each emoji
        return obj.reactions.values('emoji').annotate(count=Count('emoji'))

class RoomSerializer(serializers.ModelSerializer):
    class Meta:
        model = Room
        fields = ['id', 'room_id', 'created_at']
