import json
from rest_framework import serializers
from .models import Application, Paper, Coauthor

BLOCKED_STATUSES = {"approved", "submitted"}
MAX_UPLOAD_BYTES = 5 * 1024 * 1024
ALLOWED_CONTENT_TYPES = {"application/pdf"}


class CoauthorSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False, allow_null=True)
    full_name = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = Coauthor
        fields = ("id", "full_name", "position", "subdivision", "telephone", "email", "is_aiu_employee")


class PaperSerializer(serializers.ModelSerializer):
    coauthors = CoauthorSerializer(many=True, required=False)
    coauthors_json = serializers.CharField(write_only=True, required=False, allow_blank=True)
    application = serializers.PrimaryKeyRelatedField(queryset=Application.objects.all())

    class Meta:
        model = Paper
        fields = "__all__"

    def validate_file_upload(self, value):
        """
        Check file size and type when a file is actually uploaded.
        """
        if not value:
            return value

        if value.size > MAX_UPLOAD_BYTES:
            raise serializers.ValidationError("Размер файла не должен превышать 5 МБ.")
        
        if not value.name.lower().endswith('.pdf'):
             raise serializers.ValidationError("Файл должен быть в формате PDF.")

        return value

    def validate(self, attrs):
        instance = getattr(self, 'instance', None)
        
        indexation = attrs.get("indexation")
        if not indexation and instance:
            indexation = instance.indexation

        current_quartile = attrs.get("quartile")
        if current_quartile is None and instance:
            current_quartile = instance.quartile
            
        current_percentile = attrs.get("percentile")
        if current_percentile is None and instance:
            current_percentile = instance.percentile

        if indexation == Paper.INDEXATION_WOS:
            attrs["percentile"] = None
            if not current_quartile:
                raise serializers.ValidationError({"quartile": "Для WoS необходимо указать квартиль."})

        elif indexation == Paper.INDEXATION_SCOPUS:
            attrs["quartile"] = None
            if not current_percentile:
                raise serializers.ValidationError({"percentile": "Для Scopus необходимо указать перцентиль."})

        return attrs

    def _handle_coauthors(self, paper, coauthors_data):
        paper.coauthors.clear()
        for co_data in coauthors_data:
            full_name = co_data.get("full_name", "").strip()
            if not full_name:
                continue
            if 'id' in co_data:
                del co_data['id']
            coauthor = Coauthor.objects.create(**co_data)
            paper.coauthors.add(coauthor)

    def create(self, validated_data):
        coauthors_data = validated_data.pop("coauthors", [])
        coauthors_json = validated_data.pop("coauthors_json", None)

        if coauthors_json:
            try:
                coauthors_data = json.loads(coauthors_json)
            except json.JSONDecodeError:
                raise serializers.ValidationError({"coauthors": "Invalid JSON format."})

        paper = Paper.objects.create(**validated_data)
        
        if coauthors_data:
            self._handle_coauthors(paper, coauthors_data)
        return paper

    def update(self, instance, validated_data):
        coauthors_data = validated_data.pop("coauthors", None)
        coauthors_json = validated_data.pop("coauthors_json", None)

        if coauthors_json:
            try:
                coauthors_data = json.loads(coauthors_json)
            except json.JSONDecodeError:
                raise serializers.ValidationError({"coauthors": "Invalid JSON format."})

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if coauthors_data is not None:
            self._handle_coauthors(instance, coauthors_data)
        return instance


class ApplicationSerializer(serializers.ModelSerializer):
    owner = serializers.PrimaryKeyRelatedField(read_only=True)
    owner_email = serializers.EmailField(source="owner.email", read_only=True)
    owner_full_name = serializers.CharField(source="owner.full_name", read_only=True)
    papers = PaperSerializer(many=True, read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Application
        fields = [
            "id",
            "owner",
            "faculty",
            "status",
            "report_year",
            "created_at",
            "updated_at",
            "generated_docx",
            "papers",
            "owner_email",
            "owner_full_name",
            "status_display",
            "admin_comment"
        ]
        read_only_fields = (
            "owner",
            "created_at",
            "updated_at",
            "generated_docx",
            "admin_comment"
        )

    def create(self, validated_data):
        validated_data["owner"] = self.context["request"].user
        return super().create(validated_data)

    def validate_status(self, value):
        user = self.context["request"].user
        instance = self.instance

        if instance and instance.status == value:
            return value

        if user.is_staff:
            return value

        if value == "submitted":
            if instance.status not in ["draft", "rejected"]:
                raise serializers.ValidationError("Отправить можно только черновик или отклоненную заявку.")
            
            if not instance.faculty:
                raise serializers.ValidationError("Укажите высшую школу перед отправкой.")
            
            if not instance.papers.exists():
                raise serializers.ValidationError("Добавьте хотя бы одну публикацию перед отправкой.")

            for paper in instance.papers.all():
                if not (paper.has_university_affiliation and paper.registered_in_platonus):
                    raise serializers.ValidationError(
                        f"Публикация '{paper.title}' должна иметь аффилиацию университета и быть зарегистрирована в Platonus."
                    )
                
                if not paper.file_upload:
                    raise serializers.ValidationError(
                         f"Публикация '{paper.title}' не содержит файла. Загрузите PDF-файл."
                    )

            return value
        
        if value == "draft":
            return value

        raise serializers.ValidationError("У вас нет прав для установки этого статуса.")

    def update(self, instance, validated_data):
        new_status = validated_data.get("status")
        
        if not new_status or new_status == instance.status:
            if (
                instance.status in BLOCKED_STATUSES
                and not self.context["request"].user.is_staff
            ):
                raise serializers.ValidationError(
                    "Редактирование запрещено для отправленных или одобренных заявок."
                )

        if new_status == "submitted" and instance.status == "rejected":
             instance.admin_comment = ""
             instance.save(update_fields=["admin_comment"])

        return super().update(instance, validated_data)


class ApplicationDetailSerializer(ApplicationSerializer):
    papers = PaperSerializer(many=True, read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)