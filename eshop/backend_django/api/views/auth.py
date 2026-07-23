from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.db import transaction
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from api.serializers.auth import CurrentUserSerializer, SignupSerializer


def auth_response(user):
    token, _ = Token.objects.get_or_create(user=user)
    return {"token": token.key, "user": CurrentUserSerializer(user).data}


class SignupAPIView(APIView):
    permission_classes = [AllowAny]

    @transaction.atomic
    def post(self, request):
        serializer = SignupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = User.objects.create_user(
            username=serializer.validated_data["username"],
            email=serializer.validated_data["email"],
            first_name=serializer.validated_data.get("first_name", ""),
            last_name=serializer.validated_data.get("last_name", ""),
            password=serializer.validated_data["password"],
            is_staff=False,
            is_superuser=False,
            is_active=True,
        )
        return Response(auth_response(user), status=status.HTTP_201_CREATED)


class SigninAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        identity = request.data.get("email_or_username", "").strip()
        password = request.data.get("password", "")
        user = authenticate(request, username=identity, password=password)
        if user is None and "@" in identity:
            matched_user = User.objects.filter(email__iexact=identity).first()
            if matched_user:
                user = authenticate(request, username=matched_user.username, password=password)
        if user is None or not user.is_active:
            return Response({"detail": "Invalid email/username or password."}, status=status.HTTP_401_UNAUTHORIZED)
        return Response(auth_response(user))


class SignoutAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        Token.objects.filter(user=request.user).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(CurrentUserSerializer(request.user).data)
