from django.db import migrations


def backfill_main_branch(apps, schema_editor):
    Branch = apps.get_model("employees", "Branch")
    Employee = apps.get_model("employees", "Employee")

    if not Employee.objects.filter(branch__isnull=True).exists():
        return

    main_branch, _ = Branch.objects.get_or_create(
        code="MAIN", defaults={"name": "Main Branch"}
    )
    Employee.objects.filter(branch__isnull=True).update(branch=main_branch)


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("employees", "0003_branch_employee_branch"),
    ]

    operations = [
        migrations.RunPython(backfill_main_branch, noop),
    ]
