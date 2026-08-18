---
trigger: always_on
---

Reglas de Desarrollo para TUSALUDgt

## Stack Tecnológico Obligatorio
- **Backend:** Python 3, Django, Django REST Framework, base de datos PostgreSQL.
- **Frontend:** React estructurado con Vite, Tailwind CSS para los estilos.

## Estructura de Módulos (Backend Django)
Debes crear y configurar las siguientes aplicaciones de Django con sus respectivos modelos:
1. `users`: Modelo personalizado extendiendo `AbstractUser` con roles (PACIENTE, MEDICO, SOPORTE, ADMIN) y perfil de paciente (DPI, fecha de nacimiento, contacto de emergencia, latitud, longitud).
2. `hospitals`: Modelo Hospital (nombre, dirección, latitud, longitud, teléfono de emergencia '911 GT', bandera de unidad paliativa).
3. `appointments`: Modelo Citas (paciente, médico, hospital, fecha y hora, estado, tipo presencial/telemedicina).
4. `clinical`: Historial clínico y modelo `MedicationReminder` (con frecuencia en horas).
5. `procedures`: Modelo `ProcedureRequest` para seguimiento de trámites administrativos de salud.

## Lineamientos de Código
- Toda la API de Django debe exponerse usando `ModelViewSet` de DRF para maximizar la velocidad de desarrollo.
- Implementa autenticación basada en JWT utilizando `djangorestframework-simplejwt`.
- El frontend debe consumir los endpoints en `http://localhost:8000/api/`.
- Mantén el código modular, bien comentado y bajo la guía de estilo PEP 8.