---
description:  Antigravity Customization: TUSALUDgt Auto-Build Specification
---



## 1. Contexto del Espacio de Trabajo Actual
- **Backend:** Ubicado en la carpeta `pythonap/`. Proyecto Django llamado `config`. Base de datos PostgreSQL `tusaluddgt_db`. Las apps `users`, `appointments`, `hospitals`, `doctores`, y `api_com` ya existen físicamente pero algunas no están registradas en `INSTALLED_APPS`.
- **Frontend:** Ubicado en la carpeta `reactp/app-tusaludgt/`. Configurado con Vite, TypeScript y Tailwind CSS v4. Conexión básica probada en `App.tsx` apuntando a `/saludo/`.

## 2. Reglas Globales de Codificación (Coding Rules)
- **DRF Avanzado:** Toda la API debe usar `ModelViewSet` de Django REST Framework para habilitar automáticamente los CRUDs.
- **Seguridad:** Configurar `rest_framework_simplejwt` para autenticación por tokens. Proteger los endpoints sensibles y permitir acceso público solo a `/api/hospitals/` y `/api/chat/`.
- **Frontend Limpio:** Mantener TypeScript estricto. Estructurar el frontend en `/components`, `/pages` y `/services`. Usar `axios` para peticiones de red y `react-router-dom` para el enrutamiento.

## 3. Flujo de Trabajo Secuencial (Workflow)
Ejecuta las siguientes fases de forma consecutiva y autónoma. Resuelve los errores de dependencias o compilación que surjan en la terminal antes de pasar a la siguiente fase.

### Fase 1: Sincronización y Activación del Backend
1. Modifica `pythonap/config/settings.py` e incluye `doctores`, `rest_framework` y `rest_framework_simplejwt` en `INSTALLED_APPS`.
2. Configurar la autenticación JWT por defecto en la variable `REST_FRAMEWORK`.
3. Crear `serializers.py` en las aplicaciones `users`, `appointments`, `hospitals` y `doctores` mapeando todos los campos de sus modelos actuales.
4. En los `views.py` de cada app, implementar los `ModelViewSet` correspondientes.
5. Configurar un `DefaultRouter` en `pythonap/config/urls.py` bajo el prefijo `api/` para exponer todos los endpoints de los modelos.
6. Ejecutar en la terminal: `python manage.py makemigrations` y `python manage.py migrate`.

### Fase 2: Endpoint del Agente de Asistencia
1. En `pythonap/api_com/views.py`, crear una vista `chat_asistente` (POST) que reciba `{ "mensaje": "..." }`.
2. Hacer que devuelva una respuesta JSON simulada, empática y clara orientada a pacientes de cuidados paliativos.
3. Registrar la ruta en `urls.py` como `api/chat/`.

### Fase 3: Construcción y Conexión del Frontend (React)
1. Ejecutar en la terminal de la app de React la instalación de: `react-router-dom`, `axios`, `react-leaflet` y `leaflet`.
2. En `src/services/api.ts`, configurar la instancia global de Axios apuntando a `http://localhost:8000/api/`.
3. Crear las siguientes vistas en `src/pages/` usando componentes estilizados con Tailwind v4:
   - `/login`: Formulario que capture credenciales y guarde el JWT Token.
   - `/dashboard`: Panel que liste el perfil del paciente y consuma sus `RecordatorioMedico`.
   - `/citas`: Interfaz para listar, agendar y cancelar citas (`Appointment`).
   - `/hospitales`: El "Waze de hospitales". Renderizar un mapa de Leaflet con los marcadores de `/api/hospitals/` y un botón rojo de emergencia que muestre el teléfono 911 GT del hospital.
4. Crear en `src/components/ChatAsistente.tsx` un widget de chat flotante visible en el Dashboard que interactúe con el endpoint de la API.
5. Reestructurar `src/App.tsx` y `src/main.tsx` para implementar el `BrowserRouter` y orquestar todas estas páginas.