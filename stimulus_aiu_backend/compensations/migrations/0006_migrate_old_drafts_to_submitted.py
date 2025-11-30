from django.db import migrations

def forwards_func(apps, schema_editor):
    Application = apps.get_model("compensations", "Application")
    updated = Application.objects.filter(status__in=["draft", "in_process"]).update(status="submitted")
    print(f"Migrated {updated} applications to 'submitted'")

def reverse_func(apps, schema_editor):
    # если захотите откатить – вернём обратно в draft
    Application = apps.get_model("compensations", "Application")
    Application.objects.filter(status="submitted").update(status="draft")

class Migration(migrations.Migration):
    dependencies = [
        ('compensations', '0005_alter_paper_file_upload'),  
    ]

    operations = [
        migrations.RunPython(forwards_func, reverse_func),
    ]