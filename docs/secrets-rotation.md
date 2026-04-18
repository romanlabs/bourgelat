# Rotacion de secretos para Bourgelat

## Secretos que debes cambiar antes de produccion
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `INTEGRACIONES_SECRET`
- Credenciales de base de datos
- Credenciales de Factus de produccion

## Regla
- Nunca reutilizar secretos de desarrollo en produccion.
- Nunca subir secretos reales al repositorio.
- Guardarlos solo en el panel seguro del proveedor.

## Recomendacion simple
- Generar secretos largos aleatorios de al menos 64 caracteres.
- Usar un secreto distinto para cada variable.
- Puedes generarlos con `npm run secrets:generate` dentro de `backend`.

## Dondelos usaras
- Render: variables del servicio backend
- Cloudflare: solo configuracion de DNS/seguridad, no secretos de app salvo automatizaciones futuras
