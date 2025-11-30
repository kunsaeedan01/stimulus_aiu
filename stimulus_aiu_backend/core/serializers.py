from rest_framework import serializers
from django.contrib.auth import get_user_model

User = get_user_model()


class MeSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "full_name",
            "position",
            "subdivision",
            "telephone",
            "is_staff",
            "is_superuser",
            "date_joined",
        )
        read_only_fields = ("email", "is_staff", "is_superuser", "date_joined")


class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "full_name",
            "position",
            "subdivision",
            "telephone",
            "password",
        )
        extra_kwargs = {
            "full_name": {"required": True},
            "position": {"required": True},
            "subdivision": {"required": True},
            "telephone": {"required": True},
        }

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user