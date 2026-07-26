from rest_framework.permissions import SAFE_METHODS, BasePermission


class CanManageLeaveRequest(BasePermission):
    """
    Staff: full access to everything.
    Everyone else: create requests for themselves; read own requests and
    requests from their direct reports; no direct edit/delete (use the
    approve/reject/cancel actions, which enforce the actual business rules).
    """

    def has_permission(self, request, view):
        if request.user and request.user.is_staff:
            return True
        if view.action == "create":
            return hasattr(request.user, "employee")
        if view.action in {"update", "partial_update", "destroy"}:
            return False
        return True

    def has_object_permission(self, request, view, obj):
        if request.user.is_staff:
            return True
        employee = getattr(request.user, "employee", None)
        if employee is None:
            return False
        return request.method in SAFE_METHODS and (
            obj.employee_id == employee.id or obj.employee.manager_id == employee.id
        )
