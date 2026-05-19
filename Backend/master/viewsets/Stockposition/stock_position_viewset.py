from datetime import date

from django.db import transaction
from django.db.models import Max, Q, Sum
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from master.apps.Stockposition.stockpositionmodel import (
    StockPositionMain,
    StockPosition,
    StockPositionSublist,
)
from master.apps.department.departmentmodel import DepartmentCreation
from master.apps.district.districtmodel import DistrictCreation
from master.apps.executive_creation.executivecreation_model import ExecutiveName
from master.apps.purchase_order.purchaseordermodel import (
    PurchaseOrder,
    PurchaseOrderAssign,
    PurchaseOrderConsignee,
    PurchaseOrderProduct,
)
from master.apps.state.statemodel import StateCreation
from master.apps.user.usermodel import UserCreation
from master.serializers.Stockposition.stock_position_serializer import (
    StockPositionMainSerializer,
    StockPositionSerializer,
    StockPositionSublistSerializer,
)
from master.tenant import request_company_id, tenant_audit_payload, tenant_queryset


def datatable_response(draw, total, filtered, data):
    return {
        "draw": int(draw),
        "recordsTotal": int(total),
        "recordsFiltered": int(filtered),
        "data": data,
    }


def safe_int(value, default=0):
    try:
        if value in (None, ""):
            return default
        return int(float(str(value).replace(",", "").strip()))
    except (TypeError, ValueError):
        return default


def generate_stock_id():
    now = date.today()
    yymm = now.strftime("%y%m")
    prefix = f"STK-{yymm}-"
    year = now.year

    last = (
        StockPositionMain.objects.filter(stock_id__startswith="STK-")
        .order_by("-id")
        .values_list("stock_id", flat=True)
        .first()
    )

    if last:
        parts = last.split("-")
        if len(parts) == 3:
            yy = int("20" + parts[1][:2])
            if yy == year:
                seq = int(parts[2]) + 1
                return f"{prefix}{str(seq).zfill(4)}"

    return f"{prefix}0001"


def convert_date(date_str):
    if not date_str:
        return None
    try:
        parts = str(date_str).split("-")
        if len(parts) == 3 and len(parts[0]) == 2:
            return f"{parts[2]}-{parts[1]}-{parts[0]}"
        return date_str
    except Exception:
        return None


def _department_name(unique_id):
    try:
        if not unique_id:
            return ""
        obj = (
            DepartmentCreation.objects.filter(unique_id=unique_id, is_delete=0)
            .order_by("-id")
            .first()
        )
        if obj:
            return obj.department
        # Some old rows appear to store the department reference in the
        # legacy `empty` column instead of `unique_id`.
        obj = (
            DepartmentCreation.objects.filter(empty=unique_id, is_delete=0)
            .order_by("-id")
            .first()
        )
        if obj:
            return obj.department
    except Exception:
        pass
    return unique_id or ""


def _executive_name(unique_id):
    try:
        obj = ExecutiveName.objects.get(unique_id=unique_id, is_delete=0)
        return obj.executive_name
    except Exception:
        pass
    try:
        obj = UserCreation.objects.get(unique_id=unique_id, is_delete=0)
        return obj.staff_name
    except Exception:
        return unique_id or ""


def _district_name(unique_id):
    try:
        obj = DistrictCreation.objects.get(unique_id=unique_id, is_delete=0)
        return obj.district_name
    except Exception:
        return unique_id or ""


def _state_name(unique_id):
    try:
        obj = StateCreation.objects.get(unique_id=unique_id, is_delete=0)
        return obj.state_name
    except Exception:
        return unique_id or ""


def _file_names(value):
    return [part.strip() for part in str(value or "").split(",") if part.strip()]


def _attachment_urls(request, file_name_value):
    urls = []
    for file_name in _file_names(file_name_value):
        urls.append(f"/api/master/purchase-order/files/po_copy/{file_name}/")
    return urls


def _request_user_context(request):
    user_type = str(request.data.get("user_type_unique_id", "") or request.query_params.get("user_type_unique_id", "") or "").strip()
    user_unique_id = str(
        request.data.get("user_unique_id", "")
        or request.query_params.get("user_unique_id", "")
        or getattr(request.user, "unique_id", "")
        or getattr(request.user, "pk", "")
        or ""
    ).strip()
    return user_type, user_unique_id


