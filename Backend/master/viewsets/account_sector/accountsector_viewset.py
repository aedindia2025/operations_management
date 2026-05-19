import uuid
from django.db.models import Q
from rest_framework.generics import GenericAPIView
from rest_framework.response import Response
from rest_framework import status

from master.apps.account_sector.accountsectormodel import AccountSector
from master.serializers.account_sector import AccountSectorSerializer, AccountSectorInputSerializer
from master.tenant import apply_tenant_audit, request_company_id, tenant_queryset


def generate_unique_id():
    return uuid.uuid4().hex[:18]


class AccountSectorListCreateView(GenericAPIView):
    serializer_class = AccountSectorInputSerializer

    def get(self, request):
        search = request.query_params.get('search', '').strip()
        start  = int(request.query_params.get('start', 0))
        length = request.query_params.get('length', '10')
        draw   = int(request.query_params.get('draw', 1))

        qs = tenant_queryset(request, AccountSector.objects.filter(is_delete=0), include_global=False).order_by('sector_name')

        if search:
            qs = qs.filter(Q(sector_name__icontains=search))

        total = qs.count()
        if length != '-1':
            qs = qs[start: start + int(length)]

        data = []
        for i, obj in enumerate(qs, start=start + 1):
            data.append({
                's_no'       : i,
                'sector_name': obj.sector_name,
                'is_active'  : 'Active' if obj.is_active == 1 else 'Inactive',
                'unique_id'  : obj.unique_id,
            })

        return Response({
            'draw'            : draw,
            'recordsTotal'    : total,
            'recordsFiltered' : total,
            'data'            : data,
        })

    def post(self, request):
        serializer = AccountSectorInputSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {'status': 0, 'msg': 'error', 'errors': serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        data = serializer.validated_data

        duplicate = AccountSector.objects.filter(
            sector_name__iexact=data['sector_name'], sess_company_id=request_company_id(request), is_delete=0
        ).exists()
        if duplicate:
            return Response(
                {'status': 1, 'msg': 'already', 'error': 'Sector already exists'},
                status=status.HTTP_409_CONFLICT,
            )

        obj = AccountSector.objects.create(
            unique_id       = generate_unique_id(),
            sector_name     = data['sector_name'],
            is_active       = data.get('is_active', 1),
            session_id      = '',
            sess_user_type  = '',
            sess_user_id    = '',
            sess_branch_id  = '',
        )
        apply_tenant_audit(obj, request)
        obj.save()
        return Response(
            {'status': 1, 'msg': 'create', 'data': AccountSectorSerializer(obj).data},
            status=status.HTTP_201_CREATED,
        )


class AccountSectorDetailView(GenericAPIView):
    serializer_class = AccountSectorInputSerializer

    def _get_object(self, request, unique_id):
        return (
            tenant_queryset(request, AccountSector.objects.filter(unique_id=unique_id, is_delete=0), include_global=False)
            .order_by("-id")
            .first()
        )

    def get(self, request, unique_id):
        obj = self._get_object(request, unique_id)
        if not obj:
            return Response(
                {'status': 0, 'error': 'Not found'},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response({'status': 1, 'data': AccountSectorSerializer(obj).data})

    def put(self, request, unique_id):
        obj = self._get_object(request, unique_id)
        if not obj:
            return Response(
                {'status': 0, 'error': 'Not found'},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = AccountSectorInputSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {'status': 0, 'msg': 'error', 'errors': serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        data = serializer.validated_data

        duplicate = AccountSector.objects.filter(
            sector_name__iexact=data['sector_name'], sess_company_id=request_company_id(request), is_delete=0
        ).exclude(unique_id=unique_id).exists()
        if duplicate:
            return Response(
                {'status': 1, 'msg': 'already', 'error': 'Sector name already in use'},
                status=status.HTTP_409_CONFLICT,
            )

        obj.sector_name     = data['sector_name']
        obj.is_active       = data.get('is_active', obj.is_active)
        obj.session_id      = obj.session_id      or ''
        obj.sess_user_type  = obj.sess_user_type  or ''
        obj.sess_user_id    = obj.sess_user_id    or ''
        apply_tenant_audit(obj, request)
        obj.save()
        return Response(
            {'status': 1, 'msg': 'update', 'data': AccountSectorSerializer(obj).data}
        )

    def delete(self, request, unique_id):
        obj = self._get_object(request, unique_id)
        if not obj:
            return Response(
                {'status': 0, 'msg': 'error'},
                status=status.HTTP_404_NOT_FOUND,
            )
        obj.is_delete = 1
        apply_tenant_audit(obj, request)
        obj.save()
        return Response({'status': 1, 'msg': 'success_delete'})
