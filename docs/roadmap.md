# Roadmap Bourgelat

> Plan de suscripcion vigente: plan unico (`activo`), sin capa gratuita, prueba de
> 30 dias y facturacion electronica DIAN como add-on opcional (no incluido de
> fabrica). Fuente de verdad: `backend/src/config/planes.js`, no duplicar valores aqui.

## Fase 1. Lanzamiento privado — completada
- Autenticacion segura con cookies `httpOnly` y sin tokens persistidos en cliente.
- Login con Google (OAuth) ademas de credenciales propias.
- Respuestas de error sin exponer detalles internos del backend.
- Variables de entorno separadas para `dev`, `staging` y `prod`.
- Docker funcional para frontend, backend y PostgreSQL local.
- Backups definidos y restauracion probada al menos una vez.
- Flujo base estable y ampliado: registro/onboarding, login, dashboard, pacientes,
  agenda, historias, antecedentes, inventario (productos, servicios, compras),
  finanzas (venta, gastos y rentabilidad, turnos de caja), usuarios y auditoria.
- Monitoreo minimo de errores y logs.

## Fase 2. Piloto serio — en curso
- Validacion con clinica(s) reales en produccion (feedback activo desde julio 2026).
- Onboarding guiado y material minimo de uso.
- Revision de UX en modulos administrativos de mayor uso.
- Pruebas de permisos por rol y aislamiento por clinica.
- Rendimiento aceptable en consultas frecuentes y dashboards.
- Soporte de incidentes y checklist operativo.
- Pendiente: onboarding fiscal fase 2 (perfil fiscal en Configuracion: razon
  social, DV, responsabilidad IVA, municipio DIAN, CIIU) antes de activar el
  add-on DIAN a clientes reales.

## Fase 3. Produccion paga
- Dominio `bourgelat.co` conectado con Cloudflare — hecho.
- Hosting productivo con HTTPS, despliegue repetible y base de datos gestionada — hecho (Render).
- Backups automaticos, restauracion y politicas de secretos.
- Monitoreo de salud, errores y alertas basicas.
- Plan unico con precio y periodo de prueba claros, comunicacion comercial consistente.
- Facturacion electronica (DIAN) ofrecida como add-on opcional, presentada al
  usuario como beneficio de plan y no como complejidad tecnica; el plan base
  (v1) no la incluye por defecto.
- Hardening de superadmin (2FA o IP allowlist) antes de escalar clientes pagando.

## Fase 4. Escalado
- Suite de pruebas automatizadas para auth, permisos, facturacion y multi-clinica.
- Refactor de archivos grandes hacia modulos mas pequenos.
- Observabilidad mas completa con metricas y trazabilidad.
- Mejoras de soporte, analitica de producto y retencion.
- Roadmap comercial y operativo basado en uso real.