def _tenant_stock_queryset(request, queryset):
    company_id = request_company_id(request)
    if not company_id:
        return queryset

    tenant_po_ids = tenant_queryset(
        request,
        PurchaseOrder.objects.filter(is_delete=0),
        include_global=False,
    ).values("unique_id")
    return queryset.filter(
        Q(sess_company_id=company_id)
        | (Q(sess_company_id="") | Q(sess_company_id__isnull=True))
        & Q(form_main_unique_id__in=tenant_po_ids)
    )


def _reset_orphan_po_statuses(request):
    stock_po_ids = _tenant_stock_queryset(request, StockPositionMain.objects.filter(is_delete=0)).values("form_main_unique_id")
    tenant_queryset(request, PurchaseOrder.objects.filter(is_delete=0), include_global=False).exclude(unique_id__in=stock_po_ids).exclude(status=0).update(status=0)


def _ready_purchase_order_queryset(request):
    product_ids = PurchaseOrderProduct.objects.filter(is_delete=0).values("form_main_unique_id")
    consignee_ids = PurchaseOrderConsignee.objects.filter(is_delete=0).values("form_main_unique_id")
    assign_ids = PurchaseOrderAssign.objects.filter(is_delete=0).values("form_main_unique_id")
    return (
        tenant_queryset(request, PurchaseOrder.objects.filter(is_delete=0), include_global=False).exclude(status=2)
        .exclude(file_name__isnull=True)
        .exclude(file_name__exact="")
        .filter(unique_id__in=product_ids)
        .filter(unique_id__in=consignee_ids)
        .filter(unique_id__in=assign_ids)
    )


def _filter_po_by_user(qs, user_type, user_unique_id):
    if user_type == "69b0115ced3bd96390" and user_unique_id:
        return qs.filter(executive_name=user_unique_id)
    return qs


def _filter_main_by_user(qs, user_type, user_unique_id):
    if user_type == "69b0115ced3bd96390" and user_unique_id:
        po_ids = PurchaseOrder.objects.filter(
            is_delete=0,
            executive_name=user_unique_id,
        ).values("unique_id")
        return qs.filter(form_main_unique_id__in=po_ids)
    return qs


def _search_po_queryset(qs, search):
    if not search:
        return qs
    return qs.filter(
        Q(po_num__icontains=search)
        | Q(po_unique_id__icontains=search)
        | Q(department__icontains=search)
        | Q(executive_name__icontains=search)
        | Q(gst_value__icontains=search)
        | Q(state_name__icontains=search)
        | Q(district__icontains=search)
        | Q(bill_address__icontains=search)
    )


def _search_main_queryset(qs, search):
    if not search:
        return qs
    po_ids = PurchaseOrder.objects.filter(
        is_delete=0,
    ).filter(
        Q(po_num__icontains=search)
        | Q(po_unique_id__icontains=search)
        | Q(department__icontains=search)
        | Q(executive_name__icontains=search)
        | Q(state_name__icontains=search)
        | Q(district__icontains=search)
        | Q(bill_address__icontains=search)
    ).values("unique_id")
    return qs.filter(
        Q(stock_id__icontains=search)
        | Q(po_num__icontains=search)
        | Q(department__icontains=search)
        | Q(executive_name__icontains=search)
        | Q(form_main_unique_id__in=po_ids)
    )


def _delivery_due_days(po):
    direct = safe_int(getattr(po, "delivery_due_dates", ""), 0)
    if direct > 0:
        return direct
    product_days = (
        PurchaseOrderProduct.objects.filter(form_main_unique_id=po.unique_id, is_delete=0)
        .values_list("delivery_due_dates", flat=True)
    )
    for value in product_days:
        days = safe_int(value, 0)
        if days > 0:
            return days
    return 0


