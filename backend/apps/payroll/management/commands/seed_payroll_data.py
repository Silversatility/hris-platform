from datetime import date, timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.payroll.models import PayRun, Sale, SalesAgent

AGENTS = [
    {
        "agent_id": "AGT-2026-001",
        "first_name": "Carlo",
        "last_name": "Mendoza",
        "email": "carlo.mendoza@example.com",
        "phone_number": "+639201234567",
        "default_commission_rate": Decimal("5.00"),
        "date_joined": date(2023, 3, 1),
    },
    {
        "agent_id": "AGT-2026-002",
        "first_name": "Bianca",
        "last_name": "Santos",
        "email": "bianca.santos@example.com",
        "phone_number": "+639211234567",
        "default_commission_rate": Decimal("4.50"),
        "date_joined": date(2024, 6, 15),
    },
    {
        "agent_id": "AGT-2026-003",
        "first_name": "Ramon",
        "last_name": "Dela Cruz",
        "email": "ramon.delacruz@example.com",
        "phone_number": "+639221234567",
        "default_commission_rate": Decimal("5.00"),
        "date_joined": date(2022, 11, 1),
    },
]

# (agent index, days ago, vehicle, sale amount, commission rate override or None)
SALES = [
    (0, 3, "2024 Toyota Vios 1.3 XE", Decimal("850000.00"), None),
    (0, 10, "2023 Toyota Fortuner 2.4 G", Decimal("1850000.00"), None),
    (1, 5, "2024 Mitsubishi Xpander GLS", Decimal("1150000.00"), None),
    (1, 12, "2024 Honda City 1.5 V", Decimal("980000.00"), Decimal("5.50")),
    (2, 2, "2023 Ford Ranger XLT 4x2", Decimal("1550000.00"), None),
    (2, 8, "2024 Nissan Navara VL", Decimal("1700000.00"), None),
]


class Command(BaseCommand):
    help = "Seeds sample sales agents, sales, and a draft pay run for local development."

    @transaction.atomic
    def handle(self, *args, **options):
        agents = []
        for data in AGENTS:
            agent, created = SalesAgent.objects.get_or_create(
                agent_id=data["agent_id"], defaults=data
            )
            agents.append(agent)
            self.stdout.write(f"{'Created' if created else 'Exists'} agent: {agent}")

        today = date.today()
        for agent_index, days_ago, vehicle, amount, rate_override in SALES:
            agent = agents[agent_index]
            sale_date = today - timedelta(days=days_ago)
            if Sale.objects.filter(
                agent=agent, vehicle_description=vehicle, sale_date=sale_date
            ).exists():
                self.stdout.write(f"Exists sale: {agent.agent_id} - {vehicle}")
                continue
            sale = Sale.objects.create(
                agent=agent,
                sale_date=sale_date,
                vehicle_description=vehicle,
                sale_amount=amount,
                commission_rate=rate_override or agent.default_commission_rate,
            )
            self.stdout.write(
                f"Created sale: {agent.agent_id} - {vehicle} ({sale.commission_amount})"
            )

        period_start = today.replace(day=1)
        next_month = (period_start + timedelta(days=32)).replace(day=1)
        period_end = next_month - timedelta(days=1)
        pay_run, created = PayRun.objects.get_or_create(
            start_date=period_start,
            end_date=period_end,
            defaults={"pay_date": next_month},
        )
        self.stdout.write(f"{'Created' if created else 'Exists'} pay run: {pay_run}")

        self.stdout.write(self.style.SUCCESS("Done."))
