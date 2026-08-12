// Tests del analizador de rutas sin proteger. Se ejecutan con
// `node src/config/escrituraGuard.test.js` (integrados en `npm test`).

const assert = require('assert')
const path = require('path')
const { analizarArchivoRutas, analizarDirectorioRutas, ARCHIVOS_EXENTOS } = require('./escrituraGuard')

// ── Detecta mutaciones sin el guard ───────────────────────────────────────
const sinGuard = `
const router = express.Router()
router.post('/', verificarToken, crearAlgo)
router.get('/', verificarToken, listarAlgo)
`
assert.deepStrictEqual(
  analizarArchivoRutas(sinGuard, 'ejemploRoutes.js'),
  [{ archivo: 'ejemploRoutes.js', metodo: 'post', ruta: '/' }],
  'POST sin guard debe reportarse y GET debe ignorarse'
)

// ── No reporta lo que si esta protegido ───────────────────────────────────
const conGuard = `
router.post('/', verificarToken, requerirEscritura, crearAlgo)
router.put('/:id', verificarToken, requerirEscritura, editarAlgo)
router.delete('/:id', verificarToken, requerirEscritura, borrarAlgo)
router.patch('/:id/x', verificarToken, requerirEscritura, parcharAlgo)
`
assert.deepStrictEqual(analizarArchivoRutas(conGuard, 'ok.js'), [])

// ── Cubre cadenas multilinea ──────────────────────────────────────────────
// El estilo real del proyecto parte las rutas en varias lineas.
const multilinea = `
router.post(
  '/',
  verificarToken,
  verificarRol('admin'),
  [ body('nombre').notEmpty(), validar ],
  crearAlgo
)
`
assert.deepStrictEqual(
  analizarArchivoRutas(multilinea, 'multi.js'),
  [{ archivo: 'multi.js', metodo: 'post', ruta: '/' }],
  'debe analizar cadenas partidas en varias lineas'
)

const multilineaProtegida = `
router.post(
  '/',
  verificarToken,
  requerirEscritura,
  crearAlgo
)
`
assert.deepStrictEqual(analizarArchivoRutas(multilineaProtegida, 'multi-ok.js'), [])

// ── Los archivos exentos se declaran explicitamente ───────────────────────
assert.ok(ARCHIVOS_EXENTOS.includes('authRoutes.js'), 'auth debe seguir operando vencido')
assert.ok(ARCHIVOS_EXENTOS.includes('suscripcionRoutes.js'), 'debe poder pagar para reactivarse')

// ── El repositorio real esta limpio ───────────────────────────────────────
// Esta es la comprobacion que importa: si alguien agrega una ruta de mutacion
// sin marcarla, este test falla.
const pendientes = analizarDirectorioRutas(path.join(__dirname, '..', 'routes'))
assert.deepStrictEqual(
  pendientes,
  [],
  `rutas de mutacion sin requerirEscritura:\n${pendientes
    .map((r) => `  ${r.metodo.toUpperCase()} ${r.ruta} (${r.archivo})`)
    .join('\n')}`
)

console.log('escrituraGuard.test.js: todos los tests pasaron ✔')
