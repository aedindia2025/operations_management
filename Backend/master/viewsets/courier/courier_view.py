from rest_framework.decorators import api_view
from rest_framework.response import Response
from apps.courier.couriermodels import Courier   # ✅ updated import
from apps.courier.serializers.courier_serializer import CourierSerializer

# CREATE / UPDATE
@api_view(['POST'])
def create_update_courier(request):
    unique_id = request.data.get('unique_id')

    if unique_id:
        try:
            courier = Courier.objects.get(unique_id=unique_id)
            serializer = CourierSerializer(courier, data=request.data)
        except Courier.DoesNotExist:
            return Response({"status": False, "msg": "not_found"})
    else:
        serializer = CourierSerializer(data=request.data)

    if serializer.is_valid():
        serializer.save()
        return Response({
            "status": True,
            "msg": "success",
            "data": serializer.data
        })
    else:
        return Response({
            "status": False,
            "msg": "error",
            "error": serializer.errors
        })


# DATATABLE
@api_view(['POST'])
def courier_datatable(request):
    data = []
    couriers = Courier.objects.filter(is_delete=False)

    for i, obj in enumerate(couriers, start=1):
        data.append({
            "s_no": i,
            "courier_name": obj.courier_name,
            "is_active": "Active" if obj.is_active else "Inactive",
            "unique_id": str(obj.unique_id)
        })

    return Response({"data": data})


# DELETE
@api_view(['POST'])
def delete_courier(request):
    unique_id = request.data.get('unique_id')

    try:
        courier = Courier.objects.get(unique_id=unique_id)
        courier.is_delete = True
        courier.save()

        return Response({
            "status": True,
            "msg": "deleted"
        })
    except Courier.DoesNotExist:
        return Response({
            "status": False,
            "msg": "not_found"
        })