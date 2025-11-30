# stimulus_aiu/urls.py
from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from django.conf import settings
from django.conf.urls.static import static

from core.views import MeView, RegistrationView, CustomTokenObtainPairView
from compensations.views import ApplicationViewSet, PaperViewSet, CoauthorViewSet
from compensations.meta import MetaFacultiesView, MetaIndexationView, MetaReportYearsView
from rest_framework_simplejwt.views import TokenRefreshView

from drf_yasg.views import get_schema_view
from drf_yasg import openapi
from rest_framework import permissions


router = DefaultRouter()
router.register(r"applications", ApplicationViewSet, basename="applications")
router.register(r"papers", PaperViewSet, basename="papers")
router.register(r"coauthors", CoauthorViewSet, basename="coauthors")

schema_view = get_schema_view(
    openapi.Info(
        title="Stimulus AIU API",
        default_version="v1",
        description="API для автоматизации заявок на компенсацию публикационной активности.",
        terms_of_service="https://example.com/terms/",
        contact=openapi.Contact(email="it@aiu.edu.kz"),
        license=openapi.License(name="Proprietary"),
    ),
    public=False,
    permission_classes=(permissions.IsAdminUser,),
)

urlpatterns = [
    path("admin/", admin.site.urls),

    # === АУТЕНТИФИКАЦИЯ ===
    path("api/auth/login/", CustomTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/auth/me/", MeView.as_view(), name="auth_me"),
    path("api/auth/register/", RegistrationView.as_view(), name="auth_register"),

    # === МЕТАДАННЫЕ ===
    path("api/meta/faculties/", MetaFacultiesView.as_view()),
    path("api/meta/indexation/", MetaIndexationView.as_view()),
    path("api/meta/report_years/", MetaReportYearsView.as_view()),

    # === ОСНОВНЫЕ ЭНДПОИНТЫ ===
    path("api/", include(router.urls)),

    # === SWAGGER / REDOC ===
    path("swagger.json", schema_view.without_ui(cache_timeout=0), name="schema-json"),
    path("swagger.yaml", schema_view.without_ui(cache_timeout=0), name="schema-yaml"),
    path("swagger/", schema_view.with_ui("swagger", cache_timeout=0), name="schema-swagger-ui"),
    path("redoc/", schema_view.with_ui("redoc", cache_timeout=0), name="schema-redoc"),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)