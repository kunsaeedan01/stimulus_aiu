import uuid
from django.db import models
from django.contrib.auth.models import AbstractUser, BaseUserManager


class UUIDModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    class Meta:
        abstract = True


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True, db_index=True, verbose_name="Дата создания")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Дата обновления")

    class Meta:
        abstract = True


class StatusModel(models.Model):
    STATUS_DRAFT = "draft"
    STATUS_SUBMITTED = "submitted"
    STATUS_APPROVED = "approved"
    STATUS_REJECTED = "rejected"

    STATUS_CHOICES = [
        (STATUS_DRAFT, "Черновик"),
        (STATUS_SUBMITTED, "Отправлено"),
        (STATUS_APPROVED, "Одобрено"),
        (STATUS_REJECTED, "Отклонено"),
    ]

    status = models.CharField(
        max_length=32,
        choices=STATUS_CHOICES,
        default=STATUS_SUBMITTED,
        db_index=True,
        verbose_name="Статус заявки",
    )

    class Meta:
        abstract = True


class UserManager(BaseUserManager):
    use_in_migrations = True

    def _create_user(self, email, password, role, **extra_fields):
        if not email:
            raise ValueError("Пользователь должен иметь email")
        email = self.normalize_email(email)
        if role not in [User.ROLE_ADMIN, User.ROLE_RESEARCHER]:
            raise ValueError("Неверная роль пользователя")

        user = self.model(email=email, role=role, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        return self._create_user(email=email, password=password, role=User.ROLE_RESEARCHER, **extra_fields)

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        if extra_fields.get("is_staff") is not True:
            raise ValueError("superuser должен иметь is_staff=True")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("superuser должен иметь is_superuser=True")
        return self._create_user(email=email, password=password, role=User.ROLE_ADMIN, **extra_fields)


class User(AbstractUser, UUIDModel, TimeStampedModel):
    ROLE_ADMIN = "admin"
    ROLE_RESEARCHER = "researcher"

    ROLE_CHOICES = [
        (ROLE_ADMIN, "Администратор"),
        (ROLE_RESEARCHER, "Исследователь"),
    ]

    username = None
    email = models.EmailField(unique=True, db_index=True, verbose_name="Email")
    full_name = models.CharField(max_length=255, verbose_name="ФИО", blank=True)
    role = models.CharField(max_length=32, choices=ROLE_CHOICES, default=ROLE_RESEARCHER, db_index=True, verbose_name="Роль")
    position = models.CharField(max_length=255, verbose_name="Должность", blank=True)
    subdivision = models.CharField(max_length=255, verbose_name="Подразделение", blank=True)
    telephone = models.CharField(max_length=64, verbose_name="Контактный телефон", blank=True)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    class Meta:
        verbose_name = "Пользователь"
        verbose_name_plural = "Пользователи"

    def __str__(self):
        return f"{self.email} ({self.role})"