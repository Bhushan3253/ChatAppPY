from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from django.core.mail import send_mail
from .serializers import UserSerializer

class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = UserSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            
            # Send a Welcome / Verification Email
            try:
                send_mail(
                    subject='Welcome to ChatApp! Verification required.',
                    message=f'Hi {user.username},\n\nThank you for registering at ChatApp! Your email ({user.email}) has been successfully linked to your account.\n\nEnjoy chatting!',
                    from_email=None, # Uses DEFAULT_FROM_EMAIL from settings
                    recipient_list=[user.email],
                    fail_silently=False,
                )
            except Exception as e:
                print(f"Failed to send email: {e}")

            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
