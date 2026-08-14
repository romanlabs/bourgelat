# Modelo de precios: plan único con prueba de 30 días

**Fecha:** 2026-08-12
**Estado:** Aprobado, pendiente de plan de implementación

---

## Problema

El modelo actual segmenta por funcionalidad: el plan Esencial (gratis, permanente) no
incluye inventario, caja, facturación ni reportes. Esto genera tres problemas:

1. **La prueba no demuestra el producto.** La clínica que se registra nunca ve el ciclo
   administrativo completo, que es justamente donde está el valor construido en los
   últimos meses.
2. **El mercado objetivo nunca convierte.** Los límites del Esencial (250 mascotas,
   2 usuarios) le alcanzan a un consultorio pequeño entre 12 y 18 meses, y los 2 usuarios
   le sobran para siempre. El cliente que más interesa es el que nunca paga.
3. **El enforcement por funcionalidad está disperso** en 15 controladores y 10 páginas de
   frontend, con cuotas numéricas que no ahorran costo real.

## Decisión

Pasar de segmentación vertical (por funcionalidad) a un **plan único con prueba temporal**.
Todas las clínicas usan todos los módulos. La facturación electrónica DIAN es el único
add-on de pago aparte.

---

## Modelo comercial

### Plan único: "Bourgelat"

| Concepto | Precio (COP) |
|---|---|
| Base mensual, 3 usuarios incluidos | $89.000 |
| Base anual (por mes, pago anticipado) | $75.000 |
| Usuario adicional | $25.000 /mes |

Incluye todos los módulos sin límite de volumen: mascotas, propietarios, citas, historias,
antecedentes, inventario, caja, facturación interna y reportes completos con exportables.
Almacenamiento de archivos: 20 GB.

### Prueba

30 días, sin tarjeta, todos los módulos desbloqueados excepto DIAN. 2 usuarios, 2 GB.

La duración de 30 días es deliberada: la clínica necesita vivir un ciclo mensual completo
—cierre de caja, cuadre de inventario, reporte del mes— para entender el valor. Los
2 usuarios permiten probar la operación real a dos manos (veterinario y auxiliar), los
roles y la trazabilidad de auditoría, que es parte de lo que justifica el precio.

### Add-on: Facturación Electrónica DIAN

| Concepto | Precio (COP) |
|---|---|
| Mensual, incluye 200 documentos | $49.000 |
| Documento excedente | $250 |

**Fuera del alcance de esta implementación.** Se deja la estructura de precios y la llave
técnica listas; en la página de planes aparece como "Próximamente". Construirlo requiere
antes el perfil fiscal de la clínica (razón social, dígito de verificación, responsabilidad
de IVA, municipio DIAN, código CIIU) — la Fase 2 de onboarding fiscal.

### Vencimiento de la prueba

Al día 31 sin pago, la cuenta pasa a **solo lectura indefinida**: puede consultar y exportar
todas sus historias, pero no crear ni editar nada. **Los datos nunca se borran ni se
archivan.**

Esta decisión es deliberada y no negociable: los datos en juego son historias clínicas.
Secuestrarlas o borrarlas tiene un costo reputacional inaceptable en un mercado que
funciona por recomendación entre colegas.

### Cuentas existentes (grandfathering)

Las clínicas ya registradas en el plan Esencial conservan acceso gratuito permanente bajo
el plan `cortesia`. Son pocas, son los early adopters y son la fuente de feedback del
producto.

---

## Diseño técnico

### Principio rector

**El plan dice qué compraste. El estado dice si puedes escribir.** Hoy "solo lectura" no
existe como concepto: al vencerse, la clínica cae al plan `inicio`, que es un plan con
menos funcionalidades. Separar plan de estado es lo que mantiene limpio el modelo nuevo.

### `backend/src/config/planes.js`

Se reduce a cuatro entradas:

| Key | Nombre | Vigencia | Usuarios | Almacenamiento | Funcionalidades |
|---|---|---|---|---|---|
| `prueba` | Prueba | 30 días | 2 | 2 GB | Todas menos DIAN |
| `activo` | Bourgelat | Según pago | 3 base | 20 GB | Todas menos DIAN |
| `cortesia` | Cortesía | 2099-12-31 | 3 | 2 GB | Todas menos DIAN |
| `personalizado` | Personalizado | Negociada | null | null | Todas menos DIAN |

Cambios respecto al archivo actual:

