import os
import uuid
from datetime import date

from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db import models
from django.db.models import Q

from core.models import UUIDModel, TimeStampedModel, StatusModel


def article_upload_path(instance, filename):
    paper_id = str(instance.id or uuid.uuid4())
    app_id = getattr(instance, "application_id", "no-app")
    return f"papers/{app_id}_{paper_id}_{filename}"


def generated_docx_upload_path(instance, filename):
    safe_name = filename.replace("\\", "/")
    return f"generated/{instance.id or uuid.uuid4()}_{safe_name}"


class Application(UUIDModel, TimeStampedModel, StatusModel):
    FAC_PED_INSTITUTE = "pedagogical_institute"
    FAC_ARTS_HUMANITIES = "arts_humanities"
    FAC_IT_ENGINEERING = "it_engineering"
    FAC_NATURAL_SCI = "natural_sciences"
    FAC_ECONOMICS = "economics"
    FAC_LAW = "law"

    FACULTY_CHOICES = [
        (FAC_PED_INSTITUTE, "Педагогический институт"),
        (FAC_ARTS_HUMANITIES, "Высшая школа искусства и гуманитарных наук"),
        (FAC_IT_ENGINEERING, "Высшая школа информационных технологий и инженерии"),
        (FAC_NATURAL_SCI, "Высшая школа естественных наук"),
        (FAC_ECONOMICS, "Высшая школа экономики"),
        (FAC_LAW, "Высшая школа права"),
    ]

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="applications",
        verbose_name="Владелец",
    )

    report_year = models.PositiveIntegerField(
        default=date.today().year,
        db_index=True,
        verbose_name="Отчётный год",
    )

    faculty = models.CharField(
        max_length=64,
        choices=FACULTY_CHOICES,
        db_index=True,
        blank=True, 
        null=True,
        verbose_name="Факультет",
    )

    admin_comment = models.TextField(
        blank=True,
        default="",
        verbose_name="Комментарий администратора"
    )

    generated_docx = models.FileField(
        upload_to="applications/docx/",
        blank=True,
        null=True,
        verbose_name="Сгенерированный DOCX"
    )

    class Meta:
        verbose_name = "Заявка на компенсацию"
        verbose_name_plural = "Заявки на компенсацию"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Заявка {self.id} ({self.owner})"


class Coauthor(UUIDModel, TimeStampedModel):

    full_name = models.CharField(
        max_length=255,
        verbose_name="ФИО",
        blank=True,
    )
    position = models.CharField(
        max_length=255,
        verbose_name="Должность",
        blank=True,
    )
    subdivision = models.CharField(
        max_length=255,
        verbose_name="Подразделение",
        blank=True,
    )
    telephone = models.CharField(
        max_length=64,
        verbose_name="Контактный телефон",
        blank=True,
    )
    email = models.EmailField(
        verbose_name="Email",
        blank=True,
    )
    is_aiu_employee = models.BooleanField(
        default=False,
        verbose_name="Сотрудник AIU",
    )

    class Meta:
        verbose_name = "Соавтор"
        verbose_name_plural = "Соавторы"
        ordering = ["full_name"]

    def __str__(self):
        return self.full_name or "Соавтор без имени"


class Paper(UUIDModel, TimeStampedModel):
    INDEXATION_SCOPUS = "scopus"
    INDEXATION_WOS = "wos"
    INDEXATION_CHOICES = [
        (INDEXATION_SCOPUS, "Scopus"),
        (INDEXATION_WOS, "Web of Science"),
    ]

    QUARTILE_Q1 = "Q1"
    QUARTILE_Q2 = "Q2"
    QUARTILE_Q3 = "Q3"
    QUARTILE_Q4 = "Q4"
    QUARTILE_NONE = "N/A"
    QUARTILE_CHOICES = [
        (QUARTILE_Q1, "Q1"),
        (QUARTILE_Q2, "Q2"),
        (QUARTILE_Q3, "Q3"),
        (QUARTILE_Q4, "Q4"),
        (QUARTILE_NONE, "Нет/Не указано"),
    ]

    application = models.ForeignKey(
        Application,
        on_delete=models.CASCADE,
        related_name="papers",
        verbose_name="Заявка",
    )

    title = models.CharField(
        max_length=512,
        verbose_name="Название публикации",
    )

    journal_or_source = models.CharField(
        max_length=512,
        verbose_name="Журнал/Источник публикации",
        blank=True,
    )

    indexation = models.CharField(
        max_length=16,
        choices=INDEXATION_CHOICES,
        default=INDEXATION_SCOPUS,
        db_index=True,
        verbose_name="Индексация",
    )

    quartile = models.CharField(
        max_length=8,
        choices=QUARTILE_CHOICES,
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Квартиль (только для WoS)",
    )

    percentile = models.PositiveIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(99)],
        blank=True,
        null=True,
        verbose_name="Перцентиль (только для Scopus)",
    )

    doi = models.CharField(
        max_length=128,
        verbose_name="DOI",
        blank=True,
    )

    publication_date = models.DateField(
        null=True,
        blank=True,
        verbose_name="Дата публикации",
    )

    year = models.PositiveIntegerField(
        blank=True,
        null=True,
        verbose_name="Год",
    )
    number = models.CharField(
        max_length=64,
        blank=True,
        verbose_name="Номер",
    )
    volume = models.PositiveIntegerField(
        blank=True,
        null=True,
        verbose_name="Том",
    )
    pages = models.CharField(
        max_length=64,
        blank=True,
        verbose_name="Страницы",
    )

    coauthors = models.ManyToManyField(
        Coauthor,
        related_name="papers",
        blank=True,
        verbose_name="Соавторы",
    )

    has_university_affiliation = models.BooleanField(
        default=False,
        verbose_name="Есть аффилиация университета",
    )

    registered_in_platonus = models.BooleanField(
        default=False,
        verbose_name="Зарегистрировано в Platonus",
    )

    source_url = models.URLField(
        verbose_name="URL публикации",
        blank=True,
        max_length=1024,
    )

    file_upload = models.FileField(
        upload_to=article_upload_path,
        max_length=1024,
        verbose_name="Файл публикации/подтверждения",
        blank=True,
        null=True,
    )

    class Meta:
        verbose_name = "Публикация"
        verbose_name_plural = "Публикации"
        ordering = ["-created_at"]
        constraints = [
            models.CheckConstraint(
                name="paper_scopus_wos_fields_exclusive",
                check=(
                    Q(
                        indexation="scopus",
                        percentile__isnull=False,
                        quartile__isnull=True,
                    )
                    | Q(
                        indexation="wos",
                        quartile__isnull=False,
                        percentile__isnull=True,
                    )
                ),
            ),
        ]

    def __str__(self):
        tag = ""
        if self.indexation == self.INDEXATION_WOS:
            tag = self.quartile or ""
        elif self.percentile:
            tag = str(self.percentile)
        if tag:
            tag = f" {tag}"
        return f"{self.title} [{self.indexation}{tag}]"