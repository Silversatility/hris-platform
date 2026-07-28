from django.db.models import Count, ProtectedError
from rest_framework import permissions, viewsets
from rest_framework.exceptions import ValidationError

from .models import Branch, Department, Employee
from .permissions import IsHRAdminOrOwnReadOnly, IsStaffOrReadOnly
from .serializers import (
    BranchSerializer,
    DepartmentSerializer,
    EmployeeSerializer,
    EmployeeWriteSerializer,
)


class DepartmentViewSet(viewsets.ModelViewSet):
    queryset = Department.objects.annotate(employee_count=Count("employees"))
    serializer_class = DepartmentSerializer
    permission_classes = [permissions.IsAuthenticated, IsStaffOrReadOnly]
    filterset_fields = ["is_active"]

    def perform_destroy(self, instance):
        try:
            instance.delete()
        except ProtectedError as exc:
            raise ValidationError(
                "Cannot delete a department that still has employees assigned to it."
            ) from exc


class BranchViewSet(viewsets.ModelViewSet):
    queryset = Branch.objects.annotate(employee_count=Count("employees"))
    serializer_class = BranchSerializer
    permission_classes = [permissions.IsAuthenticated, IsStaffOrReadOnly]
    filterset_fields = ["is_active"]

    def perform_destroy(self, instance):
        try:
            instance.delete()
        except ProtectedError as exc:
            raise ValidationError(
                "Cannot delete a branch that still has employees or agents assigned to it."
            ) from exc


class EmployeeViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated, IsHRAdminOrOwnReadOnly]
    filterset_fields = ["department", "branch", "status", "employment_type"]

    def get_serializer_class(self):
        if self.action in {"create", "update", "partial_update"}:
            return EmployeeWriteSerializer
        return EmployeeSerializer

    def get_queryset(self):
        queryset = Employee.objects.select_related(
            "user", "department", "branch", "manager", "manager__user"
        )
        if self.request.user.is_staff:
            return queryset
        return queryset.filter(user=self.request.user)
