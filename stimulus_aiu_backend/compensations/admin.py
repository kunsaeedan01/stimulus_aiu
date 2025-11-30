from django.contrib import admin
from .models import Application, Paper, Coauthor


class PaperInline(admin.TabularInline):
    model = Paper
    extra = 0
    show_change_link = True
    fields = (
        "title",
        "journal_or_source",
        "indexation",
        "quartile",
        "percentile",
        "year",
        "volume",
        "number",
        "pages",
        "has_university_affiliation",
        "doi",
        "site_source",
        "source_url",
        "file_upload",
    )


@admin.register(Application)
class ApplicationAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "owner",
        "faculty",
        "status",
        "report_year",
        "created_at",
    )
    list_filter = ("faculty", "status", "report_year")
    search_fields = ("owner__full_name", "owner__email")
    readonly_fields = ("id", "owner", "created_at", "updated_at")
    date_hierarchy = "created_at"
    inlines = [PaperInline]


@admin.register(Coauthor)
class CoauthorAdmin(admin.ModelAdmin):
    list_display = ("full_name", "email", "position", "subdivision", "telephone")
    search_fields = ("full_name", "email", "position", "subdivision", "telephone")
    ordering = ("full_name",)


@admin.register(Paper)
class PaperAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "application",
        "title",
        "indexation",
        "quartile",
        "percentile",
        "year",
        "volume",
        "number",
        "created_at",
    )
    list_filter = ("indexation", "quartile", "year", "created_at")
    search_fields = ("title", "doi", "application__owner__email", "journal_or_source")
    filter_horizontal = ("coauthors",)
    autocomplete_fields = ("application",)
