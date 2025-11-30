# compensations/views.py
from django.http import HttpResponse
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from rest_framework import viewsets, permissions, status, decorators, response, filters
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError

from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi

from .models import Application, Paper, Coauthor
from .serializers import (
    ApplicationSerializer,
    ApplicationDetailSerializer,
    PaperSerializer,
    CoauthorSerializer,
)
from .permissions import IsOwnerOrAdmin
from .services import generate_application_docx
from .exporters import build_applications_xlsx

BLOCKED_STATUSES = {"approved", "submitted"}
EDITABLE_STATUSES = {"draft", "rejected"}


class ApplicationViewSet(viewsets.ModelViewSet):
    queryset = Application.objects.select_related("owner").prefetch_related("papers__coauthors").all()
    serializer_class = ApplicationSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrAdmin]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter, filters.SearchFilter]
    filterset_fields = ["status", "faculty"]
    ordering_fields = ["created_at", "report_year"]
    search_fields = ["owner__email", "owner__full_name"]

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.user.is_staff:
            qs = qs.exclude(status="draft")
        else:
            qs = qs.filter(owner=self.request.user)
        return qs

    def get_serializer_class(self):
        if self.action in ["retrieve"]:
            return ApplicationDetailSerializer
        return ApplicationSerializer

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user, status="draft")

    @action(detail=True, methods=["post"])
    def submit(self, request, pk=None):
        app = self.get_object()
        if app.status not in EDITABLE_STATUSES:
            return Response({"detail": "Заявка не в статусе, позволяющем отправку."}, status=400)
        if not app.faculty:
            return Response({"detail": "Укажите высшую школу."}, status=400)
        if not app.papers.exists():
            return Response({"detail": "Добавьте хотя бы одну публикацию."}, status=400)
        
        for paper in app.papers.all():
            if not (paper.has_university_affiliation and paper.registered_in_platonus):
                return Response({"detail": "Все публикации должны иметь аффилиацию университета и быть зарегистрированы в Platonus."}, status=400)
        
        app.status = "submitted"
        app.admin_comment = ""
        app.save(update_fields=["status", "admin_comment"])
        return Response({"detail": "Заявка отправлена"})

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAdminUser])
    def approve(self, request, pk=None):
        app = self.get_object()
        if app.status != "submitted":
            return Response({"detail": "Заявка должна быть в статусе 'Отправлено'."}, status=400)
        comment = request.data.get("comment", "").strip()
        if comment:
            app.admin_comment = comment
        app.status = "approved"
        app.save(update_fields=["status", "admin_comment"])
        return Response({"detail": "Заявка одобрена"})

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAdminUser])
    def reject(self, request, pk=None):
        app = self.get_object()
        if app.status != "submitted":
            return Response({"detail": "Заявка должна быть в статусе 'Отправлено'."}, status=400)
        comment = request.data.get("comment", "").strip()
        if not comment:
            return Response({"detail": "Комментарий обязателен при отклонении"}, status=400)
        app.admin_comment = comment
        app.status = "rejected"
        app.save(update_fields=["status", "admin_comment"])
        return Response({"detail": "Заявка отклонена"})

    @action(detail=True, methods=["get"], permission_classes=[permissions.IsAdminUser])
    def docx(self, request, pk=None):
        app = self.get_object()
        filename, file_content = generate_application_docx(app)
        response = HttpResponse(
            file_content.read(),
            content_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        )
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response

    @action(detail=False, methods=["get"], permission_classes=[permissions.IsAdminUser])
    def export_xlsx(self, request, *args, **kwargs):
        applications_qs = self.filter_queryset(self.get_queryset())
        xlsx_bytes = build_applications_xlsx(applications_qs)
        filename = f"applications_export_{timezone.now().strftime('%Y-%m-%d_%H-%M')}.xlsx" 
        response = HttpResponse(
            xlsx_bytes,
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response



class PaperViewSet(viewsets.ModelViewSet):
    queryset = Paper.objects.select_related("application", "application__owner").all()
    serializer_class = PaperSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrAdmin]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter, filters.SearchFilter]
    filterset_fields = ["indexation", "quartile", "percentile", "year"]
    ordering_fields = ["created_at", "publication_date", "year"]
    search_fields = ["title", "doi", "journal_or_source"]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    http_method_names = ["get", "post", "put", "patch", "delete", "head", "options"]

    def get_queryset(self):
        qs = super().get_queryset()
        if not self.request.user.is_staff:
            qs = qs.filter(application__owner=self.request.user)
        app_id = self.request.query_params.get("application")
        if app_id:
            qs = qs.filter(application_id=app_id)
        return qs
    
    def perform_create(self, serializer):
        application_id = self.request.data.get("application")
        if not application_id:
            raise ValidationError({"application": "Application ID is required."})

        try:
            application = Application.objects.get(id=application_id, owner=self.request.user)
        except Application.DoesNotExist:
            raise ValidationError({"application": "Invalid application."})

        if application.status not in EDITABLE_STATUSES and not self.request.user.is_staff:
            raise ValidationError({"application": "Можно добавлять публикации только в черновики или отклонённые заявки."})

        serializer.save(application=application)

    def perform_destroy(self, instance):
        if instance.application.status not in EDITABLE_STATUSES and not self.request.user.is_staff:
            raise ValidationError("Можно удалять публикации только в черновики или отклонённые заявки.")
        super().perform_destroy(instance)

    @swagger_auto_schema(
        operation_id="papers_list",
        operation_description="Список публикаций. Доступ ограничен владельцем заявки и администратором.",
        manual_parameters=[
            openapi.Parameter("application", openapi.IN_QUERY, type=openapi.TYPE_STRING, description="UUID заявки"),
            openapi.Parameter("indexation", openapi.IN_QUERY, type=openapi.TYPE_STRING, enum=["scopus", "wos"]),
            openapi.Parameter("quartile", openapi.IN_QUERY, type=openapi.TYPE_STRING, enum=["Q1", "Q2", "Q3", "Q4", "N/A"]),
            openapi.Parameter("percentile", openapi.IN_QUERY, type=openapi.TYPE_INTEGER),
            openapi.Parameter("year", openapi.IN_QUERY, type=openapi.TYPE_INTEGER),
            openapi.Parameter("ordering", openapi.IN_QUERY, type=openapi.TYPE_STRING),
            openapi.Parameter("search", openapi.IN_QUERY, type=openapi.TYPE_STRING),
        ],
        responses={200: PaperSerializer(many=True)},
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @swagger_auto_schema(
        operation_id="papers_retrieve",
        operation_description="Получить публикацию.",
        responses={200: PaperSerializer()},
    )
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.application.status not in EDITABLE_STATUSES and not request.user.is_staff:
            raise ValidationError("Можно редактировать публикации только в черновики или отклонённые заявки.")
        return super().update(request, *args, **kwargs)

    @swagger_auto_schema(
        operation_id="papers_partial_update",
        operation_description="Частичное обновление публикации (PATCH). Поддерживает multipart/form-data. См. формат поля `coauthors` выше.",
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            properties={
                "title": openapi.Schema(type=openapi.TYPE_STRING),
                "journal_or_source": openapi.Schema(type=openapi.TYPE_STRING),
                "indexation": openapi.Schema(type=openapi.TYPE_STRING, enum=["scopus", "wos"]),
                "quartile": openapi.Schema(type=openapi.TYPE_STRING, enum=["Q1", "Q2", "Q3", "Q4", "N/A"], nullable=True),
                "percentile": openapi.Schema(type=openapi.TYPE_INTEGER, minimum=1, maximum=99, nullable=True),
                "doi": openapi.Schema(type=openapi.TYPE_STRING),
                "publication_date": openapi.Schema(type=openapi.TYPE_STRING, format="date"),
                "year": openapi.Schema(type=openapi.TYPE_INTEGER),
                "number": openapi.Schema(type=openapi.TYPE_STRING),
                "volume": openapi.Schema(type=openapi.TYPE_INTEGER),
                "pages": openapi.Schema(type=openapi.TYPE_STRING),
                "coauthors": openapi.Schema(
                    type=openapi.TYPE_ARRAY,
                    items=openapi.Items(type=openapi.TYPE_OBJECT, properties={
                        "id": openapi.Schema(type=openapi.TYPE_STRING),
                        "full_name": openapi.Schema(type=openapi.TYPE_STRING),
                        "position": openapi.Schema(type=openapi.TYPE_STRING),
                        "subdivision": openapi.Schema(type=openapi.TYPE_STRING),
                        "telephone": openapi.Schema(type=openapi.TYPE_STRING),
                        "email": openapi.Schema(type=openapi.TYPE_STRING, format="email"),
                    }),
                ),
                "has_university_affiliation": openapi.Schema(type=openapi.TYPE_BOOLEAN),
                "registered_in_platonus": openapi.Schema(type=openapi.TYPE_BOOLEAN),
                "source_url": openapi.Schema(type=openapi.TYPE_STRING, format="uri"),
                "file_upload": openapi.Schema(type=openapi.TYPE_FILE),
            },
        ),
        responses={200: PaperSerializer()},
    )
    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.application.status not in EDITABLE_STATUSES and not request.user.is_staff:
            raise ValidationError("Можно редактировать публикации только в черновики или отклонённые заявки.")
        return super().partial_update(request, *args, **kwargs)

    @swagger_auto_schema(
        operation_id="papers_destroy",
        operation_description="Удалить публикацию.",
        responses={204: openapi.Response("No Content")},
    )
    def destroy(self, request, *args, **kwargs):
        return super().destroy(request, *args, **kwargs)


