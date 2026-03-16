from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsCompanyActive(BasePermission):
    """
    Разрешаем только если company.is_active = True.
    Ожидаем, что у request.user есть .company.
    """

    message = "Your company account is suspended. Please contact support."

    def has_permission(self, request, view):
        user = request.user
        company = getattr(user, "company", None)
        if company is None:
            return True  # на всякий случай, не ломаем анонимные эндпоинты
        return getattr(company, "is_active", True)


class IsManagerUser(BasePermission):
    """
    Разрешаем доступ консольным пользователям (owner, manager, staff).
    Используется для manager / analytics / reports эндпоинтов.

    Role hierarchy:
    - owner: Billing Admin, full access
    - manager: Ops Admin, full access to operations
    - staff: Limited console access
    - cleaner: Mobile app only (excluded)
    """

    message = "Only console users (owner, manager, staff) can access this resource."

    # Console roles that have access to manager endpoints
    CONSOLE_ROLES = {"owner", "manager", "staff"}

    def has_permission(self, request, view):
        user = request.user

        if not user or not user.is_authenticated:
            return False

        # Check if user has a console role
        role = getattr(user, "role", None)
        if role and role in self.CONSOLE_ROLES:
            return True

        return False


class ActivePlanPermission(BasePermission):
    """
    Blocks write operations (POST/PUT/PATCH/DELETE) for companies whose plan
    is expired or blocked. Safe methods (GET/HEAD/OPTIONS) are always allowed —
    read-only access is preserved per product spec.

    Response format on denial:
      {"code": "trial_expired"|"company_blocked", "detail": "..."}

    Usage:
      permission_classes = [IsAuthenticated, ActivePlanPermission]

    Note: Does NOT replace existing inline is_blocked() checks in locked views.
    Added additively to maintenance write views as defense-in-depth.
    """

    def has_permission(self, request, view):
        # Safe methods always allowed — read-only is preserved
        if request.method in SAFE_METHODS:
            return True

        user = request.user
        if not user or not user.is_authenticated:
            return True  # Authentication permission handles this case

        company = getattr(user, "company", None)
        if company is None:
            return True  # No company context — don't block

        if not company.is_blocked():
            return True

        # Build denial message with code for frontend to parse
        if company.is_trial_expired():
            self.message = {
                "code": "trial_expired",
                "detail": (
                    "Your free trial has ended. You can still view existing records, "
                    "but creating or editing requires an active subscription."
                ),
            }
        else:
            self.message = {
                "code": "company_blocked",
                "detail": (
                    "Your account is currently suspended. "
                    "Please upgrade your subscription to restore full access."
                ),
            }

        return False
