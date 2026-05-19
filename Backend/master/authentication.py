from rest_framework import authentication, exceptions

from master.apps.user.usermodel import UserCreation
from master.apps.vendor_creation.vendormodel import VendorCreation
from master.tenant import actor_company_id
from master.tenant_db import split_tenant_token


class UniqueIdBearerAuthentication(authentication.BaseAuthentication):
    """
    Accepts the existing frontend token format:
    Authorization: Bearer <user.unique_id|vendor.unique_id>
    """

    keyword = "Bearer"

    def authenticate(self, request):
        header = authentication.get_authorization_header(request).decode("utf-8")
        if not header:
            return None

        parts = header.split()
        if len(parts) != 2 or parts[0] != self.keyword:
            return None

        _company_code, token = split_tenant_token(parts[1].strip())
        if not token:
            return None

        user = (
            UserCreation.objects
            .filter(unique_id=token, is_delete=0, is_active=1)
            .order_by("-s_no")
            .first()
        )
        if user:
            request.company_id = actor_company_id(user)
            return (user, token)

        vendor = (
            VendorCreation.objects
            .filter(unique_id=token, is_delete=0, is_active=1)
            .order_by("-updated_at", "-created_at")
            .first()
        )
        if vendor:
            request.company_id = actor_company_id(vendor)
            return (vendor, token)

        raise exceptions.AuthenticationFailed("Invalid token.")