def _po_metrics(request, po):
    product_qs = PurchaseOrderProduct.objects.filter(
        form_main_unique_id=po.unique_id,
        is_delete=0,
    )
    consignee_qs = PurchaseOrderConsignee.objects.filter(
        form_main_unique_id=po.unique_id,
        is_delete=0,
    )
    stock_total = (
        _tenant_stock_queryset(request, StockPositionMain.objects.filter(form_main_unique_id=po.unique_id, is_delete=0))
        .aggregate(total=Sum("stock_qty"))
        .get("total")
        or 0
    )
    stock_count = _tenant_stock_queryset(request, StockPositionMain.objects.filter(form_main_unique_id=po.unique_id, is_delete=0)).count()
    order_qty = safe_int(po.total_qty, 0)
    return {
        "items": safe_int(po.no_of_po, product_qs.count()),
        "consignee": safe_int(po.no_of_consignee, consignee_qs.count()),
        "order_qty": order_qty,
        "stock_qty": safe_int(stock_total, 0),
        "stock_count": stock_count,
        "balance_qty": max(order_qty - safe_int(stock_total, 0), 0),
    }


def _pending_row(po, idx, request):
    metrics = _po_metrics(request, po)
    attachment_urls = _attachment_urls(request, po.file_name)
    district_name = _district_name(po.district)
    state_name = _state_name(po.state_name)
    return {
        "s_no": idx,
        "unique_id": po.unique_id,
        "po_unique_id": po.po_unique_id,
        "po_num": po.po_num,
        "po_date": str(po.po_date) if po.po_date else "",
        "department": po.department,
        "department_display": _department_name(po.department),
        "executive_name": po.executive_name,
        "executive_display": _executive_name(po.executive_name),
        "district_name": district_name,
        "state_name": state_name,
        "customer_name": _department_name(po.department),
        "customer_location": ", ".join(part for part in [district_name, state_name] if part),
        "no_of_consignee": metrics["consignee"],
        "no_of_po": metrics["items"],
        "qty": str(metrics["order_qty"]),
        "order_qty": metrics["order_qty"],
        "stock_qty": metrics["stock_qty"],
        "stock_count": metrics["stock_count"],
        "balance_qty": metrics["balance_qty"],
        "net_value": str(po.total_amount or "0"),
        "file_name": po.file_name or "",
        "attachment_urls": attachment_urls,
        "delivery_due_dates": _delivery_due_days(po),
        "status": po.status,
        "status_display": "Complete" if safe_int(po.status) == 2 else "Processing" if safe_int(po.status) == 1 else "Pending",
    }


def _main_row(item, idx, request):
    po = tenant_queryset(request, PurchaseOrder.objects.filter(unique_id=item.form_main_unique_id, is_delete=0), include_global=False).first()
    department_display = (
        (_department_name(po.department) if po else "")
        or item.department
        or (po.department if po else "")
    )
    executive_display = (
        (_executive_name(po.executive_name) if po else "")
        or item.executive_name
        or (po.executive_name if po else "")
    )
    district_name = _district_name(po.district) if po else ""
    state_name = _state_name(po.state_name) if po else ""
    attachment_urls = _attachment_urls(request, po.file_name if po else "")
    totals = (
        _tenant_stock_queryset(request, StockPositionMain.objects.filter(form_main_unique_id=item.form_main_unique_id, is_delete=0))
        .aggregate(stock_qty_total=Sum("stock_qty"), stock_value_total=Sum("stock_value"), billed_qty_total=Sum("billed_qty"))
    )
    order_qty = safe_int(po.total_qty, item.stock_qty if po else item.stock_qty)
    stock_qty = safe_int(totals.get("stock_qty_total"), item.stock_qty)
    billed_qty = safe_int(totals.get("billed_qty_total"), 0)
    stock_value = safe_int(totals.get("stock_value_total"), item.stock_value)
    item_count = safe_int(po.no_of_po, item.no_of_item if po else item.no_of_item)
    consignee_count = safe_int(po.no_of_consignee, item.no_of_con if po else item.no_of_con)

    return {
        "s_no": idx,
        "unique_id": item.unique_id,
        "form_main_unique_id": item.form_main_unique_id,
        "po_unique_id": item.po_unique_id or (po.po_unique_id if po else ""),
        "po_num": item.po_num or (po.po_num if po else ""),
        "po_date": str(item.po_date or (po.po_date if po else "")) if (item.po_date or (po.po_date if po else None)) else "",
        "department": (_department_name(po.department) if po else "") or item.department or (po.department if po else ""),
        "department_display": department_display,
        "executive_name": (_executive_name(po.executive_name) if po else "") or item.executive_name or (po.executive_name if po else ""),
        "executive_display": executive_display,
        "district_name": district_name,
        "state_name": state_name,
        "customer_name": department_display,
        "customer_location": ", ".join(part for part in [district_name, state_name] if part),
        "no_of_con": consignee_count,
        "no_of_item": item_count,
        "order_qty": order_qty,
        "stock_qty": stock_qty,
        "balance_qty": max(order_qty - stock_qty, 0),
        "billed_qty": billed_qty,
        "stock_value": str(stock_value or 0),
        "file_name": po.file_name if po else "",
        "attachment_urls": attachment_urls,
        "stock_id": item.stock_id,
        "status": item.status,
        "status_display": dict(StockPositionMain.STATUS_CHOICES).get(item.status, "-"),
    }


