# Rotacion de secretos para Bourgelat

## Dos familias de secretos, dos reglas distintas

| Familia | Variables | Si se pierden/rotan mal |
|---|---|---|
| Sesiones | `JWT_SECRET`, `JWT_REFRESH_SECRET` | Solo se invalidan las sesiones activas; los usuarios vuelven a iniciar sesion. Rotables sin riesgo. |
| Datos cifrados | `ENCRYPTION_KEYS`, `BLIND_INDEX_KEY` | La PII cifrada queda **irrecuperable**. Rotacion solo con el procedimiento de abajo. |

`INTEGRACIONES_SECRET` es transicional: mientras `ENCRYPTION_KEYS` no este configurado,
el cifrado deriva su clave de el (modo legacy) y **no debe rotarse**. Una vez migrado el
ciphertext al keyring (paso "Adopcion inicial"), vuelve a ser rotable como los de JWT.

## Secretos que debes cambiar antes de produccion

- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `INTEGRACIONES_SECRET`
- `ENCRYPTION_KEYS` y `BLIND_INDEX_KEY`
- Credenciales de base de datos
- Credenciales de Factus de produccion

## Reglas

- Nunca reutilizar secretos de desarrollo en produccion.
- Nunca subir secretos reales al repositorio.
- Guardarlos solo en el panel seguro del proveedor (Render).
- **Excepcion**: `ENCRYPTION_KEYS` y `BLIND_INDEX_KEY` deben ademas respaldarse en un
  gestor de contrasenas del equipo. Son los unicos secretos cuya perdida es irreversible.
- Generar valores con `npm run secrets:generate` dentro de `backend`.

## Cifrado de PII: como funciona el keyring

`ENCRYPTION_KEYS` contiene una o mas claves con version: `v2:clave,v1:clave`.
La **primera** es la activa (cifra todo lo nuevo); las demas solo descifran datos
historicos. Cada valor cifrado lleva el prefijo de su version (`v1:...`), asi que
siempre es verificable que clave necesita.

`BLIND_INDEX_KEY` alimenta el HMAC de los indices ciegos (busquedas por numero de
documento). A diferencia del keyring **no es rotable de forma casual**: cambiarla exige
re-indexar todo con `npm run cifrado:rotar`, y mientras tanto las busquedas por
documento pueden fallar. Rotarla solo ante un compromiso real de la clave.

### Adopcion inicial (migrar desde el modo legacy)

1. Generar valores: `npm run secrets:generate`.
2. Configurar `ENCRYPTION_KEYS=v1:<clave>` y `BLIND_INDEX_KEY=<clave>` en Render
   (y respaldarlas en el gestor de contrasenas).
3. Desplegar. Los datos legacy (sin prefijo de version) siguen leyendose con la clave
   derivada de `INTEGRACIONES_SECRET`; lo nuevo se cifra ya como `v1:`.
4. Correr `npm run cifrado:rotar` (primero con `--dry-run` para revisar el alcance).
5. Cuando el resumen reporte 0 pendientes, `INTEGRACIONES_SECRET` vuelve a ser rotable.

### Rotar la clave de cifrado (ej. de v1 a v2)

1. Generar una clave nueva y **agregarla AL FRENTE** del keyring, sin retirar la vieja:
   `ENCRYPTION_KEYS=v2:<clave-nueva>,v1:<clave-vieja>`
2. Desplegar. Todo lo nuevo se cifra con `v2`; lo viejo se sigue leyendo con `v1`.
3. Correr `npm run cifrado:rotar` para recifrar el historico a `v2`.
4. Solo cuando el script confirme que no queda ciphertext `v1`, retirar `v1` del keyring.

**Regla de oro: una version solo sale del keyring cuando ningun dato la referencia.**
Si la app loguea `Clave de cifrado 'vN' no disponible`, se retiro una version demasiado
pronto: restaurarla en la variable y repetir la rotacion.

## Donde los usaras

- Render: variables del servicio backend (`ENCRYPTION_KEYS` y `BLIND_INDEX_KEY` estan
  como `sync: false` en `render.yaml`: se ingresan a mano, nunca se autogeneran).
- Cloudflare: solo configuracion de DNS/seguridad, no secretos de app salvo
  automatizaciones futuras.
