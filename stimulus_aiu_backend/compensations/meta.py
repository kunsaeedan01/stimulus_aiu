from rest_framework import views, permissions, response
from django.utils import timezone

from .models import Application, Paper


class MetaFacultiesView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return response.Response({
            "faculties": [{"value": v, "label": l} for v, l in Application.FACULTY_CHOICES]
        })


class MetaIndexationView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return response.Response({
            "indexation": [{"value": v, "label": l} for v, l in Paper.INDEXATION_CHOICES]
        })


class MetaReportYearsView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        span = int(request.query_params.get("span", 2))
        now_year = timezone.now().year
        years = [now_year + i for i in range(span)]
        return response.Response({"years": years})