def _sublist_rows(request, form_main_unique_id):
    grouped_rows = (
        _tenant_stock_queryset(request, StockPositionSublist.objects.filter(
            form_main_unique_id=form_main_unique_id,
            is_delete=0,
        ))
        .values(
            "stock_id",
            "stock_date",
            "product_unique_id",
            "item_code",
            "product",
            "part_no",
            "item_qty",
            "remaining_qty",
            "remqty",
        )
        .annotate(
            stock_qty=Sum("stock_qty"),
            last_id=Max("id"),
        )
        .order_by("stock_id", "last_id")
    )

    rows = []
    for index, row in enumerate(grouped_rows, start=1):
        rows.append(
            {
                "s_no": index,
                "stock_id": row.get("stock_id") or "",
                "stock_date": str(row.get("stock_date") or ""),
                "product_unique_id": row.get("product_unique_id") or "",
                "item_code": row.get("item_code") or "",
                "product": row.get("product") or "",
                "part_no": row.get("part_no") or "",
                "item_qty": safe_int(row.get("item_qty"), 0),
                "remqty": safe_int(row.get("remqty"), 0),
                "stock_qty": safe_int(row.get("stock_qty"), 0),
                "remaining_qty": safe_int(row.get("remaining_qty"), 0),
            }
        )
    return rows


def _grouped_main_queryset(request, status_value, from_date=None, to_date=None, search=""):
    grouped = (
        _tenant_stock_queryset(request, StockPositionMain.objects.filter(is_delete=0, status=status_value))
        .values("form_main_unique_id")
        .annotate(latest_id=Max("id"))
    )
    latest_ids = [row["latest_id"] for row in grouped if row.get("latest_id")]
    qs = _tenant_stock_queryset(request, StockPositionMain.objects.filter(id__in=latest_ids, is_delete=0, status=status_value))

    if from_date:
        qs = qs.filter(po_date__gte=from_date)
    if to_date:
        qs = qs.filter(po_date__lte=to_date)
    qs = _search_main_queryset(qs, search)

    return qs.order_by("-po_date", "-id")


class StockPositionPendingListView(APIView):
    def get(self, request):
        try:
            _reset_orphan_po_statuses(request)
            user_type, user_unique_id = _request_user_context(request)
            qs = _filter_po_by_user(_ready_purchase_order_queryset(request), user_type, user_unique_id).order_by("-po_date", "-id")
            result = [_pending_row(po, idx, request) for idx, po in enumerate(qs, start=1)]
            return Response({"status": True, "data": result})
        except Exception as exc:
            return Response({"status": False, "error": str(exc)}, status=400)

    def post(self, request):
        try:
            _reset_orphan_po_statuses(request)
            draw = safe_int(request.data.get("draw", 1), 1)
            start = safe_int(request.data.get("start", 0), 0)
            length = safe_int(request.data.get("length", 10), 10)
            search = request.data.get("search", {})
            from_date = convert_date(request.data.get("from_date", ""))
            to_date = convert_date(request.data.get("to_date", ""))

            if isinstance(search, dict):
                search = search.get("value", "")
            search = str(search or "").strip()

            user_type, user_unique_id = _request_user_context(request)
            qs = _filter_po_by_user(_ready_purchase_order_queryset(request), user_type, user_unique_id)

            if from_date:
                qs = qs.filter(po_date__gte=from_date)
            if to_date:
                qs = qs.filter(po_date__lte=to_date)
            qs = _search_po_queryset(qs, search)

            total = qs.count()
            filtered = total
            qs = qs.order_by("-po_date", "-id")

            if length != -1:
                qs = qs[start : start + length]

            result = [_pending_row(po, idx, request) for idx, po in enumerate(qs, start=start + 1)]
        except Exception as exc:
            return Response({"status": False, "error": str(exc)}, status=400)

        return Response(datatable_response(draw, total, filtered, result))