- `inicio`, `clinica` y `profesional` desaparecen como planes **ofrecidos**, pero no del
  esquema. Ver "ENUM de plan" más abajo.
- `limiteMascotas` deja de existir como concepto enforzado. El campo permanece en la tabla
  por compatibilidad, pero ningún código lo lee. Las mascotas, historias, citas y facturas
  internas son filas de texto: limitarlas genera fricción sin ahorrar costo.
- `facturacion_electronica` **nunca** aparece en las funcionalidades de un plan. Se agrega
  al arreglo `funcionalidades` de la fila de suscripción al comprar el add-on.
- `crearSuscripcionEsencial` se reemplaza por `crearSuscripcionPrueba`, que fija
  `fechaFin` a 30 días y `estado: 'prueba'`.

### ENUM de plan: se agrega, no se quita

`Suscripcion.plan` es un `DataTypes.ENUM(...PLAN_KEYS)` — un tipo ENUM real de Postgres —
con `defaultValue: 'inicio'`. En Postgres se pueden **agregar** valores a un ENUM, pero
quitarlos exige recrear el tipo y reescribir la columna. Hay filas de pilotos apuntando a
`inicio`, y el histórico de suscripciones vencidas debe seguir siendo legible.

Por lo tanto:

- `PLAN_KEYS` (la fuente del ENUM) queda como
  `['inicio', 'clinica', 'profesional', 'personalizado', 'prueba', 'activo', 'cortesia']`.
  Los tres primeros son **legado**: ninguna suscripción nueva los usa.
- `PLANES` (la fuente de la oferta comercial) contiene solo las cuatro entradas activas.
  Es lo que consume `PLANES_PUBLICOS`, y por lo tanto lo que ve el frontend.
- El `defaultValue` de la columna pasa de `'inicio'` a `'prueba'`.

Esta separación entre "valores que el esquema acepta" y "planes que se venden" es el punto
importante: mezclarlas es lo que obligaría a una migración destructiva.

El enum de `estado` recibe `solo_lectura` por el mismo mecanismo aditivo.

### Usuarios adicionales

`limiteUsuarios` en la fila de suscripción guarda el número **efectivo** (3, 5, 8…). El
cobro se deriva como `limiteUsuarios - 3`.

No se agrega una columna separada de "usuarios adicionales": mantener base y adicionales en
dos campos crea la posibilidad de que se desincronicen, y no aporta información que no se
pueda calcular.

### Estado `solo_lectura`

Nuevo valor en el enum de `estado` de `Suscripcion`, junto a `activa`, `prueba` y `vencida`.

`obtenerSuscripcionActivaClinica` cambia su comportamiento al detectar `fechaFin < hoy`:
en vez de crear una suscripción del plan Esencial, marca la suscripción vigente como
`solo_lectura` y la devuelve. La clínica conserva su plan y sus datos; solo pierde la
escritura.

`ESTADOS_VIGENTES` pasa a incluir `solo_lectura`, de modo que la suscripción se siga
resolviendo y el frontend pueda mostrar el estado.

### Guard de escritura: explícito, con verificación en arranque

Se agrega `requerirEscritura` en `suscripcionMiddleware.js`: si el estado de la suscripción
es `solo_lectura`, responde `403` con `code: 'SUBSCRIPTION_READ_ONLY'`.

**Se aplica explícitamente en cada router de mutación**, no como middleware global con lista
blanca. La razón es hacia dónde falla cada diseño:

- Guard global con lista blanca: olvidar una excepción deja a la clínica encerrada sin
  poder exportar sus historias. Es exactamente el escenario que el modelo busca evitar.
- Marcado explícito: olvidar una ruta permite que una clínica vencida escriba de más.
  Molesto, reversible, sin daño reputacional.

Para cubrir el olvido se replica el patrón de `tenantGuard`: **una verificación al arranque
que en desarrollo lanza error si existe una ruta POST/PUT/PATCH/DELETE sin
`requerirEscritura` ni una exención declarada explícitamente.** El sistema avisa en la
máquina del desarrollador, no en producción.

Exenciones declaradas: rutas de autenticación (login, refresh, logout, cambio de
contraseña), rutas de suscripción y pago, y rutas de exportación.

### Almacenamiento

Hoy `almacenamientoMB` existe en el modelo pero no se enforza en ningún punto del código.
Hay que implementarlo: es el único límite que corresponde a un costo real de infraestructura.

- Contador `almacenamientoUsadoMB` en `Clinica`, que sube al aceptar un archivo y baja al
  borrarlo.
