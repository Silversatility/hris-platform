from django.utils import timezone
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response

from apps.notifications.models import notify
from apps.users.models import User

from .models import COERequest
from .permissions import CanManageCOERequest
from .serializers import COERequestSerializer, _display_name


class COERequestViewSet(viewsets.ModelViewSet):
    serializer_class = COERequestSerializer
    permission_classes = [permissions.IsAuthenticated, CanManageCOERequest]
    filterset_fields = ["status", "employee"]

    def get_permissions(self):
        if self.action in {"approve", "reject", "cancel"}:
            return [permissions.IsAuthenticated()]
        return super().get_permissions()

    def get_queryset(self):
        queryset = COERequest.objects.select_related(
            "employee",
            "employee__user",
            "employee__department",
            "employee__branch",
            "reviewed_by",
            "reviewed_by__user",
        )
        user = self.request.user
        if user.is_staff:
            return queryset
        employee = getattr(user, "employee", None)
        if employee is None:
            return queryset.none()
        return queryset.filter(employee=employee)

    def perform_create(self, serializer):
        coe_request = serializer.save(employee=self.request.user.employee)
        for staff_user in User.objects.filter(is_staff=True):
            notify(
                staff_user,
                f"{_display_name(coe_request.employee)} requested a Certificate of Employment.",
                link="/coe-requests",
            )

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        coe_request = self.get_object()
        if not request.user.is_staff:
            raise PermissionDenied("Only HR staff can approve certificate requests.")
        if coe_request.status != COERequest.Status.PENDING:
            raise ValidationError("Only pending requests can be approved.")

        coe_request.status = COERequest.Status.APPROVED
        coe_request.reviewed_by = getattr(request.user, "employee", None)
        coe_request.reviewed_at = timezone.now()
        coe_request.save(update_fields=["status", "reviewed_by", "reviewed_at"])

        notify(
            coe_request.employee.user,
            "Your Certificate of Employment request was approved and is ready to print.",
            link="/coe-requests",
        )

        return Response(self.get_serializer(coe_request).data)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        coe_request = self.get_object()
        if not request.user.is_staff:
            raise PermissionDenied("Only HR staff can reject certificate requests.")
        if coe_request.status != COERequest.Status.PENDING:
            raise ValidationError("Only pending requests can be rejected.")

        coe_request.status = COERequest.Status.REJECTED
        coe_request.reviewed_by = getattr(request.user, "employee", None)
        coe_request.reviewed_at = timezone.now()
        coe_request.save(update_fields=["status", "reviewed_by", "reviewed_at"])

        notify(
            coe_request.employee.user,
            "Your Certificate of Employment request was rejected.",
            link="/coe-requests",
        )

        return Response(self.get_serializer(coe_request).data)

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        coe_request = self.get_object()
        employee = getattr(request.user, "employee", None)
        is_owner = employee is not None and coe_request.employee_id == employee.id
        if not request.user.is_staff and not is_owner:
            raise PermissionDenied("You can only cancel your own requests.")
        if coe_request.status != COERequest.Status.PENDING:
            raise ValidationError("Only pending requests can be cancelled.")

        coe_request.status = COERequest.Status.CANCELLED
        coe_request.save(update_fields=["status"])

        return Response(self.get_serializer(coe_request).data)