class StockPositionProcessingListView(APIView):
    def post(self, request):
        _reset_orphan_po_statuses(request)
        draw = safe_int(request.data.get("draw", 1), 1)
        start = safe_int(request.data.get("start", 0), 0)
        length = safe_int(request.data.get("length", 10), 10)
        from_date = convert_date(request.data.get("from_date", ""))
        to_date = convert_date(request.data.get("to_date", ""))
        search = request.data.get("search", {})

        if isinstance(search, dict):
            search = search.get("value", "")
        search = str(search or "").strip()

        user_type, user_unique_id = _request_user_context(request)
        qs = _filter_main_by_user(
            _grouped_main_queryset(request, 1, from_date=from_date, to_date=to_date, search=search),
            user_type,
            user_unique_id,
        )
        total = qs.count()

        if length != -1:
            qs = qs[start : start + length]

        result = [_main_row(item, idx, request) for idx, item in enumerate(qs, start=start + 1)]
        return Response(datatable_response(draw, total, total, result))


class StockPositionCompleteListView(APIView):
    def post(self, request):
        _reset_orphan_po_statuses(request)
        draw = safe_int(request.data.get("draw", 1), 1)
        start = safe_int(request.data.get("start", 0), 0)
        length = safe_int(request.data.get("length", 10), 10)
        from_date = convert_date(request.data.get("from_date", ""))
        to_date = convert_date(request.data.get("to_date", ""))
        search = request.data.get("search", {})

        if isinstance(search, dict):
            search = search.get("value", "")
        search = str(search or "").strip()

        if not from_date and not to_date:
            today = str(date.today())
            from_date = today
            to_date = today

        user_type, user_unique_id = _request_user_context(request)
        qs = _filter_main_by_user(
            _grouped_main_queryset(request, 2, from_date=from_date, to_date=to_date, search=search),
            user_type,
            user_unique_id,
        )

        total = qs.count()
        filtered = total

        if length != -1:
            qs = qs[start : start + length]

        result = [_main_row(item, idx, request) for idx, item in enumerate(qs, start=start + 1)]
        return Response(datatable_response(draw, total, filtered, result))


