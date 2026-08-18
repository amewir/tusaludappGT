# Auditoría de Lógica de Recetas y Tratamientos Médicos - TUSALUDgt

Este documento detalla los hallazgos de la auditoría de código en el backend y frontend de TUSALUDgt acerca de la funcionalidad de recetas, prescripciones, tratamientos e historial médico, junto con una propuesta de diseño para la implementación de este módulo.

---

## 1. Auditoría de Archivos del Backend (`pythonap/`)

Se analizaron las aplicaciones `users`, `doctores` y `appointments` en busca de modelos, serializadores, vistas, referencias o comentarios vinculados con la gestión de tratamientos y recetas.

### A. Aplicación `users`
* **Modelo Encontrado:** `RecordatorioMedico` en `pythonap/users/models.py`.
  - **Campos:** 
    * `patient` (ForeignKey a `User` con `related_name='medications'`).
    * `nombre_medicacion` (CharField, máx 150).
    * `dosificacion` (CharField, máx 100 - Ej: "500mg, 1 tableta").
    * `frecuencia` (IntegerField - Horas entre tomas).
    * `inicio` (DateField).
    * `fin_medicamento` (DateField, opcional).
    * `activo` (BooleanField, por defecto `True`).
  - **Análisis:** Funciona únicamente como un control del lado del paciente para recordarle cuándo tomar sus medicinas en el Dashboard. No está vinculado a un doctor específico que lo haya recetado, no almacena un diagnóstico ni cuenta con una firma digital institucional.
* **Serializador:** `RecordatorioMedicoSerializer` expone todos los campos del modelo y añade el campo de solo lectura `patient_name`.
* **Vista:** `RecordatorioMedicoViewSet` es un `ModelViewSet` básico que permite operaciones CRUD sobre los recordatorios de medicamentos.

### B. Aplicación `doctores`
* **Modelo Encontrado:** `DoctorProfile` en `pythonap/doctores/models.py`.
  - **Campos:** `user` (OneToOneField a `User`), `licencia`, `especialidad`, `dpi`, `birth_date`, `emergency_name` y `emergency_contact`.
  - **Análisis:** Es puramente un perfil de datos del médico. No existe ninguna tabla de recetas, historial clínico, ni campos que guarden relación con prescripciones.
* **Serializador y Vista:** `DoctorProfileSerializer` y `DoctorProfileViewSet` solo administran la información del perfil del médico.

### C. Aplicación `appointments`
* **Modelo Encontrado:** `Appointment` en `pythonap/appointments/models.py`.
  - **Campos:** `paciente` (FK a `User`), `doctor` (FK a `User`), `hospital` (FK a `Hospital`), `cita_fecha`, `estado` (PENDIENTE, CONFIRMADA, CANCELADA, COMPLETADA), `tipo` (PRESENCIAL, TELEMEDICINA), `enlace_virtual` y `razon_cancelado`.
  - **Análisis:** Sirve para agendar la cita. Al completar una cita (`estado = 'COMPLETADA'`), no se desencadena ninguna lógica para emitir una receta ni se asocian notas de la consulta en este modelo.

---

## 2. Auditoría del Frontend (`reactp/app-tusaludgt/`)

Se inspeccionaron las páginas en `src/pages/` y componentes en `src/components/`.

### A. Vista del Médico (`src/pages/Dashboard.tsx`)
* **Estado Actual:**
  - Si el rol de usuario es `'doctor'`, el Dashboard renderiza la **Agenda de Consultas Asignadas** en una tabla que filtra las citas correspondientes a su `user_id`.
  - La tabla muestra: ID de cita, Nombre del Paciente, Fecha/Hora, Hospital, Modalidad y Estado.
  - Ofrece dos botones de acción rápida: **Completar** (cambia el estado de la cita a `'COMPLETADA'`) y **Cancelar** (cambia el estado de la cita a `'CANCELADA'`).
* **Análisis de Oportunidades en UI:**
  - No hay ningún formulario, campo de texto o botón para que el médico redacte notas clínicas, recetas de medicamentos ni adjunte firmas.
  - Se puede aprovechar el evento de clic en el botón **Completar** de la cita para abrir un Modal que permita al médico ingresar el tratamiento y firmarlo antes de cambiar el estado de la consulta a "Completada".

---

## 3. Propuesta de Diseño Técnico (Nuevo Módulo de Recetas)

Para cumplir con las regulaciones de salud y mantener el flujo automatizado del portal, se propone el siguiente diseño técnico:

### A. Modelo de Receta Médica (`Prescripcion`)
Proponemos crear una nueva aplicación Django (`prescriptions`) o agregar el modelo a la aplicación `clinical` indicada en los lineamientos:

```python
# pythonap/clinical/models.py

from django.db import models
from django.conf import settings
from appointments.models import Appointment

class RecetaMedica(models.Model):
    doctor = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='recetas_emitidas'
    )
    paciente = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='recetas_recibidas'
    )
    cita = models.OneToOneField(
        Appointment, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='receta'
    )
    diagnostico = models.TextField(verbose_name="Diagnóstico Clínico")
    medicamento = models.CharField(max_length=150, verbose_name="Nombre del Medicamento")
    dosis = models.CharField(max_length=100, help_text="Ej: 500mg - 1 tableta")
    frecuencia_horas = models.IntegerField(help_text="Frecuencia en horas para tomas")
    duracion_dias = models.IntegerField(help_text="Duración total del tratamiento en días")
    indicaciones = models.TextField(blank=True, null=True, verbose_name="Indicaciones especiales")
    
    # Campo requerido para validez en Gob. Abierto (Firma Digital 5B)
    firma_digital_5B = models.CharField(
        max_length=256, 
        help_text="Código hash SHA-256 de la firma digital autorizada del médico"
    )
    fecha_emision = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Receta #{self.id} - Dr. {self.doctor.last_name} para {self.paciente.last_name}"
```

### B. Automatización e Integración (Trigger del Backend)
* **Generación Automática del Recordatorio:** Al guardar una nueva `RecetaMedica`, mediante una señal de Django (`post_save`) o en el método `perform_create` del ViewSet, se creará automáticamente un registro en `RecordatorioMedico` para el paciente. 
* Esto asegura que el paciente vea las instrucciones de dosificación y frecuencia en su dashboard de manera inmediata sin que el médico tenga que registrar la información dos veces.

### C. Nuevos Endpoints Necesarios
1. `GET /api/recetas/`:
   - Pacientes: Solo ven las recetas emitidas para ellos.
   - Médicos: Ven todas las recetas que han emitido.
2. `POST /api/recetas/`:
   - Permitido únicamente a usuarios con rol `doctor`. Requiere validación de la firma digital (SHA-256 no vacío).
3. `GET /api/recetas/<id>/pdf/`:
   - Generación en PDF institucional de la receta médica con logo de TUSALUDgt y código QR de validación de firma digital 5B.

### D. Flujo de UI del Médico Sugerido (React)
1. El médico entra a su Dashboard.
2. Al hacer clic en **"Completar"** en la tabla de citas, en lugar de realizar el PATCH directo, se abre un modal de Glassmorphic llamado **"Finalizar Consulta e Emitir Receta"**.
3. El modal contendrá campos para:
   - Diagnóstico
   - Medicamento
   - Dosificación
   - Frecuencia (horas)
   - Duración (días)
   - Firma Digital (código o simulación de token de firma electrónica del MINSAL/Contraloría 5B).
4. Al hacer clic en **"Firmar y Completar"**, el frontend enviará una petición `POST` a `/api/recetas/` y un `PATCH` a `/api/appointments/<id>/` para cambiar el estado a `COMPLETADA`.
