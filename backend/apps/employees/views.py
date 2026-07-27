from rest_framework import permissions, viewsets

from .models import Department, Employee
from .permissions import IsHRAdminOrOwnReadOnly, IsStaffOrReadOnly
from .serializers import DepartmentSerializer, EmployeeSerializer, EmployeeWriteSerializer


class DepartmentViewSet(viewsets.ModelViewSet):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer
    permission_classes = [permissions.IsAuthenticated, IsStaffOrReadOnly]
    filterset_fields = ["is_active"]


class EmployeeViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated, IsHRAdminOrOwnReadOnly]
    filterset_fields = ["department", "status", "employment_type"]

    def get_serializer_class(self):
        if self.action in {"create", "update", "partial_update"}:
            return EmployeeWriteSerializer
        return EmployeeSerializer

    def get_queryset(self):
        queryset = Employee.objects.select_related(
            "user", "department", "manager", "manager__user"
        )
        if self.request.user.is_staff:
            return queryset
        return queryset.filter(user=self.request.user)
