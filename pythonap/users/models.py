from django.db import models
from django.contrib.auth.models import AbstractUser


# Modulo de usuarios y perfiles de pacientes y usuarios del sistema de salud
class User(AbstractUser):
    class Roles(models.TextChoices):
        PATIENT = 'patient','Patient'
        DOCTOR = 'doctor', 'Doctor'
        SUPPORT = 'support', 'Support'
        ADMIN = 'admin', 'Admin'
    role = models.CharField(max_length=20, choices=Roles.choices, default=Roles.PATIENT)
    phone = models.CharField(max_length=8, blank = True, null = True)

class PatientProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name = 'patient_profile')
    dpi = models.CharField(max_length=13, blank = False, null = False, unique = True, verbose_name = 'documento personal')
    birth_date = models.DateField()
    emergency_name = models.CharField(max_length=20, blank = False, null = False, unique = True, verbose_name = 'nombre de emergencia')
    emergency_contact = models.CharField(max_length = 8, blank = False, null = False, verbose_name = 'contacto de emergencia')

    #Ubicacion del paciente obtenida a traves de cuando se permita el acceso a la ubicacion por pagina web o app movil
    latitude = models.FloatField(blank = False, null = False, verbose_name = 'latitud')
    longitud = models.FloatField(blank = False, null = False, verbose_name = 'longitud')


    def __str__(self):
        return f' Paciente: {self.user.get_full_name()}  {self.dpi}'

class RecordatorioMedico(models.Model):
    patient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='medications')
    nombre_medicacion = models.CharField(max_length=150)
    dosificacion = models.CharField(max_length=100, help_text="Ej: 500mg, 1 tableta")
    frecuencia = models.IntegerField(help_text="Cada cuántas horas se toma")
    inicio = models.DateField()
    fin_medicamento = models.DateField(blank=True, null=True)
    activo = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.nombre_medicacion} - {self.patient.first_name}"

class Procedimiento(models.Model):
    class etapas(models.TextChoices):
        INGRESADO = 'INGRESADO', 'Ingresado/Recibido'
        EN_REVISION = 'EN_REVISION', 'En Revisión'
        APROBADO = 'APROBADO', 'Aprobado'
        RECHAZADO = 'RECHAZADO', 'Rechazado'

    paciente = models.ForeignKey(User, on_delete=models.CASCADE)
    tipo_procedimiento = models.CharField(max_length=150, help_text="Ej: Carné de Cuidado Paliativo, Oxígeno Domiciliario")
    etapa_actual = models.CharField(max_length=20, choices=etapas.choices, default=etapas.INGRESADO)
    comentario = models.TextField(blank=True, null=True)
    creacion = models.DateTimeField(auto_now_add=True)
    actualizacion = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Trámite {self.tipo_procedimiento} - {self.paciente.last_name}"
