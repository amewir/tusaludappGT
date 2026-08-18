from django.db import models
from django.conf import settings  
from django.core.exceptions import ValidationError
from django.utils import timezone
from datetime import timedelta
from hospitals.models import Hospital  

class Appointment(models.Model):
    class Status(models.TextChoices):
        PENDIENTE = 'PENDIENTE', 'Pendiente'
        CONFIRMADO = 'CONFIRMADA', 'Confirmada'
        CANCELADO = 'CANCELADA', 'Cancelada'
        COMPLETADO = 'COMPLETADA', 'Completada'

    class Type(models.TextChoices):
        PRESENCIAL = 'PRESENCIAL', 'Presencial'
        TELEMEDICINA = 'TELEMEDICINA', 'Telemedicina'

    class FrecuenciaRecurrencia(models.TextChoices):
        DIARIA = 'DIARIA', 'Diaria'
        SEMANAL = 'SEMANAL', 'Semanal'
        QUINCENAL = 'QUINCENAL', 'Quincenal'
        MENSUAL = 'MENSUAL', 'Mensual'

    # Relaciones cruzadas entre aplicaciones de manera limpia
    paciente = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='paciente_appointments')
    doctor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='doctor_appointments')
    hospital = models.ForeignKey(Hospital, on_delete=models.CASCADE)
    
    cita_fecha = models.DateTimeField()
    estado = models.CharField(max_length=15, choices=Status.choices, default=Status.PENDIENTE)
    tipo = models.CharField(max_length=15, choices=Type.choices, default=Type.PRESENCIAL)
    enlace_virtual = models.URLField(max_length=500, blank=True, null=True, help_text="Enlace a la videollamada")
    razon_cancelado = models.TextField(blank=True, null=True)

    # Campos de recurrencia y duración
    duracion_minutos = models.IntegerField(default=30, help_text="Duración estimada de la cita en minutos")
    es_recurrente = models.BooleanField(default=False, help_text="Indica si la cita se repite periódicamente")
    frecuencia_recurrencia = models.CharField(
        max_length=15,
        choices=FrecuenciaRecurrencia.choices,
        blank=True,
        null=True,
        help_text="Frecuencia de repetición de la cita"
    )
    fecha_fin_recurrencia = models.DateField(
        blank=True,
        null=True,
        help_text="Fecha límite hasta la cual se repite la cita"
    )

    def clean(self):
        """Valida que no existan traslapes de horario para el mismo médico o paciente."""
        super().clean()

        if not self.cita_fecha:
            return

        inicio = self.cita_fecha
        fin = inicio + timedelta(minutes=self.duracion_minutos or 30)

        # Citas activas (excluir canceladas y la propia cita si ya existe)
        qs = Appointment.objects.exclude(
            estado='CANCELADA'
        )
        if self.pk:
            qs = qs.exclude(pk=self.pk)

        # Verificar traslape con el mismo médico
        if self.doctor:
            conflictos_doctor = qs.filter(
                doctor=self.doctor,
                cita_fecha__lt=fin,
            ).extra(
                where=["cita_fecha + (duracion_minutos || ' minutes')::interval > %s"],
                params=[inicio]
            )
            # Fallback compatible: filtro simplificado sin funciones de intervalo de PostgreSQL
            try:
                if conflictos_doctor.exists():
                    raise ValidationError({
                        'cita_fecha': f'El médico ya tiene una cita programada que colisiona con este horario '
                                      f'({inicio.strftime("%Y-%m-%d %H:%M")} - {fin.strftime("%H:%M")}).'
                    })
            except Exception:
                # Si la consulta con interval falla (ej. SQLite), usar filtro simplificado
                conflictos_simple = qs.filter(
                    doctor=self.doctor,
                    cita_fecha__lt=fin,
                    cita_fecha__gte=inicio - timedelta(minutes=120),
                )
                for c in conflictos_simple:
                    c_fin = c.cita_fecha + timedelta(minutes=c.duracion_minutos or 30)
                    if c.cita_fecha < fin and c_fin > inicio:
                        raise ValidationError({
                            'cita_fecha': f'El médico ya tiene una cita programada que colisiona con este horario '
                                          f'({inicio.strftime("%Y-%m-%d %H:%M")} - {fin.strftime("%H:%M")}).'
                        })

        # Verificar traslape con el mismo paciente
        try:
            conflictos_paciente_qs = qs.filter(
                paciente=self.paciente,
                cita_fecha__lt=fin,
            ).extra(
                where=["cita_fecha + (duracion_minutos || ' minutes')::interval > %s"],
                params=[inicio]
            )
            if conflictos_paciente_qs.exists():
                raise ValidationError({
                    'cita_fecha': f'El paciente ya tiene una cita programada que colisiona con este horario '
                                  f'({inicio.strftime("%Y-%m-%d %H:%M")} - {fin.strftime("%H:%M")}).'
                })
        except Exception:
            conflictos_pac_simple = qs.filter(
                paciente=self.paciente,
                cita_fecha__lt=fin,
                cita_fecha__gte=inicio - timedelta(minutes=120),
            )
            for c in conflictos_pac_simple:
                c_fin = c.cita_fecha + timedelta(minutes=c.duracion_minutos or 30)
                if c.cita_fecha < fin and c_fin > inicio:
                    raise ValidationError({
                        'cita_fecha': f'El paciente ya tiene una cita programada que colisiona con este horario '
                                      f'({inicio.strftime("%Y-%m-%d %H:%M")} - {fin.strftime("%H:%M")}).'
                    })

    def __str__(self):
        return f"Cita {self.id} - {self.paciente.last_name}"
