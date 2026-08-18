"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from api_com.views import saludo_api, chat_asistente
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

# Importar ViewSets de cada app
from users.views import UserViewSet, PatientProfileViewSet, RecordatorioMedicoViewSet, ProcedimientoViewSet
from hospitals.views import HospitalViewSet, AlertaEmergenciaViewSet
from appointments.views import AppointmentViewSet
from doctores.views import DoctorProfileViewSet
from clinical.views import RecetaMedicaViewSet, RegistroESASViewSet

# Inicializar y registrar rutas en el enrutador central
router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')
router.register(r'patient-profiles', PatientProfileViewSet, basename='patientprofile')
router.register(r'recordatorios-medicos', RecordatorioMedicoViewSet, basename='recordatoriomedico')
router.register(r'procedimientos', ProcedimientoViewSet, basename='procedimiento')
router.register(r'hospitals', HospitalViewSet, basename='hospital')
router.register(r'appointments', AppointmentViewSet, basename='appointment')
router.register(r'doctor-profiles', DoctorProfileViewSet, basename='doctorprofile')
router.register(r'emergencia', AlertaEmergenciaViewSet, basename='emergencia')
router.register(r'recetas', RecetaMedicaViewSet, basename='receta')
router.register(r'esas', RegistroESASViewSet, basename='esas')

from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('saludo/', saludo_api, name='saludo_api'),
    path('api/', include(router.urls)),
    path('api/chat/', chat_asistente, name='chat_asistente'),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
