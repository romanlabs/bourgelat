# Cifrado de datos — Recomendaciones operativas

> Complemento de `secrets-rotation.md`. Ese documento describe el procedimiento
> de rotación; este recoge las recomendaciones para **no perder datos** por una
> clave retirada antes de tiempo, y los hallazgos pendientes de corregir.
>
> Contexto técnico: `backend/src/config/crypto.js` (AES-256-GCM + keyring
> versionado + blind index) y `backend/src/config/modelEncryption.js` (hooks
> Sequelize). Script de rotación: `backend/src/scripts/rotarCifrado.js`.

## Regla de oro

**Si un ciphertext referencia una versión que ya no está en `ENCRYPTION_KEYS`,
ese dato es matemáticamente irrecuperable.** No existe recuperación posterior:
toda la operación de claves debe diseñarse alrededor de este hecho.

---

## 1. ⚠️ Corregir el script de rotación ANTES de la primera rotación

**Estado: pendiente — crítico.**

`rotarCifrado.js` no incluye las tablas `gastos` ni `abonos_factura`, aunque
sus modelos sí cifran campos (`Gasto.descripcion`; `AbonoFactura.metodoPago`
y `observaciones`). Esos modelos se agregaron después de escribir el script.

Secuencia de desastre si no se corrige:

1. Se rota de v1 a v2 y el script re-cifra todo *menos* gastos y abonos.
2. El resumen reporta "0 pendientes".
3. Se retira v1 del keyring confiando en el resumen.
4. Todos los gastos y abonos quedan ilegibles para siempre.

Fix: agregar ambas tablas al arreglo `TABLAS` del script. Al agregar cualquier
modelo nuevo con `registrarHooksCifrado(...)`, actualizar `TABLAS` en el mismo
PR — el comentario del script ya lo exige, pero no hay chequeo automático.

## 2. Nunca retirar una clave basándose solo en el resumen del script

Antes de quitar `vN` de `ENCRYPTION_KEYS`, verificar directamente contra la
base que ningún ciphertext la referencia, buscando el prefijo en **todas** las
columnas cifradas de **todas** las tablas:

```sql
-- Ejemplo por tabla/campo (repetir para cada columna cifrada):
SELECT count(*) FROM propietarios WHERE "nombre" LIKE 'v1:%';
SELECT count(*) FROM gastos WHERE "descripcion" LIKE 'v1:%';
-- ...
```

Solo cuando ninguna columna contenga el prefijo viejo es seguro retirarlo.
Idealmente, implementar esto como subcomando del script
(`npm run cifrado:verificar -- v1`) para no depender de queries manuales.

## 3. Respaldar las claves fuera de Render

`ENCRYPTION_KEYS` y `BLIND_INDEX_KEY` deben tener copia en un gestor de
secretos externo (1Password, Bitwarden, etc.), como ya indica
`secrets-rotation.md`. Si Render pierde las variables de entorno y no hay
copia, los backups de la base se vuelven decorativos.

**El backup de la base y el backup de las claves son un solo backup** — uno
sin el otro no sirve. Cada vez que se agregue una versión al keyring,
actualizar el respaldo externo en el mismo momento.

## 4. No rotar `INTEGRACIONES_SECRET` ni `JWT_SECRET` con datos legacy vivos

Los ciphertext de 3 segmentos (sin prefijo `vN:`) se descifran con la clave
derivada de `INTEGRACIONES_SECRET` (o `JWT_SECRET` como fallback). Rotar esos
secretos mientras existan datos en ese formato los destruye.

Camino seguro:

1. Configurar `ENCRYPTION_KEYS=v1:<clave>` (y `BLIND_INDEX_KEY`).
2. Correr `npm run cifrado:rotar` para migrar todo el histórico legacy a `v1:...`.
3. Verificar (punto 2) que no queda ciphertext de 3 segmentos:
   los valores legacy no tienen prefijo, así que la verificación aquí es que
   toda columna cifrada matchee `'v_%'` o esté en texto plano/NULL.
4. Solo entonces `INTEGRACIONES_SECRET` y `JWT_SECRET` quedan libres para
   rotarse por el procedimiento normal.

## 5. Retirar claves con periodo de gracia

Mantener la clave vieja en el keyring unas semanas después de que la
verificación dé 0 no cuesta nada: las claves no-activas solo se usan para
descifrar. Cubre casos límite como un backup restaurado con datos viejos o un
registro escrito por un job a mitad de la rotación.

Señal de alarma temprana: el log `Clave de cifrado 'vN' no disponible`
significa que se retiró una versión demasiado pronto. Mientras la clave no se
haya destruido, re-agregarla al keyring repara el acceso al instante —
monitorear ese mensaje tras cada retiro.

## 6. Probar la restauración, no solo el backup

Periódicamente: restaurar un backup de la base en staging usando el keyring
del respaldo externo y verificar que la PII descifra correctamente. Es la
única prueba real de que la pareja backup + claves funciona de punta a punta.

## 7. `BLIND_INDEX_KEY`: rotable solo con re-indexado inmediato

Rotar `BLIND_INDEX_KEY` **no destruye datos** (los valores cifrados siguen
legibles), pero rompe las búsquedas por índice ciego (ej. propietarios por
`numeroDocumento`) hasta correr `npm run cifrado:rotar`, que recalcula los
hashes con la clave vigente. Tratarla como rotable únicamente con re-indexado
en la misma ventana de mantenimiento.

---

## Checklist de rotación (resumen operativo)

- [ ] `TABLAS` de `rotarCifrado.js` alineado con todos los modelos que usan
      `registrarHooksCifrado` (hoy faltan `gastos` y `abonos_factura`)
- [ ] Clave nueva agregada AL FRENTE de `ENCRYPTION_KEYS`, sin retirar la vieja
- [ ] Respaldo externo de claves actualizado
- [ ] Desplegado / entorno recargado
- [ ] `npm run cifrado:rotar -- --dry-run` revisado
- [ ] `npm run cifrado:rotar` ejecutado
- [ ] Verificación directa en base: ningún ciphertext con el prefijo viejo
- [ ] Periodo de gracia (semanas) con la clave vieja aún en el keyring
- [ ] Logs sin `Clave de cifrado 'vN' no disponible`
- [ ] Retiro de la clave vieja del keyring (sin destruir el respaldo todavía)
