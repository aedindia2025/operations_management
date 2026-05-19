import uuid
from django.db.models import Q
from rest_framework.generics import GenericAPIView
from rest_framework.response import Response
from rest_framework import status
from master.apps.state.statemodel import StateCreation
from master.serializers.state import StateCreationSerializer, StateInputSerializer


def generate_unique_id():
    return uuid.uuid4().hex[:18]


class StateListCreateView(GenericAPIView):
    serializer_class = StateInputSerializer

    def get(self, request):
        search = request.query_params.get('search', '').strip()
        start  = int(request.query_params.get('start', 0))
        length = request.query_params.get('length', '10')
        draw   = int(request.query_params.get('draw', 1))

        qs = StateCreation.objects.filter(is_delete=0).order_by('state_name')
        if search:
            qs = qs.filter(
                Q(state_name__icontains=search) |
                Q(short_name__icontains=search)
            )

        total = qs.count()
        if length != '-1':
            qs = qs[start: start + int(length)]

        data = []
        for i, obj in enumerate(qs, start=start + 1):
            data.append({
                's_no'       : i,
                'state_name' : obj.state_name,
                'short_name' : obj.short_name or '-',
                'is_active'  : 'Active' if obj.is_active == 1 else 'Inactive',
                'unique_id'  : obj.unique_id,
            })

        return Response({
            'draw': draw, 'recordsTotal': total,
            'recordsFiltered': total, 'data': data,
        })

    def post(self, request):
        serializer = StateInputSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {'status': 0, 'msg': 'error', 'errors': serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        data = serializer.validated_data

        duplicate = StateCreation.objects.filter(
            state_name__iexact=data['state_name'], is_delete=0
        ).exists()
        if duplicate:
            return Response(
                {'status': 1, 'msg': 'already', 'error': 'State already exists'},
                status=status.HTTP_409_CONFLICT,
            )

        obj = StateCreation.objects.create(
            unique_id  = generate_unique_id(),
            state_name = data['state_name'],
            short_name = data.get('short_name', ''),
            is_active  = data.get('is_active', 1),
        )
        return Response(
            {'status': 1, 'msg': 'create', 'data': StateCreationSerializer(obj).data},
            status=status.HTTP_201_CREATED,
        )


class StateDetailView(GenericAPIView):
    serializer_class = StateInputSerializer

    def _get_object(self, unique_id):
        try:
            return StateCreation.objects.get(unique_id=unique_id, is_delete=0)
        except StateCreation.DoesNotExist:
            return None

    def get(self, request, unique_id):
        obj = self._get_object(unique_id)
        if not obj:
            return Response({'status': 0, 'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
        return Response({'status': 1, 'data': StateCreationSerializer(obj).data})

    def put(self, request, unique_id):
        obj = self._get_object(unique_id)
        if not obj:
            return Response({'status': 0, 'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

        serializer = StateInputSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {'status': 0, 'msg': 'error', 'errors': serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        data = serializer.validated_data

        duplicate = StateCreation.objects.filter(
            state_name__iexact=data['state_name'], is_delete=0
        ).exclude(unique_id=unique_id).exists()
        if duplicate:
            return Response(
                {'status': 1, 'msg': 'already', 'error': 'State name already in use'},
                status=status.HTTP_409_CONFLICT,
            )

        obj.state_name = data['state_name']
        obj.short_name = data.get('short_name', '')
        obj.is_active  = data.get('is_active', obj.is_active)
        obj.save()
        return Response({'status': 1, 'msg': 'update', 'data': StateCreationSerializer(obj).data})

    def delete(self, request, unique_id):
        obj = self._get_object(unique_id)
        if not obj:
            return Response({'status': 0, 'msg': 'error'}, status=status.HTTP_404_NOT_FOUND)
        obj.is_delete = 1
        obj.save()
        return Response({'status': 1, 'msg': 'success_delete'})