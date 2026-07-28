import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("payroll", "0006_backfill_agent_main_branch"),
    ]

    operations = [
        migrations.AlterField(
            model_name="salesagent",
            name="branch",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                related_name="agents",
                to="employees.branch",
            ),
        ),
    ]