class StockPositionCreateView(APIView):
    def post(self, request):
        payload = request.data

        try:
            with transaction.atomic():
                audit = tenant_audit_payload(request)
                main_unique_id = payload.get("main_unique_id")
                po_unique_id = payload.get("po_unique_id")
                po_num = payload.get("po_num")
                stock_date = convert_date(payload.get("stock_date"))
                po_date = convert_date(payload.get("po_date"))
                total_qty = payload.get("total_qty", 0)
                net_value = payload.get("net_value", 0)
                products = payload.get("products", [])
                totals = payload.get("totals", {})

                stock_id = generate_stock_id()

                existing_qty = (
                    _tenant_stock_queryset(request, StockPosition.objects.filter(form_main_unique_id=main_unique_id, is_delete=0))
                    .aggregate(total=Sum("stock_qty"))
                    .get("total")
                    or 0
                )
                incoming_qty = safe_int(totals.get("total_stock_qty", 0), 0)
                grand_qty = int(existing_qty) + incoming_qty
                computed_status = 2 if grand_qty >= safe_int(total_qty, 0) else 1

                try:
                    po = tenant_queryset(request, PurchaseOrder.objects.filter(unique_id=main_unique_id, is_delete=0), include_global=False).get()
                    po.status = computed_status
                    po.save(update_fields=["status"])
                except Exception:
                    pass

                StockPositionMain.objects.create(
                    form_main_unique_id=main_unique_id,
                    po_unique_id=po_unique_id,
                    po_num=po_num,
                    stock_id=stock_id,
                    no_of_con=payload.get("no_of_con", 0),
                    no_of_item=payload.get("no_of_items", 0),
                    executive_name=payload.get("exe_name", ""),
                    department=payload.get("department", ""),
                    stock_qty=totals.get("total_stock_qty", 0),
                    stock_value=totals.get("total_stock_value", 0),
                    billed_qty=totals.get("total_stock_qty", 0),
                    stock_date=stock_date,
                    po_date=po_date,
                    status=computed_status,
                    **audit,
                )

                for prod in products:
                    rem_qty = prod.get("remqtyVal", 0)
                    if safe_int(rem_qty, 0) == 0:
                        rem_qty = prod.get("item_qty", 0)

                    StockPosition.objects.create(
                        form_main_unique_id=main_unique_id,
                        po_unique_id=po_unique_id,
                        stock_id=stock_id,
                        product_unique_id=prod.get("product_unique_id", ""),
                        item_code=prod.get("item_code", ""),
                        product=prod.get("product", ""),
                        unit_price=prod.get("unit_price", 0),
                        net_price=prod.get("net_price", 0),
                        product_tax=prod.get("product_tax", 0),
                        billed_qty=prod.get("billed_qty", 0),
                        item_qty=prod.get("item_qty", 0),
                        stock_qty=prod.get("stock_qty", 0),
                        remaining_qty=prod.get("remaining_qty", 0),
                        update_stock_qty=prod.get("update_stock_qty", 0),
                        update_stock_value=prod.get("update_stock_value", 0),
                        stock_value=prod.get("stock_value", 0),
                        part_no=prod.get("part_no", ""),
                        total_qty=total_qty,
                        net_value=net_value,
                        remqty=rem_qty,
                        stock_date=stock_date,
                        po_date=po_date,
                        **audit,
                    )

                    StockPositionSublist.objects.create(
                        form_main_unique_id=main_unique_id,
                        stock_id=stock_id,
                        product_unique_id=prod.get("product_unique_id", ""),
                        item_code=prod.get("item_code", ""),
                        product=prod.get("product", ""),
                        item_qty=prod.get("item_qty", 0),
                        billed_qty=prod.get("billed_qty", 0),
                        stock_qty=prod.get("stock_qty", 0),
                        remaining_qty=prod.get("remaining_qty", 0),
                        remqty=rem_qty,
                        product_tax=prod.get("product_tax", 0),
                        part_no=prod.get("part_no", ""),
                        total_qty=total_qty,
                        net_value=net_value,
                        unit_price=prod.get("unit_price", 0),
                        net_price=prod.get("net_price", 0),
                        stock_date=stock_date,
                        **audit,
                    )

            return Response(
                {
                    "status": True,
                    "msg": "create",
                    "stock_id": stock_id,
                    "message": "Stock data saved successfully.",
                },
                status=status.HTTP_201_CREATED,
            )
        except Exception as exc:
            return Response(
                {
                    "status": False,
                    "msg": "error",
                    "error": str(exc),
                    "message": "Stock creation failed.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )


class StockPositionDetailView(APIView):
    def get(self, request, unique_id):
        mains = _tenant_stock_queryset(request, StockPositionMain.objects.filter(
            form_main_unique_id=unique_id,
            is_delete=0,
        )).order_by("-id")
        main = mains.first()

        if not main:
            return Response(
                {"status": False, "message": "Not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        products = _tenant_stock_queryset(request, StockPosition.objects.filter(
            form_main_unique_id=unique_id,
            is_delete=0,
        )).order_by("id")

        return Response(
            {
                "status": True,
                "mode": "create",
                "data": StockPositionMainSerializer(main).data,
                "products": StockPositionSerializer(products, many=True).data,
                "history": StockPositionMainSerializer(mains, many=True).data,
                "sublist": _sublist_rows(request, unique_id),
                "sublist_raw": StockPositionSublistSerializer(
                    _tenant_stock_queryset(request, StockPositionSublist.objects.filter(
                        form_main_unique_id=unique_id,
                        is_delete=0,
                    )).order_by("stock_id", "id"),
                    many=True,
                ).data,
            }
        )

    def delete(self, request, unique_id):
        mains = _tenant_stock_queryset(request, StockPositionMain.objects.filter(
            form_main_unique_id=unique_id,
            is_delete=0,
        ))

        if not mains.exists():
            return Response(
                {"status": False, "message": "Record not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        with transaction.atomic():
            mains.update(is_delete=1)
            _tenant_stock_queryset(request, StockPosition.objects.filter(
                form_main_unique_id=unique_id,
                is_delete=0,
            )).update(is_delete=1)
            _tenant_stock_queryset(request, StockPositionSublist.objects.filter(
                form_main_unique_id=unique_id,
                is_delete=0,
            )).update(is_delete=1)
            tenant_queryset(request, PurchaseOrder.objects.filter(unique_id=unique_id), include_global=False).update(status=0)

        return Response(
            {
                "status": True,
                "msg": "delete",
                "message": "Stock position deleted successfully.",
            }
        )


class StockPositionStatusUpdateView(APIView):
    def put(self, request, unique_id):
        new_status = safe_int(request.data.get("status"), -1)

        if new_status not in [1, 2]:
            return Response(
                {
                    "status": False,
                    "message": "Status 1 (Processing) or 2 (Complete) only valid.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        updated = _tenant_stock_queryset(request, StockPositionMain.objects.filter(
            form_main_unique_id=unique_id,
            is_delete=0,
        )).update(status=new_status)

        if updated == 0:
            return Response(
                {"status": False, "message": "Record not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            tenant_queryset(request, PurchaseOrder.objects.filter(unique_id=unique_id), include_global=False).update(status=new_status)
        except Exception:
            pass

        return Response(
            {
                "status": True,
                "msg": "update",
                "message": "Status updated successfully.",
            }
        )


class StockPositionPartNoUpdateView(APIView):
    def put(self, request, unique_id):
        stock_id = str(request.data.get("stock_id") or "").strip()
        product_unique_id = str(request.data.get("product_unique_id") or "").strip()
        item_code = str(request.data.get("item_code") or "").strip()
        product = str(request.data.get("product") or "").strip()
        part_no = str(request.data.get("part_no") or "").strip()

        if not stock_id:
            return Response(
                {"status": False, "message": "stock_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not part_no:
            return Response(
                {"status": False, "message": "part_no is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        stock_filter = {
            "form_main_unique_id": unique_id,
            "stock_id": stock_id,
            "is_delete": 0,
        }
        if product_unique_id:
            stock_filter["product_unique_id"] = product_unique_id
        else:
            stock_filter["item_code"] = item_code
            stock_filter["product"] = product

        with transaction.atomic():
            stock_updated = _tenant_stock_queryset(
                request,
                StockPosition.objects.filter(**stock_filter),
            ).update(part_no=part_no)
            sublist_updated = _tenant_stock_queryset(
                request,
                StockPositionSublist.objects.filter(**stock_filter),
            ).update(part_no=part_no)

        if stock_updated == 0 and sublist_updated == 0:
            return Response(
                {"status": False, "message": "Stock item not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(
            {
                "status": True,
                "msg": "update",
                "message": "Part number updated successfully.",
            }
        )


class StockPositionExportView(APIView):
    def get(self, request):
        export_type = request.query_params.get("type", "all")

        qs = _tenant_stock_queryset(request, StockPositionMain.objects.filter(is_delete=0))

        if export_type == "pending":
            qs = qs.filter(status=0)
        elif export_type == "complete":
            qs = qs.filter(status=2)

        data = []
        for idx, item in enumerate(qs.order_by("id"), start=1):
            row = _main_row(item, idx, request)
            data.append(
                {
                    "s_no": row["s_no"],
                    "stock_id": row.get("stock_id"),
                    "po_num": row.get("po_num"),
                    "po_date": row.get("po_date"),
                    "department": row.get("department_display") or row.get("department"),
                    "executive": row.get("executive_display") or row.get("executive_name"),
                    "no_of_con": row.get("no_of_con") or row.get("no_of_consignee"),
                    "no_of_item": row.get("no_of_item") or row.get("no_of_po"),
                    "stock_qty": str(row.get("stock_qty") or 0),
                    "stock_value": str(row.get("stock_value") or row.get("net_value") or 0),
                    "billed_qty": str(row.get("balance_qty") or 0),
                    "stock_date": row.get("po_date") or "",
                    "status": row.get("status_display") or "-",
                }
            )

        return Response({"status": True, "data": data})

