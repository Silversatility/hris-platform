from rest_framework.permissions import SAFE_METHODS, BasePermission

from apps.common.permissions import IsStaffOrReadOnly

__all__ = ["IsStaffOrReadOnly", "IsHRAdminOrOwnReadOnly"]


class IsHRAdminOrOwnReadOnly(BasePermission):
    """HR staff have full access. Everyone else can only read their own record."""

    def has_permission(self, request, view):
        if request.user and request.user.is_staff:
            return True
        return request.method in SAFE_METHODS

    def has_object_permission(self, request, view, obj):
        if request.user.is_staff:
            return True
        return request.method in SAFE_METHODS and obj.user_id == request.user.id
