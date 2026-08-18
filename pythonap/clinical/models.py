from django.db import models
from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver
from appointments.models import Appointment
from users.models import RecordatorioMedico
from datetime import date, timedelta

class RecetaMedica(models.Model):
    class EstadoChoices(models.TextChoices):
        EMITIDA = 'EMITIDA', 'Emitida'
        DISPENSADA = 'DISPENSADA', 'Dispensada'
        EXPIRADA = 'EXPIRADA', 'Expirada'

    doctor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='recetas_doctor')
    paciente = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='recetas_paciente')
    cita = models.OneToOneField(Appointment, on_delete=models.SET_NULL, blank=True, null=True, related_name='receta_medica')
    diagnostico = models.TextField()
    medicamentos_json = models.JSONField(default=list, blank=True)
    requiere_control_especial = models.BooleanField(default=False)
    estado = models.CharField(max_length=20, choices=EstadoChoices.choices, default=EstadoChoices.EMITIDA)
    firma_digital_5B = models.CharField(max_length=256)
    archivo_pdf = models.FileField(upload_to='recetas_pdfs/', blank=True, null=True, verbose_name="Documento PDF de la Receta")
    fecha_emision = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Receta {self.id} - Paciente: {self.paciente.username}"


class RegistroESAS(models.Model):
    """
    Edmonton Symptom Assessment System (ESAS).
    Permite al paciente registrar diariamente la intensidad de 8 síntomas
    en una escala de 0 (sin síntoma) a 10 (máxima intensidad).
    """
    paciente = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='registros_esas'
    )
    fecha = models.DateField(auto_now_add=True)

    # 8 síntomas estándar de la escala ESAS (0-10)
    dolor = models.IntegerField(default=0, help_text="Intensidad del dolor (0-10)")
    cansancio = models.IntegerField(default=0, help_text="Nivel de cansancio (0-10)")
    nausea = models.IntegerField(default=0, help_text="Nivel de náusea (0-10)")
    depresion = models.IntegerField(default=0, help_text="Nivel de depresión (0-10)")
    ansiedad = models.IntegerField(default=0, help_text="Nivel de ansiedad (0-10)")
    somnolencia = models.IntegerField(default=0, help_text="Nivel de somnolencia (0-10)")
    apetito = models.IntegerField(default=0, help_text="Falta de apetito (0-10)")
    respiracion = models.IntegerField(default=0, help_text="Dificultad para respirar (0-10)")

    nota_adicional = models.TextField(blank=True, null=True, help_text="Observaciones adicionales del paciente")

    class Meta:
        unique_together = ('paciente', 'fecha')
        verbose_name = 'Registro ESAS'
        verbose_name_plural = 'Registros ESAS'
        ordering = ['-fecha']

    def __str__(self):
        return f"ESAS {self.paciente.username} - {self.fecha}"


@receiver(post_save, sender=RecetaMedica)
def auto_crear_recordatorios(sender, instance, created, **kwargs):
    if created:
        medicamentos = instance.medicamentos_json
        if isinstance(medicamentos, list):
            for med in medicamentos:
                nombre = med.get('nombre_medicamento', '')
                dosis = med.get('dosificacion', '')
                frecuencia = med.get('frecuencia_horas')
                dias = med.get('duracion_dias')
                
                if not nombre:
                    continue

                try:
                    frecuencia = int(frecuencia)
                except (TypeError, ValueError):
                    frecuencia = 8
                
                try:
                    dias = int(dias)
                except (TypeError, ValueError):
                    dias = 7
                
                hoy = date.today()
                fin = hoy + timedelta(days=dias)
                
                RecordatorioMedico.objects.create(
                    patient=instance.paciente,
                    nombre_medicacion=nombre,
                    dosificacion=dosis,
                    frecuencia=frecuencia,
                    inicio=hoy,
                    fin_medicamento=fin,
                    activo=True
                )
