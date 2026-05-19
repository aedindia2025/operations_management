from rest_framework import permissions
from django.utils import timezone


COMPANY_FIELD = "sess_company_id"


def first_non_empty(*values):
    for value in values:
        if value is None:
            continue
        value = str(value).strip()
        if value:
            return value
    return ""


def actor_company_id(actor):
    return first_non_empty(
        getattr(actor, "sess_company_id", ""),
        getattr(actor, "company_id", ""),
    )


def actor_branch_id(actor):
    return first_non_empty(getattr(actor, "sess_branch_id", ""))


def request_company_id(request):
    user = getattr(request, "user", None)
    company_id = actor_company_id(user)
    if company_id:
        return company_id

    session = getattr(request, "session", None)
    if session is not None:
        try:
            company_id = first_non_empty(session.get("sess_company_id"), session.get("company_id"))
        except Exception:
            company_id = ""
        if company_id:
            return company_id

    return first_non_empty(request.headers.get("X-Company-Id"))


def tenant_filter_kwargs(request, field_name=COMPANY_FIELD):
    company_id = request_company_id(request)
    if not company_id:
        return {}
    return {field_name: company_id}


def tenant_queryset(request, queryset, field_name=COMPANY_FIELD, include_global=True):
    company_id = request_company_id(request)
    if not company_id:
        return queryset.none()

    if include_global:
        return queryset.filter(**{f"{field_name}__in": ["", company_id]})
    return queryset.filter(**{field_name: company_id})


def tenant_audit_payload(request):
    user = getattr(request, "user", None)
    session = getattr(request, "session", None)
    session_id = ""
    if session is not None:
        try:
            session_id = session.session_key or ""
        except Exception:
            session_id = ""

    return {
        "sess_user_type": first_non_empty(getattr(user, "user_type_unique_id", ""), request.headers.get("X-User-Type"))[:50],
        "sess_user_id": first_non_empty(getattr(user, "unique_id", ""), request.headers.get("X-User-Id"))[:50],
        "sess_company_id": first_non_empty(request_company_id(request))[:50],
        "sess_branch_id": first_non_empty(actor_branch_id(user), request.headers.get("X-Branch-Id"))[:50],
        "session_id": first_non_empty(session_id, request.headers.get("X-Session-Id"))[:50],
    }


def model_field_names(instance_or_model):
    meta = getattr(instance_or_model, "_meta", None)
    if meta is None:
        meta = getattr(instance_or_model.__class__, "_meta", None)
    if meta is None:
        return set()
    return {field.name for field in meta.fields}


def tenant_save_kwargs(request, model_or_instance=None, include_session=True):
    payload = tenant_audit_payload(request)
    if not include_session:
        payload = {
            "sess_company_id": payload["sess_company_id"],
            "sess_branch_id": payload["sess_branch_id"],
        }

    if model_or_instance is None:
        return {key: value for key, value in payload.items() if value}

    fields = model_field_names(model_or_instance)
    return {key: value for key, value in payload.items() if key in fields and value}


def apply_tenant_audit(instance, request, include_session=True, mark_updated=True):
    for key, value in tenant_save_kwargs(request, instance, include_session=include_session).items():
        setattr(instance, key, value)

    fields = model_field_names(instance)
    now = timezone.now()
    for field_name in ("updated", "updated_at"):
        if mark_updated and field_name in fields:
            try:
                setattr(instance, field_name, now)
            except Exception:
                pass
    return instance


class HasTenantContext(permissions.BasePermission):
    message = "Tenant/company context is required."

    def has_permission(self, request, view):
        return bool(request_company_id(request))
