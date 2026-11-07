// Tests de los datos de `npm run demo:clinica`. Se ejecutan con
// `node src/scripts/clinicaDemoDatos.test.js` (integrados en `npm test`).

const assert = require('assert')
const { construirDatosDemo, minutos } = require('./clinicaDemoDatos')

const HOY = '2026-11-05'
const datos = construirDatosDemo(HOY)

// Citas de hoy: suficientes, dentro del horario y sin cruces.
assert.ok(datos.citas.length >= 10, 'al menos 10 citas')
for (const cita of datos.citas) {
  assert.strictEqual(cita.fecha, HOY)
  assert.ok(minutos(cita.horaInicio) >= minutos('08:00'), `${cita.key} empieza antes de las 08:00`)
  assert.ok(minutos(cita.horaFin) <= minutos('18:00'), `${cita.key} termina después de las 18:00`)
  assert.ok(minutos(cita.horaFin) > minutos(cita.horaInicio), `${cita.key} termina antes de empezar`)
}
const cruza = (a, b) => minutos(a.horaInicio) < minutos(b.horaFin) && minutos(b.horaInicio) < minutos(a.horaFin)
for (const campo of ['consultorioKey', 'veterinarioKey']) {
  datos.citas.forEach((a, i) => {
    datos.citas.slice(i + 1).forEach((b) => {
      if (a[campo] === b[campo]) assert.ok(!cruza(a, b), `${a.key} y ${b.key} se cruzan (${campo})`)
    })
  })
}
const estados = new Set(datos.citas.map((c) => c.estado))
for (const estado of ['programada', 'en_espera', 'en_atencion', 'completada']) {
  assert.ok(estados.has(estado), `falta una cita ${estado}`)
}

// Propietarios y mascotas.
assert.ok(datos.propietarios.length >= 8)
assert.ok(datos.mascotas.length >= 12)
const propietarios = new Set(datos.propietarios.map((p) => p.key))
const mascotas = new Set(datos.mascotas.map((m) => m.key))
for (const m of datos.mascotas) assert.ok(propietarios.has(m.propietarioKey), `${m.nombre} sin propietario`)
assert.strictEqual(new Set(datos.propietarios.map((p) => p.numeroDocumento)).size, datos.propietarios.length)
for (const c of datos.citas) assert.ok(mascotas.has(c.mascotaKey), `${c.key} apunta a una mascota inexistente`)
const usuarios = new Set(datos.usuarios.map((u) => u.key))
const consultorios = new Set(datos.consultorios.map((c) => c.key))
for (const c of datos.citas) {
  assert.ok(usuarios.has(c.veterinarioKey))
  assert.ok(consultorios.has(c.consultorioKey))
}

// Historias: al menos una mascota con 2 o más evoluciones.
const porMascota = {}
for (const h of datos.historias) {
  assert.ok(mascotas.has(h.mascotaKey))
  assert.ok(h.fecha <= HOY)
  porMascota[h.mascotaKey] = (porMascota[h.mascotaKey] || 0) + 1
}
assert.ok(Object.values(porMascota).some((n) => n >= 2), 'ninguna mascota con 2 evoluciones')

// Inventario: stock coherente y al menos 3 productos bajo el mínimo.
assert.ok(datos.productos.every((p) => p.stock >= 0))
assert.ok(datos.productos.filter((p) => p.stock < p.stockMinimo).length >= 3)

// Caja: ventas con varios medios de pago y totales que cuadran.
assert.ok(new Set(datos.ventas.map((v) => v.metodoPago)).size >= 4)
for (const venta of datos.ventas) {
  assert.strictEqual(venta.total, venta.items.reduce((s, i) => s + i.subtotal, 0))
}
const efectivo = datos.ventas.filter((v) => v.metodoPago === 'efectivo').reduce((s, v) => s + v.total, 0)
assert.strictEqual(datos.turnoCaja.totalVentasEfectivo, efectivo)
assert.ok(datos.movimientosCaja.length >= 2)

// Ningún correo fuera del dominio .test.
const correos = [
  datos.clinica.email,
  ...datos.usuarios.map((u) => u.email),
  ...datos.propietarios.map((p) => p.email),
]
for (const correo of correos) assert.ok(/\.test$/.test(correo), `${correo} no termina en .test`)

// Determinista: misma fecha, mismos datos.
assert.deepStrictEqual(construirDatosDemo(HOY), datos)
assert.throws(() => construirDatosDemo('hoy'))

console.log('clinicaDemoDatos.test.js: OK')
