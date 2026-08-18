from django.db import models
from django.conf import settings

class Hospital(models.Model):
    class EstadoAtencion(models.TextChoices):
        VERDE = 'Verde', 'Verde'
        AMARILLO = 'Amarillo', 'Amarillo'
        ROJO = 'Rojo', 'Rojo'

    nombre = models.CharField(max_length=200)
    direccion = models.TextField()
    latitud = models.FloatField()
    longitud = models.FloatField()
    tel_emergencia = models.CharField(max_length=15, verbose_name="Línea de Emergencia ")
    tiene_unidad_paliativa = models.BooleanField(default=False)
    calendario_atencion = models.TextField(help_text="Horarios de atención general y especialidades")
    estado_atencion = models.CharField(
        max_length=10,
        choices=EstadoAtencion.choices,
        default=EstadoAtencion.VERDE
    )

    def __str__(self):
        return self.nombre

class AlertaEmergencia(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    latitude = models.FloatField()
    longitude = models.FloatField()

    def __str__(self):
        return f"Alerta de {self.user.username if self.user else 'Anónimo'} - {self.timestamp}"