from rest_framework.permissions import SAFE_METHODS, BasePermission


class CanManageTicket(BasePermission):
    """
    Staff: full access to everything.
    Everyone else: create tickets for themselves; read tickets they filed
    or are assigned to; no direct edit/delete (use the assign/resolve/
    close/reopen actions, which enforce the actual workflow rules).
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
            obj.requester_id == employee.id or obj.assigned_to_id == employee.id
        )
