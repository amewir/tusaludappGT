from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from .models import RecetaMedica, RegistroESAS
from .serializers import RecetaMedicaSerializer, RegistroESASSerializer
from datetime import date, timedelta
import json

class IsDoctorUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'doctor'

class RecetaMedicaViewSet(viewsets.ModelViewSet):
    queryset = RecetaMedica.objects.all()
    serializer_class = RecetaMedicaSerializer
    # Parsers explícitos para soportar archivos PDF via multipart/form-data
    parser_classes = (MultiPartParser, FormParser, JSONParser)

    def get_permissions(self):
        if self.action == 'create':
            return [IsDoctorUser()]
        return [permissions.IsAuthenticated()]

    # La creación se maneja con la lógica estándar de ModelViewSet, 
    # el parseo de FormData a JSON y bools se maneja en to_internal_value de RecetaMedicaSerializer

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return RecetaMedica.objects.none()
        
        if user.role in ['admin', 'support']:
            return RecetaMedica.objects.all()
        
        if user.role == 'doctor':
            return RecetaMedica.objects.filter(doctor=user)
        
        return RecetaMedica.objects.filter(paciente=user)


class RegistroESASViewSet(viewsets.ModelViewSet):
    """
    ViewSet para el módulo ESAS (Edmonton Symptom Assessment System).
    - Pacientes: solo ven y crean sus propios registros.
    - Doctores / Admin: pueden ver registros de todos los pacientes.
    """
    serializer_class = RegistroESASSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return RegistroESAS.objects.none()
        
        if user.role in ['admin', 'support', 'doctor']:
            # Filtrar por paciente si se proporciona como query param
            paciente_id = self.request.query_params.get('paciente')
            if paciente_id:
                return RegistroESAS.objects.filter(paciente_id=paciente_id)
            return RegistroESAS.objects.all()
        
        # Pacientes solo ven sus propios registros
        return RegistroESAS.objects.filter(paciente=user)

    def perform_create(self, serializer):
        """Asigna automáticamente al paciente autenticado como dueño del registro."""
        serializer.save(paciente=self.request.user)

    @action(detail=False, methods=['get'])
    def historial(self, request):
        """Retorna el historial ESAS de los últimos 30 días para el usuario o paciente específico."""
        dias = int(request.query_params.get('dias', 30))
        fecha_desde = date.today() - timedelta(days=dias)
        
        qs = self.get_queryset().filter(fecha__gte=fecha_desde).order_by('fecha')
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def hoy(self, request):
        """Verifica si el paciente ya completó el registro de hoy."""
        user = request.user
        registro = RegistroESAS.objects.filter(paciente=user, fecha=date.today()).first()
        if registro:
            return Response({
                'completado': True,
                'registro': self.get_serializer(registro).data
            })
        return Response({'completado': False, 'registro': None})
