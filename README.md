# TuSaludGT - Backend Platform

![Status](https://img.shields.io/badge/Status-Active-success)
![Framework](https://img.shields.io/badge/Framework-Django-092E20?logo=django)
![Language](https://img.shields.io/badge/Language-Python-blue?logo=python)

Plataforma backend robusta orientada a la gestión integral de salud y citas médicas, desarrollada bajo el framework **Django**. Este sistema está diseñado para facilitar la administración clínica, el control de expedientes y la agenda de profesionales de la salud.

## 🚀 Características Principales

El proyecto está estructurado modularmente con diferentes aplicaciones de Django para mantener un código limpio y escalable:

- 📅 **Appointments (Gestión de Citas)**: Módulo dedicado a la programación, cancelación y seguimiento de citas médicas. Incluye modelos detallados de duración, vistas dedicadas y serializadores para su consumo vía API.
- 🏥 **Clinical (Expediente Clínico)**: Aplicación encargada de manejar la información médica de los pacientes, historiales y diagnósticos.
- 🔗 **API_COM (Comunicaciones)**: Endpoints RESTful para la integración con sistemas front-end (web/móvil) y posibles servicios externos.
- ⚙️ **Admin Personalizado**: Panel de administración de Django configurado para gestionar fácilmente usuarios, doctores, especialidades y expedientes.
- 🤖 **Integración con Agentes IA**: Cuenta con configuraciones y flujos de trabajo (workflows) documentados bajo la carpeta `.agents`, implementando automatización y auditoría de procesos (e.g. `auditoria_recetas.md`).

## 🛠️ Tecnologías Utilizadas
- **Python 3.x**
- **Django REST Framework** (Implementado para la creación de la API web y serializadores)
- **Bases de Datos relacionales** (SQLite en desarrollo / PostgreSQL en producción)

---
- **Fecha de creación original:** 27 de Mayo de 2026
- **Fecha de actualización del README:** 18 de Agosto de 2026
