from django.utils import timezone
from rest_framework import serializers

from .models import (
    CommissionLineItem,
    CommissionPayout,
    PaymentMethod,
    PayRun,
    Payslip,
    PayslipLineItem,
    Sale,
    SalesAgent,
)


def generate_agent_id():
    year = timezone.now().year
    prefix = f"AGT-{year}-"
    last = SalesAgent.objects.filter(agent_id__startswith=prefix).order_by("-agent_id").first()
    next_number = int(last.agent_id.rsplit("-", 1)[-1]) + 1 if last else 1
    return f"{prefix}{next_number:03d}"


class SalesAgentSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(read_only=True)
    agent_id = serializers.CharField(required=False)
    branch_name = serializers.CharField(source="branch.name", read_only=True)

    class Meta:
        model = SalesAgent
        fields = [
            "id",
            "agent_id",
            "branch",
            "branch_name",
            "first_name",
            "last_name",
            "full_name",
            "email",
            "phone_number",
            "default_commission_rate",
            "status",
            "date_joined",
            "bank_name",
            "bank_bic",
            "bank_account_number",
            "bank_account_holder_name",
        ]

    def create(self, validated_data):
        if not validated_data.get("agent_id"):
            validated_data["agent_id"] = generate_agent_id()
        return super().create(validated_data)


class SaleSerializer(serializers.ModelSerializer):
    agent_display_name = serializers.CharField(source="agent.full_name", read_only=True)
    commission_rate = serializers.DecimalField(
        max_digits=5, decimal_places=2, required=False
    )

    class Meta:
        model = Sale
        fields = [
            "id",
            "agent",
            "agent_display_name",
            "sale_date",
            "customer_name",
            "vehicle_description",
            "sale_amount",
            "commission_rate",
            "commission_amount",
            "notes",
            "created_at",
        ]
        read_only_fields = ["commission_amount", "created_at"]

    def create(self, validated_data):
        if "commission_rate" not in validated_data:
            validated_data["commission_rate"] = validated_data["agent"].default_commission_rate
        return super().create(validated_data)


class PayslipLineItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = PayslipLineItem
        fields = ["id", "payslip", "item_type", "label", "amount"]


class PayslipSerializer(serializers.ModelSerializer):
    employee_display_name = serializers.SerializerMethodField()
    employee_code = serializers.CharField(source="employee.employee_id", read_only=True)
    employee_job_title = serializers.CharField(source="employee.job_title", read_only=True)
    employee_department = serializers.CharField(
        source="employee.department.name", read_only=True
    )
    pay_period_start = serializers.DateField(source="pay_run.start_date", read_only=True)
    pay_period_end = serializers.DateField(source="pay_run.end_date", read_only=True)
    pay_date = serializers.DateField(source="pay_run.pay_date", read_only=True)
    line_items = PayslipLineItemSerializer(many=True, read_only=True)
    gross_pay = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    total_deductions = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    net_pay = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = Payslip
        fields = [
            "id",
            "pay_run",
            "employee",
            "employee_display_name",
            "employee_code",
            "employee_job_title",
            "employee_department",
            "pay_period_start",
            "pay_period_end",
            "pay_date",
            "base_salary",
            "gross_pay",
            "total_deductions",
            "net_pay",
            "line_items",
            "is_paid",
            "paid_at",
            "payment_method",
            "payment_reference",
            "generated_at",
        ]
        read_only_fields = [
            "pay_run",
            "employee",
            "base_salary",
            "is_paid",
            "paid_at",
            "payment_method",
            "payment_reference",
            "generated_at",
        ]

    def get_employee_display_name(self, obj):
        full_name = f"{obj.employee.user.first_name} {obj.employee.user.last_name}".strip()
        return full_name or obj.employee.user.email


class CommissionLineItemSerializer(serializers.ModelSerializer):
    is_automatic = serializers.SerializerMethodField()

    class Meta:
        model = CommissionLineItem
        fields = ["id", "payout", "sale", "label", "amount", "is_automatic"]

    def get_is_automatic(self, obj):
        return obj.sale_id is not None


class CommissionPayoutSerializer(serializers.ModelSerializer):
    agent_display_name = serializers.CharField(source="agent.full_name", read_only=True)
    line_items = CommissionLineItemSerializer(many=True, read_only=True)
    total_commission = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = CommissionPayout
        fields = [
            "id",
            "pay_run",
            "agent",
            "agent_display_name",
            "line_items",
            "total_commission",
            "is_paid",
            "paid_at",
            "payment_method",
            "payment_reference",
            "generated_at",
        ]
        read_only_fields = [
            "pay_run",
            "agent",
            "is_paid",
            "paid_at",
            "payment_method",
            "payment_reference",
            "generated_at",
        ]


class MarkPaidSerializer(serializers.Serializer):
    payment_method = serializers.ChoiceField(choices=PaymentMethod.choices)
    payment_reference = serializers.CharField(required=False, allow_blank=True)


class PayRunSerializer(serializers.ModelSerializer):
    payslip_count = serializers.IntegerField(read_only=True, default=0)
    commission_payout_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = PayRun
        fields = [
            "id",
            "start_date",
            "end_date",
            "pay_date",
            "status",
            "payslip_count",
            "commission_payout_count",
            "created_at",
        ]
        read_only_fields = ["status", "created_at"]
