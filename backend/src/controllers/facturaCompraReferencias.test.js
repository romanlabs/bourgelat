// Tests de las reglas de referencias de la factura de compra. Se ejecutan con
// `node src/controllers/facturaCompraReferencias.test.js` (integrado en `npm test`).
// No requieren base de datos: son funciones puras.

const assert = require('assert')
const {
  clasificarReferencias,
  mensajeReferenciasInvalidas,
  referenciasSonValidas,
} = require('./facturaCompraReferencias')

const UUID_ARENA = '42cb962a-84c1-4915-a86a-c4eda9adb405'
const UUID_INMUNOMAS = 'eb708dd7-759e-4651-8f6f-494afcf8d049'
const UUID_HEPAFORTE = '8bf37925-f1a7-4d2e-84bb-872ad4bd4530'

const arenaInactiva = { id: UUID_ARENA, nombre: 'ARENA 4,5KG NATURAL', activo: false }
const inmunomasInactivo = { id: UUID_INMUNOMAS, nombre: 'INMUNOMAS', activo: false }
const arenaActiva = { ...arenaInactiva, activo: true }

// ── clasificarReferencias ──────────────────────────────────────────────────
{
  const r = clasificarReferencias({ idsSolicitados: [UUID_ARENA], filas: [arenaActiva] })
  assert.deepStrictEqual(r, { faltantes: [], inactivas: [] }, 'producto activo es valido')
  assert.strictEqual(referenciasSonValidas(r), true, 'producto activo pasa')
}

// El caso de la factura 18319: el producto se desactivo DESPUES de registrarla.
// Como ya estaba en el detalle, sigue siendo valido.
{
  const r = clasificarReferencias({
    idsSolicitados: [UUID_ARENA],
    filas: [arenaInactiva],
    idsPreexistentes: [UUID_ARENA],
  })
  assert.deepStrictEqual(r, { faltantes: [], inactivas: [] }, 'inactivo preexistente sigue valido')
  assert.strictEqual(referenciasSonValidas(r), true, 'la factura vieja se puede confirmar')
}

// Agregar un producto desactivado si es un item nuevo.
{
  const r = clasificarReferencias({ idsSolicitados: [UUID_ARENA], filas: [arenaInactiva] })
  assert.deepStrictEqual(r.faltantes, [], 'existe, no falta')
  assert.deepStrictEqual(r.inactivas, [arenaInactiva], 'inactivo nuevo se rechaza')
  assert.strictEqual(referenciasSonValidas(r), false, 'no pasa la validacion')
}

// Referencia que ya no existe en la base.
{
  const r = clasificarReferencias({ idsSolicitados: [UUID_HEPAFORTE], filas: [] })
  assert.deepStrictEqual(r.faltantes, [UUID_HEPAFORTE], 'reporta el id faltante')
  assert.deepStrictEqual(r.inactivas, [], 'no lo cuenta como inactivo')
}

// Mezcla: uno preexistente inactivo (valido) y uno nuevo inactivo (invalido).
{
  const r = clasificarReferencias({
    idsSolicitados: [UUID_ARENA, UUID_INMUNOMAS],
    filas: [arenaInactiva, inmunomasInactivo],
    idsPreexistentes: [UUID_ARENA],
  })
  assert.deepStrictEqual(r.inactivas, [inmunomasInactivo], 'solo el nuevo se rechaza')
}

// ── mensajeReferenciasInvalidas ────────────────────────────────────────────
{
  const msg = mensajeReferenciasInvalidas({ inactivas: [arenaInactiva] })
  assert.ok(msg.includes('ARENA 4,5KG NATURAL'), 'nombra el producto')
  assert.ok(!msg.includes(UUID_ARENA), 'nunca expone el UUID')
  assert.ok(/activ/i.test(msg), 'dice que hacer al respecto')
}

{
  const msg = mensajeReferenciasInvalidas({ inactivas: [arenaInactiva, inmunomasInactivo] })
  assert.ok(msg.includes('ARENA 4,5KG NATURAL') && msg.includes('INMUNOMAS'), 'lista ambos nombres')
  assert.ok(!msg.includes(UUID_ARENA) && !msg.includes(UUID_INMUNOMAS), 'sin UUIDs')
}

{
  const msg = mensajeReferenciasInvalidas({ faltantes: [UUID_HEPAFORTE] })
  assert.ok(!msg.includes(UUID_HEPAFORTE), 'el faltante tampoco expone el UUID')
  assert.ok(/producto/i.test(msg), 'habla de un producto, no de un id')
}

{
  const msg = mensajeReferenciasInvalidas({ faltantes: [UUID_ARENA, UUID_HEPAFORTE] })
  assert.ok(/productos/i.test(msg), 'usa plural con varios faltantes')
}

// Sin nombre guardado no se cae ni inventa: mensaje generico, todavia util.
{
  const msg = mensajeReferenciasInvalidas({ inactivas: [{ id: UUID_ARENA, activo: false }] })
  assert.ok(!msg.includes(UUID_ARENA), 'sin nombre sigue sin exponer el UUID')
  assert.ok(/desactivado/i.test(msg), 'explica el problema igual')
}

// Los insumos clinicos hablan su propio idioma.
{
  const msg = mensajeReferenciasInvalidas({
    inactivas: [{ id: UUID_INMUNOMAS, nombre: 'Suero fisiológico', activo: false }],
    tipo: 'insumo',
  })
  assert.ok(/insumo clínico/i.test(msg), 'nombra el tipo correcto')
  assert.ok(msg.includes('Suero fisiológico'), 'nombra el insumo')
}

// Un detalle sano no produce mensaje.
{
  assert.strictEqual(mensajeReferenciasInvalidas({}), null, 'sin problemas -> sin mensaje')
  assert.strictEqual(
    mensajeReferenciasInvalidas({ faltantes: [], inactivas: [] }),
    null,
    'listas vacias -> sin mensaje'
  )
}

console.log('facturaCompraReferencias: OK')
