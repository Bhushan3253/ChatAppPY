import json
import hashlib
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import Room, Message, Reaction
from django.contrib.auth import get_user_model
from django.db.models import Count

User = get_user_model()

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_id = self.scope['url_route']['kwargs']['room_id']
        room_hash = hashlib.sha256(self.room_id.encode('utf-8')).hexdigest()
        self.room_group_name = f'chat_{room_hash}'
        self.user = self.scope.get('user')

        if not self.user or self.user.is_anonymous:
            await self.close()
            return

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

        await self.update_user_status(True)
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'user_presence',
                'username': self.user.username,
                'status': 'online'
            }
        )

    async def disconnect(self, close_code):
        if hasattr(self, 'user') and not self.user.is_anonymous:
            await self.update_user_status(False)
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'user_presence',
                    'username': self.user.username,
                    'status': 'offline'
                }
            )
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        data = json.loads(text_data)
        msg_type = data.get('type', 'message')

        if msg_type == 'message':
            message = data.get('content')
            msg_obj = await self.save_message(self.user, message, self.room_id)
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat_message',
                    'id': msg_obj.id,
                    'message': message,
                    'sender': self.user.username,
                    'timestamp': str(msg_obj.timestamp) if msg_obj else None
                }
            )
        
        elif msg_type == 'typing':
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'user_typing',
                    'username': self.user.username,
                    'is_typing': data.get('is_typing', False)
                }
            )
        
        elif msg_type == 'reaction':
            message_id = data.get('message_id')
            emoji = data.get('emoji')
            summary = await self.toggle_reaction(self.user, message_id, emoji)
            
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'message_reaction',
                    'message_id': message_id,
                    'reactions_summary': summary
                }
            )

    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            'type': 'message',
            'id': event.get('id'),
            'content': event['message'],
            'sender': event['sender'],
            'timestamp': event.get('timestamp')
        }))

    async def user_presence(self, event):
        await self.send(text_data=json.dumps({
            'type': 'presence',
            'username': event['username'],
            'status': event['status']
        }))

    async def user_typing(self, event):
        await self.send(text_data=json.dumps({
            'type': 'typing',
            'username': event['username'],
            'is_typing': event['is_typing']
        }))

    async def message_reaction(self, event):
        await self.send(text_data=json.dumps({
            'type': 'reaction',
            'message_id': event['message_id'],
            'reactions_summary': event['reactions_summary']
        }))

    @database_sync_to_async
    def update_user_status(self, is_online):
        User.objects.filter(id=self.user.id).update(is_online=is_online)

    @database_sync_to_async
    def save_message(self, user, content, room_id):
        room, _ = Room.objects.get_or_create(room_id=room_id)
        return Message.objects.create(sender=user, room=room, content=content)

    @database_sync_to_async
    def toggle_reaction(self, user, message_id, emoji):
        message = Message.objects.get(id=message_id)
        reaction, created = Reaction.objects.get_or_create(
            message=message, user=user, emoji=emoji
        )
        if not created:
            reaction.delete()
        
        # Get updated summary
        return list(message.reactions.values('emoji').annotate(count=Count('emoji')))
