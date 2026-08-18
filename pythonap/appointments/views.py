from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import permissions
from django.utils.dateparse import parse_date
from datetime import timedelta
from .models import Appointment
from .serializers import AppointmentSerializer

class AppointmentViewSet(viewsets.ModelViewSet):
    queryset = Appointment.objects.all()
    serializer_class = AppointmentSerializer

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def calendario(self, request):
        """
        Retorna las citas del usuario actual agrupadas por fecha.
        Query params opcionales: desde (YYYY-MM-DD), hasta (YYYY-MM-DD).
        """
        user = request.user
        desde = request.query_params.get('desde')
        hasta = request.query_params.get('hasta')

        qs = Appointment.objects.all()

        # Filtrar por rol del usuario
        if user.role == 'doctor':
            qs = qs.filter(doctor=user)
        elif user.role in ['admin', 'support']:
            pass  # Admins ven todo
        else:
            qs = qs.filter(paciente=user)

        # Filtrar por rango de fechas si se proporcionan
        if desde:
            fecha_desde = parse_date(desde)
            if fecha_desde:
                qs = qs.filter(cita_fecha__date__gte=fecha_desde)
        if hasta:
            fecha_hasta = parse_date(hasta)
            if fecha_hasta:
                qs = qs.filter(cita_fecha__date__lte=fecha_hasta)

        qs = qs.exclude(estado='CANCELADA').order_by('cita_fecha')

        # Agrupar por fecha
        agrupado = {}
        for cita in qs:
            fecha_str = cita.cita_fecha.strftime('%Y-%m-%d')
            if fecha_str not in agrupado:
                agrupado[fecha_str] = []
            agrupado[fecha_str].append(AppointmentSerializer(cita).data)

        return Response(agrupado)
