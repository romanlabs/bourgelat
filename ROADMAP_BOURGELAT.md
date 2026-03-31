# Roadmap Bourgelat

## Fase 1. Lanzamiento privado
- Autenticacion segura con cookies `httpOnly` y sin tokens persistidos en cliente.
- Respuestas de error sin exponer detalles internos del backend.
- Variables de entorno separadas para `dev`, `staging` y `prod`.
- Docker funcional para frontend, backend y PostgreSQL local.
- Backups definidos y restauracion probada al menos una vez.
- Flujo base estable: registro, login, dashboard, pacientes, agenda, historias y caja.
- Monitoreo minimo de errores y logs.

## Fase 2. Piloto serio
- Validacion con 1 a 3 clinicas reales.
- Onboarding guiado y material minimo de uso.
- Revision de UX en modulos administrativos de mayor uso.
- Pruebas de permisos por rol y aislamiento por clinica.
- Rendimiento aceptable en consultas frecuentes y dashboards.
- Soporte de incidentes y checklist operativo.

## Fase 3. Produccion paga
- Dominio `bourgelat.co` conectado con Cloudflare.
- Hosting productivo con HTTPS, despliegue repetible y base de datos gestionada.
- Backups automaticos, restauracion y politicas de secretos.
- Monitoreo de salud, errores y alertas basicas.
- Planes claros y comunicacion comercial consistente.
- Facturacion electronica presentada al usuario como beneficio de plan, no como complejidad tecnica.

## Fase 4. Escalado
- Suite de pruebas automatizadas para auth, permisos, facturacion y multi-clinica.
- Refactor de archivos grandes hacia modulos mas pequenos.
- Observabilidad mas completa con metricas y trazabilidad.
- Mejoras de soporte, analitica de producto y retencion.
- Roadmap comercial y operativo basado en uso real.
