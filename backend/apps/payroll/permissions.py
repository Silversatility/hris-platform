from rest_framework.permissions import SAFE_METHODS, BasePermission


class CanViewOwnPayslip(BasePermission):
    """Staff: full access. Everyone else: read-only, and only their own payslip."""

    def has_permission(self, request, view):
        if request.user and request.user.is_staff:
            return True
        return request.method in SAFE_METHODS

    def has_object_permission(self, request, view, obj):
        if request.user.is_staff:
            return True
        employee = getattr(request.user, "employee", None)
        return (
            request.method in SAFE_METHODS
            and employee is not None
            and obj.employee_id == employee.id
        )
