from django.db.models import Q
from django.utils import timezone
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response

from apps.common.permissions import IsStaffOrReadOnly

from .models import LeaveBalance, LeaveRequest, LeaveType
from .permissions import CanManageLeaveRequest
from .serializers import LeaveBalanceSerializer, LeaveRequestSerializer, LeaveTypeSerializer


class LeaveTypeViewSet(viewsets.ModelViewSet):
    queryset = LeaveType.objects.all()
    serializer_class = LeaveTypeSerializer
    permission_classes = [permissions.IsAuthenticated, IsStaffOrReadOnly]


class LeaveBalanceViewSet(viewsets.ModelViewSet):
    serializer_class = LeaveBalanceSerializer
    permission_classes = [permissions.IsAuthenticated, IsStaffOrReadOnly]
    filterset_fields = ["employee", "leave_type", "year"]

    def get_queryset(self):
        queryset = LeaveBalance.objects.select_related("employee", "leave_type")
        if self.request.user.is_staff:
            return queryset
        employee = getattr(self.request.user, "employee", None)
        if employee is None:
            return queryset.none()
        return queryset.filter(employee=employee)


class LeaveRequestViewSet(viewsets.ModelViewSet):
    serializer_class = LeaveRequestSerializer
    permission_classes = [permissions.IsAuthenticated, CanManageLeaveRequest]
    filterset_fields = ["status", "leave_type", "employee"]

    def get_permissions(self):
        if self.action in {"approve", "reject", "cancel"}:
            return [permissions.IsAuthenticated()]
        return super().get_permissions()

    def get_queryset(self):
        queryset = LeaveRequest.objects.select_related("employee", "leave_type", "reviewed_by")
        user = self.request.user
        if user.is_staff:
            return queryset
        employee = getattr(user, "employee", None)
        if employee is None:
            return queryset.none()
        return queryset.filter(Q(employee=employee) | Q(employee__manager=employee))

    def perform_create(self, serializer):
        serializer.save(employee=self.request.user.employee)

    def _authorize_review(self, request, leave_request):
        if request.user.is_staff:
            return
        reviewer = getattr(request.user, "employee", None)
        if reviewer is None or leave_request.employee.manager_id != reviewer.id:
            raise PermissionDenied("Only the employee's manager or HR staff can do this.")

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        leave_request = self.get_object()
        self._authorize_review(request, leave_request)
        if leave_request.status != LeaveRequest.Status.PENDING:
            raise ValidationError("Only pending requests can be approved.")

        try:
            balance = LeaveBalance.objects.get(
                employee=leave_request.employee,
                leave_type=leave_request.leave_type,
                year=leave_request.start_date.year,
            )
        except LeaveBalance.DoesNotExist as exc:
            raise ValidationError(
                "No leave balance found for this employee/leave type/year."
            ) from exc

        if balance.remaining_days < leave_request.days_requested:
            raise ValidationError("Insufficient leave balance.")

        balance.used_days += leave_request.days_requested
        balance.save(update_fields=["used_days"])

        leave_request.status = LeaveRequest.Status.APPROVED
        leave_request.reviewed_by = getattr(request.user, "employee", None)
        leave_request.reviewed_at = timezone.now()
        leave_request.save(update_fields=["status", "reviewed_by", "reviewed_at"])

        return Response(self.get_serializer(leave_request).data)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        leave_request = self.get_object()
        self._authorize_review(request, leave_request)
        if leave_request.status != LeaveRequest.Status.PENDING:
            raise ValidationError("Only pending requests can be rejected.")

        leave_request.status = LeaveRequest.Status.REJECTED
        leave_request.reviewed_by = getattr(request.user, "employee", None)
        leave_request.reviewed_at = timezone.now()
        leave_request.save(update_fields=["status", "reviewed_by", "reviewed_at"])

        return Response(self.get_serializer(leave_request).data)

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        leave_request = self.get_object()
        employee = getattr(request.user, "employee", None)
        is_owner = employee is not None and leave_request.employee_id == employee.id
        if not request.user.is_staff and not is_owner:
            raise PermissionDenied("You can only cancel your own requests.")
        if leave_request.status != LeaveRequest.Status.PENDING:
            raise ValidationError("Only pending requests can be cancelled.")

        leave_request.status = LeaveRequest.Status.CANCELLED
        leave_request.save(update_fields=["status"])

        return Response(self.get_serializer(leave_request).data)
