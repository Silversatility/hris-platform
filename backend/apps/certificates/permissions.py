from rest_framework.permissions import SAFE_METHODS, BasePermission


class CanManageCOERequest(BasePermission):
    """
    Staff: full access to everything.
    Everyone else: create requests for themselves; read/cancel only their
    own requests. Approving or rejecting is HR's call (not a line manager's),
    so that's enforced separately in the approve/reject actions (staff only).
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
        if view.action == "cancel":
            return obj.employee_id == employee.id
        return request.method in SAFE_METHODS and obj.employee_id == employee.id
