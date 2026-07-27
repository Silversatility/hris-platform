from django.db.models import Count
from django.utils import timezone
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from apps.employees.models import Employee

from . import xendit_client
from .models import (
    CommissionLineItem,
    CommissionPayout,
    PayRun,
    Payslip,
    PayslipLineItem,
    Sale,
    SalesAgent,
)
from .permissions import CanViewOwnPayslip
from .serializers import (
    CommissionLineItemSerializer,
    CommissionPayoutSerializer,
    MarkPaidSerializer,
    PayRunSerializer,
    PayslipLineItemSerializer,
    PayslipSerializer,
    SalesAgentSerializer,
    SaleSerializer,
)


def _mark_paid(request, instance):
    if instance.pay_run.status != PayRun.Status.COMPLETED:
        raise ValidationError("Can only mark this paid once the pay run is completed.")
    if instance.is_paid:
        raise ValidationError("Already marked as paid.")

    serializer = MarkPaidSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    instance.is_paid = True
    instance.paid_at = timezone.now()
    instance.payment_method = serializer.validated_data["payment_method"]
    instance.payment_reference = serializer.validated_data.get("payment_reference", "")
    instance.save(update_fields=["is_paid", "paid_at", "payment_method", "payment_reference"])


class SalesAgentViewSet(viewsets.ModelViewSet):
    queryset = SalesAgent.objects.all()
    serializer_class = SalesAgentSerializer
    permission_classes = [permissions.IsAuthenticated, permissions.IsAdminUser]
    filterset_fields = ["status"]


class SaleViewSet(viewsets.ModelViewSet):
    queryset = Sale.objects.select_related("agent")
    serializer_class = SaleSerializer
    permission_classes = [permissions.IsAuthenticated, permissions.IsAdminUser]
    filterset_fields = ["agent"]


class PayslipLineItemViewSet(viewsets.ModelViewSet):
    queryset = PayslipLineItem.objects.select_related("payslip__pay_run")
    serializer_class = PayslipLineItemSerializer
    permission_classes = [permissions.IsAuthenticated, permissions.IsAdminUser]
    filterset_fields = ["payslip"]

    def _ensure_draft(self, payslip):
        if payslip.pay_run.status != PayRun.Status.DRAFT:
            raise ValidationError("Cannot modify line items for a completed pay run.")

    def perform_create(self, serializer):
        self._ensure_draft(serializer.validated_data["payslip"])
        serializer.save()

    def perform_update(self, serializer):
        self._ensure_draft(serializer.instance.payslip)
        serializer.save()

    def perform_destroy(self, instance):
        self._ensure_draft(instance.payslip)
        instance.delete()


class PayslipViewSet(viewsets.ModelViewSet):
    serializer_class = PayslipSerializer
    permission_classes = [permissions.IsAuthenticated, CanViewOwnPayslip]
    filterset_fields = ["pay_run", "employee"]

    def get_queryset(self):
        queryset = Payslip.objects.select_related(
            "employee", "employee__user", "pay_run"
        ).prefetch_related("line_items")
        if self.request.user.is_staff:
            return queryset
        employee = getattr(self.request.user, "employee", None)
        if employee is None:
            return queryset.none()
        return queryset.filter(employee=employee)

    @action(detail=True, methods=["post"], url_path="mark-paid")
    def mark_paid(self, request, pk=None):
        payslip = self.get_object()
        _mark_paid(request, payslip)
        return Response(self.get_serializer(payslip).data)


class CommissionLineItemViewSet(viewsets.ModelViewSet):
    queryset = CommissionLineItem.objects.select_related("payout__pay_run")
    serializer_class = CommissionLineItemSerializer
    permission_classes = [permissions.IsAuthenticated, permissions.IsAdminUser]
    filterset_fields = ["payout"]

    def _ensure_draft(self, payout):
        if payout.pay_run.status != PayRun.Status.DRAFT:
            raise ValidationError("Cannot modify line items for a completed pay run.")

    def perform_create(self, serializer):
        self._ensure_draft(serializer.validated_data["payout"])
        serializer.save()

    def perform_update(self, serializer):
        self._ensure_draft(serializer.instance.payout)
        serializer.save()

    def perform_destroy(self, instance):
        self._ensure_draft(instance.payout)
        instance.delete()


