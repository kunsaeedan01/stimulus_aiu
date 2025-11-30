from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('compensations', '0008_alter_application_status'),
    ]

    operations = [
        migrations.AddField(
            model_name='coauthor',
            name='is_aiu_employee',
            field=models.BooleanField(default=False, verbose_name='Сотрудник AIU'),
        ),
        migrations.RemoveField(
            model_name='paper',
            name='site_source',
        ),
        migrations.AddField(
            model_name='paper',
            name='registered_in_platonus',
            field=models.BooleanField(default=False, verbose_name='Зарегистрировано в Platonus'),
        ),
    ]