- Verificación antes de aceptar cada carga (fotos de producto, adjuntos de historias).
- Al alcanzar el tope se rechaza **solo la subida**, con mensaje claro. El resto del sistema
  sigue operando: quedarse sin espacio de fotos no puede bloquear la atención clínica.

No se vende almacenamiento adicional. Un tercer SKU complicaría un pitch que acaba de
simplificarse, y una clínica que llegue a 20 GB es una clínica grande con la que ya existe
relación comercial directa.

### Gate DIAN

`requerirFuncionalidades('facturacion_electronica')` se conserva, aplicado únicamente a las
rutas de factura electrónica. `FEATURE_LABELS` se poda a esa sola entrada.

Se agrega el campo `documentosDianIncluidos` (200) a la suscripción. El consumo se cuenta
contra las facturas electrónicas emitidas en el mes en curso, sin columna de contador, para
que no pueda desincronizarse del hecho real.

### Migración

Una migración Sequelize que:

1. Agrega los valores `prueba`, `activo` y `cortesia` al enum de `plan`; `solo_lectura` al
   enum de `estado`; cambia el default de `plan` a `prueba`; y agrega
   `documentosDianIncluidos` a `Suscripcion`. Todo aditivo: no se elimina ningún valor de
   enum ni columna.
2. Agrega `almacenamientoUsadoMB` a `Clinica`, inicializado en 0.
3. Mueve las suscripciones existentes:
   - `inicio` → `cortesia`, `fechaFin: 2099-12-31`, funcionalidades completas menos DIAN,
     `limiteUsuarios: 3`, `almacenamientoMB: 2048`
   - `clinica` y `profesional` → `activo`, conservando `fechaFin`, funcionalidades completas
     menos DIAN, `limiteUsuarios` mayor entre el actual y 3
   - `personalizado` → sin cambios de plan; se actualizan funcionalidades

Ninguna cuenta pierde acceso ni datos en la migración.

### Frontend

- **`PlanesPage`**: se reescribe. Deja de ser una tabla comparativa de cuatro columnas y
  pasa a presentar un plan con su precio, el selector mensual/anual, y el add-on DIAN
  marcado como "Próximamente".
- **Banner de prueba**: indicador persistente de días restantes, visible en el shell de
  administración.
- **Banner de solo lectura**: aviso permanente con llamado a pagar y acceso directo a
  exportar los datos.
- **Páginas de módulo** (`InventarioPage`, `FinanzasPage`, `HistoriasPage`, `AgendaPage`,
  `PacientesPage`, `AntecedentesPage`, `DashboardPage`, `PacienteHistorialPage`,
  `HistoriaClinicaFormDrawer`): dejan de consultar `funcionalidades` para `inventario`,
  `facturacion_interna`, `reportes_operativos`, `reportes_completos` y `exportables` —
  todas las clínicas los tienen. Solo `FinanzasPage` conserva un chequeo, el de DIAN.
- **Estado de solo lectura**: los formularios y botones de acción se deshabilitan cuando la
  suscripción está en `solo_lectura`, con tooltip explicativo. El manejo del
  `403 SUBSCRIPTION_READ_ONLY` se centraliza en `lib/api.js`.
- **`SuperadminPage`**: refleja las nuevas keys de plan y permite otorgar cortesía.

---

## Pruebas

- `planes.js`: cada plan produce la suscripción esperada; ningún plan incluye
  `facturacion_electronica`.
- Vencimiento: una suscripción con `fechaFin` pasada pasa a `solo_lectura` conservando su
  plan, sin crear filas nuevas.
- `requerirEscritura`: bloquea mutaciones en `solo_lectura`, permite lecturas, y permite las
  rutas exentas (auth, suscripción, exportables).
- Verificación de arranque: una ruta de mutación sin marcar hace fallar el arranque en
  desarrollo.
- Cupo de usuarios: crear el usuario número `limiteUsuarios + 1` se rechaza.
- Almacenamiento: la carga que excede el tope se rechaza; el contador sube y baja
  correctamente al subir y borrar.
- Migración: las cuentas en `inicio` quedan en `cortesia` con acceso completo.

---

## Fuera de alcance

- Construcción del add-on DIAN (perfil fiscal, compra, conteo de documentos).
- Pasarela de pagos. La activación del plan `activo` sigue siendo manual vía superadmin.
- Venta de almacenamiento adicional.