class CoauthorViewSet(viewsets.ModelViewSet):
    queryset = Coauthor.objects.all()
    serializer_class = CoauthorSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter, filters.SearchFilter]
    filterset_fields = ["subdivision", "position"]
    ordering_fields = ["full_name", "email", "created_at"]
    search_fields = ["full_name", "email", "telephone", "subdivision", "position"]

    @swagger_auto_schema(
        operation_id="coauthors_list",
        operation_description="Список соавторов (с фильтрами и поиском).",
        manual_parameters=[
            openapi.Parameter("subdivision", openapi.IN_QUERY, type=openapi.TYPE_STRING),
            openapi.Parameter("position", openapi.IN_QUERY, type=openapi.TYPE_STRING),
            openapi.Parameter("ordering", openapi.IN_QUERY, type=openapi.TYPE_STRING),
            openapi.Parameter("search", openapi.IN_QUERY, type=openapi.TYPE_STRING),
        ],
        responses={200: CoauthorSerializer(many=True)},
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @swagger_auto_schema(
        operation_id="coauthors_retrieve",
        operation_description="Получить соавтора.",
        responses={200: CoauthorSerializer()},
    )
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)

    @swagger_auto_schema(
        operation_id="coauthors_create",
        operation_description="Создать соавтора.",
        request_body=CoauthorSerializer,
        responses={201: CoauthorSerializer()},
    )
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)

    @swagger_auto_schema(
        operation_id="coauthors_update",
        operation_description="Полное обновление соавтора.",
        request_body=CoauthorSerializer,
        responses={200: CoauthorSerializer()},
    )
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)

    @swagger_auto_schema(
        operation_id="coauthors_partial_update",
        operation_description="Частичное обновление соавтора (PATCH).",
        request_body=CoauthorSerializer,
        responses={200: CoauthorSerializer()},
    )
    def partial_update(self, request, *args, **kwargs):
        return super().partial_update(request, *args, **kwargs)

    @swagger_auto_schema(
        operation_id="coauthors_destroy",
        operation_description="Удалить соавтора. Только администратор.",
        responses={204: openapi.Response("No Content")},
    )
    def destroy(self, request, *args, **kwargs):
        if not request.user.is_staff:
            return response.Response({"detail": "Только администратор может удалять соавторов."},
                                     status=status.HTTP_403_FORBIDDEN)
        return super().destroy(request, *args, **kwargs)