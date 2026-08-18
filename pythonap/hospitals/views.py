import math
import urllib.request
import json
import logging
from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Hospital, AlertaEmergencia
from .serializers import HospitalSerializer, AlertaEmergenciaSerializer

logger = logging.getLogger(__name__)

class IsAdminUserRoleOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user and request.user.is_authenticated and (request.user.role == 'admin' or request.user.is_staff)

def get_osrm_duration(patient_lat, patient_lng, hospital_lat, hospital_lng):
    # OSRM requiere las coordenadas en formato lng,lat
    url = f"http://router.project-osrm.org/route/v1/driving/{patient_lng},{patient_lat};{hospital_lng},{hospital_lat}?overview=false"
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'TUSALUDgt-App'})
        with urllib.request.urlopen(req, timeout=1.5) as response:
            res_data = json.loads(response.read().decode())
            if res_data.get('code') == 'Ok':
                routes = res_data.get('routes', [])
                if routes:
                    duration_seconds = routes[0].get('duration', 0)
                    return round(duration_seconds / 60.0, 1)
    except Exception as e:
        logger.warning(f"Error llamando a la API de OSRM: {e}. Usando estimación de velocidad promedio.")
    return None

class HospitalViewSet(viewsets.ModelViewSet):
    queryset = Hospital.objects.all()
    serializer_class = HospitalSerializer
    permission_classes = [IsAdminUserRoleOrReadOnly]

    @action(detail=False, methods=['get'], url_path='nearest')
    def nearest(self, request):
        lat_str = request.query_params.get('lat')
        lng_str = request.query_params.get('lng')

        if not lat_str or not lng_str:
            return Response({"error": "Parámetros 'lat' y 'lng' son obligatorios."}, status=400)

        try:
            patient_lat = float(lat_str)
            patient_lng = float(lng_str)
        except ValueError:
            return Response({"error": "Los parámetros 'lat' y 'lng' deben ser numéricos."}, status=400)

        hospitals = list(Hospital.objects.all())
        hospitals_with_distance = []

        for hospital in hospitals:
            # Haversine formula
            R = 6371.0  # Radio de la Tierra en kilómetros
            dlat = math.radians(hospital.latitud - patient_lat)
            dlng = math.radians(hospital.longitud - patient_lng)
            
            a = (math.sin(dlat / 2) ** 2 + 
                 math.cos(math.radians(patient_lat)) * 
                 math.cos(math.radians(hospital.latitud)) * 
                 math.sin(dlng / 2) ** 2)
            c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
            distance = R * c

            # Calcular duración del viaje usando OSRM
            tiempo_viaje = get_osrm_duration(patient_lat, patient_lng, hospital.latitud, hospital.longitud)
            if tiempo_viaje is None:
                # Fallback: velocidad promedio urbana de 40 km/h en Guatemala City
                tiempo_viaje = round((distance / 40.0) * 60.0, 1)

            # Serializar y agregar distancia calculada
            data = HospitalSerializer(hospital).data
            data['distancia_km'] = round(distance, 2)
            data['tiempo_viaje_min'] = tiempo_viaje
            hospitals_with_distance.append(data)

        # Ordenar del más cercano al más lejano
        hospitals_with_distance.sort(key=lambda x: x['distancia_km'])

        return Response(hospitals_with_distance)

class AlertaEmergenciaViewSet(viewsets.ModelViewSet):
    queryset = AlertaEmergencia.objects.all()
    serializer_class = AlertaEmergenciaSerializer
    permission_classes = [permissions.AllowAny]

    def perform_create(self, serializer):
        print(f"--- ALERTA DE EMERGENCIA GPS RECIBIDA EN EL BACKEND ---")
        lat = self.request.data.get('latitude')
        lng = self.request.data.get('longitude')
        print(f"Coordenadas del incidente: Latitud: {lat}, Longitud: {lng}")
        if self.request.user.is_authenticated:
            print(f"Paciente Remitente: {self.request.user.username} (ID: {self.request.user.id})")
            serializer.save(user=self.request.user)
        else:
            print("Remitente: Anónimo (sin iniciar sesión)")
            serializer.save()
        print("SIMULACIÓN DE NOTIFICACIÓN: SMS enviado a la unidad móvil de rescate.")
        print("-------------------------------------------------------")
