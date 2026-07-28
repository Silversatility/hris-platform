from django.db import migrations


def backfill_main_branch(apps, schema_editor):
    Branch = apps.get_model("employees", "Branch")
    SalesAgent = apps.get_model("payroll", "SalesAgent")

    if not SalesAgent.objects.filter(branch__isnull=True).exists():
        return

    main_branch, _ = Branch.objects.get_or_create(
        code="MAIN", defaults={"name": "Main Branch"}
    )
    SalesAgent.objects.filter(branch__isnull=True).update(branch=main_branch)


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("payroll", "0005_salesagent_branch_alter_salesagent_bank_bic"),
        ("employees", "0004_backfill_main_branch"),
    ]

    operations = [
        migrations.RunPython(backfill_main_branch, noop),
    ]
