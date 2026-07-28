import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("employees", "0004_backfill_main_branch"),
    ]

    operations = [
        migrations.AlterField(
            model_name="employee",
            name="branch",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                related_name="employees",
                to="employees.branch",
            ),
        ),
    ]
