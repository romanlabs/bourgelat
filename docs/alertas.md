# Alertas: enterarnos antes que la clínica

Sin costo y sin cuentas nuevas. No hay Sentry a propósito: sería otro proveedor
recibiendo datos, y hoy no compensa.

## Qué avisa

| Qué pasa | Quién avisa | A dónde llega |
|----------|-------------|---------------|
| La API, la base, el sitio o la app no responden | Workflow `Vigilancia` de GitHub, cada 15 minutos aprox. | Correo de GitHub a quien editó el workflow por última vez |
| Un error 500 en la API | `alertaErroresService` | `SOPORTE_EMAIL` (o soporte@bourgelat.co) |
| El servidor se cae por una falla sin atrapar | `alertaErroresService` | Igual |
| Una pantalla se rompe en el navegador | `POST /api/errores-pantalla` | Igual |

Los correos de errores se agrupan: el primero sale a los 2 minutos, luego uno cada
15 minutos como mínimo y máximo 10 al día, porque el plan gratuito de Brevo se
comparte con los códigos de verificación y los recordatorios. Superado el tope, los
errores siguen en los logs.

Ojo: GitHub puede retrasar las ejecuciones programadas, y las desactiva tras 60 días
sin actividad en el repositorio. Las notificaciones de fallos de Actions deben estar
activas en la cuenta (GitHub → Settings → Notifications → Actions).

## Qué hacer al recibir una alerta

1. Render → `bourgelat-api` → Logs → buscar `error-interno`, con la hora del correo.
2. Si la vigilancia falló, abrir la ejecución en GitHub → Actions → Vigilancia: dice
   cuál comprobación cayó. Mirar también el estado de Render.
3. Lanzar la comprobación a mano: Actions → Vigilancia → Run workflow.

## Qué no cubre

- Errores que un job atrapa y solo registra en logs (recordatorios, limpieza).
- Fallos sin error: un dato mal calculado no dispara nada.
- Errores en pantalla de quien no ha iniciado sesión o de una clínica en solo lectura.
- Errores anteriores al middleware de captura, como CORS o JSON mal formado: solo van a los logs.
- Una caída del propio Render o de Brevo puede impedir el correo de errores; por eso
  la vigilancia corre fuera, en GitHub.
