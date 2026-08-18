from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from .models import PatientProfile, RecordatorioMedico, Procedimiento
from .serializers import (
    UserSerializer,
    PatientProfileSerializer,
    RecordatorioMedicoSerializer,
    ProcedimientoSerializer
)

User = get_user_model()

class IsAdminUserRole(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and (request.user.role == 'admin' or request.user.is_staff)

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer

    def get_permissions(self):
        if self.action == 'create':
            return [permissions.AllowAny()]
        elif self.action in ['destroy', 'update', 'partial_update']:
            return [IsAdminUserRole()]
        return [permissions.IsAuthenticated()]

    @action(detail=False, methods=['patch'], url_path='update-location', permission_classes=[IsAuthenticated])
    def update_location(self, request):
        user = request.user
        lat = request.data.get('latitude')
        lng = request.data.get('longitude')
        
        if lat is None or lng is None:
            return Response({"error": "Parámetros 'latitude' y 'longitude' son requeridos."}, status=400)

        try:
            lat = float(lat)
            lng = float(lng)
        except ValueError:
            return Response({"error": "Los parámetros 'latitude' y 'longitude' deben ser numéricos."}, status=400)

        profile, created = PatientProfile.objects.get_or_create(
            user=user,
            defaults={
                'dpi': f'DPI-{user.id}',
                'birth_date': '1990-01-01',
                'emergency_name': f'Emergencia-{user.id}',
                'emergency_contact': '911',
                'latitude': lat,
                'longitud': lng
            }
        )
        if not created:
            profile.latitude = lat
            profile.longitud = lng
            profile.save()

        return Response({
            "message": "Ubicación actualizada con éxito.",
            "latitude": profile.latitude,
            "longitude": profile.longitud
        })

class PatientProfileViewSet(viewsets.ModelViewSet):
    queryset = PatientProfile.objects.all()
    serializer_class = PatientProfileSerializer

class RecordatorioMedicoViewSet(viewsets.ModelViewSet):
    queryset = RecordatorioMedico.objects.all()
    serializer_class = RecordatorioMedicoSerializer

class ProcedimientoViewSet(viewsets.ModelViewSet):
    queryset = Procedimiento.objects.all()
    serializer_class = ProcedimientoSerializer
