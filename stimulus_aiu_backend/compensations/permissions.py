from rest_framework import permissions

class IsOwnerOrAdmin(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        user = request.user
        if not user or not user.is_authenticated:
            return False

        if user.is_staff:
            return True
        if hasattr(obj, "owner_id"):
            return obj.owner_id == user.id
        if hasattr(obj, "application") and hasattr(obj.application, "owner_id"):
            return obj.application.owner_id == user.id

        return False