def _payment_method_for_bank_code(bank_code):
    code = bank_code.upper()
    if "GCASH" in code:
        return "gcash"
    if "MAYA" in code:
        return "maya"
    return "bank_transfer"


class CommissionPayoutViewSet(viewsets.ModelViewSet):
    queryset = CommissionPayout.objects.select_related("agent", "pay_run").prefetch_related(
        "line_items"
    )
    serializer_class = CommissionPayoutSerializer
    permission_classes = [permissions.IsAuthenticated, permissions.IsAdminUser]
    filterset_fields = ["pay_run", "agent"]

    @action(detail=True, methods=["post"], url_path="mark-paid")
    def mark_paid(self, request, pk=None):
        payout = self.get_object()
        _mark_paid(request, payout)
        return Response(self.get_serializer(payout).data)

    @action(detail=True, methods=["post"], url_path="pay-via-xendit")
    def pay_via_xendit(self, request, pk=None):
        payout = self.get_object()
        if payout.pay_run.status != PayRun.Status.COMPLETED:
            raise ValidationError("Can only pay out once the pay run is completed.")
        if payout.is_paid:
            raise ValidationError("Already marked as paid.")

        agent = payout.agent
        if not agent.bank_code or not agent.bank_account_number:
            raise ValidationError(
                "This agent has no bank/e-wallet details on file. Add them before paying out."
            )

        try:
            result = xendit_client.create_disbursement(
                reference_id=f"commission-payout-{payout.id}",
                channel_code=agent.bank_code,
                account_name=agent.bank_account_holder_name or agent.full_name,
                account_number=agent.bank_account_number,
                amount=int(payout.total_commission),
                description=f"Commission payout for {agent.agent_id}",
            )
        except xendit_client.XenditError as exc:
            raise ValidationError(f"Xendit disbursement failed: {exc}") from exc

        payout.is_paid = True
        payout.paid_at = timezone.now()
        payout.payment_method = _payment_method_for_bank_code(agent.bank_code)
        payout.payment_reference = result.get("id") or result.get("reference_id", "")
        payout.save(update_fields=["is_paid", "paid_at", "payment_method", "payment_reference"])

        return Response(self.get_serializer(payout).data)


class PayRunViewSet(viewsets.ModelViewSet):
    queryset = PayRun.objects.annotate(
        payslip_count=Count("payslips", distinct=True),
        commission_payout_count=Count("commission_payouts", distinct=True),
    )
    serializer_class = PayRunSerializer
    permission_classes = [permissions.IsAuthenticated, permissions.IsAdminUser]
    filterset_fields = ["status"]

    @action(detail=True, methods=["post"])
    def generate(self, request, pk=None):
        pay_run = self.get_object()
        if pay_run.status != PayRun.Status.DRAFT:
            raise ValidationError("Can only generate for a draft pay run.")

        payslips_created = 0
        for employee in Employee.objects.filter(status=Employee.Status.ACTIVE):
            if employee.salary is None:
                continue
            payslip, created = Payslip.objects.get_or_create(
                pay_run=pay_run,
                employee=employee,
                defaults={"base_salary": employee.salary},
            )
            if created:
                payslips_created += 1

        payouts_touched = 0
        for agent in SalesAgent.objects.filter(status=SalesAgent.Status.ACTIVE):
            sales = Sale.objects.filter(
                agent=agent,
                sale_date__gte=pay_run.start_date,
                sale_date__lte=pay_run.end_date,
            ).exclude(commission_lines__payout__pay_run=pay_run)
            if not sales.exists():
                continue
            payout, _ = CommissionPayout.objects.get_or_create(pay_run=pay_run, agent=agent)
            for sale in sales:
                CommissionLineItem.objects.get_or_create(
                    payout=payout,
                    sale=sale,
                    defaults={
                        "label": f"Commission - {sale.vehicle_description}",
                        "amount": sale.commission_amount,
                    },
                )
            payouts_touched += 1

        return Response(
            {
                "payslips_created": payslips_created,
                "commission_payouts_touched": payouts_touched,
            }
        )

    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        pay_run = self.get_object()
        if pay_run.status != PayRun.Status.DRAFT:
            raise ValidationError("Pay run is already completed.")
        pay_run.status = PayRun.Status.COMPLETED
        pay_run.save(update_fields=["status"])
        return Response(self.get_serializer(pay_run).data)
