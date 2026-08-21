# Factura desglosada de hospitalización

**Fecha:** 2026-08-20
**Estado:** Diseño aprobado, pendiente plan de implementación
**Origen:** Reporte de la clínica piloto (tía de Sergio) — no pudo cobrar un paciente hospitalizado

---

## 1. El problema

Una médica hospitalizó un paciente, registró los insumos que le aplicó en el
campo `tratamientoIntrahospitalario` de la historia clínica, y al pasar a caja
la factura salió sin nada de eso. No pudo cobrar la atención.

No fue un error de ella. El sistema hoy está construido con dos inventarios
deliberadamente separados:

| | Modelo | Dónde se registra | Qué pasa al cobrar |
|---|---|---|---|
| **Inventario clínico** | `InsumoClinico` | `historia.tratamientoIntrahospitalario` | No se factura. Se descuenta del stock y su costo se registra como `Gasto` con `origen: 'consumo_insumos'` |
| **Inventario de ventas** | `Producto` | `historia.medicamentos` (plan farmacológico) | Se factura por unidades enteras |

La preliquidación (`historiaClinicaController.js`, `obtenerPreliquidacion`) solo
arma líneas de factura a partir del plan farmacológico. El tratamiento
intrahospitalario no genera ninguna línea, por diseño: el modelo asumía que el
costo del insumo se recuperaba dentro del precio de un **servicio**.

Ahí está el hueco: **la historia clínica no tiene ninguna forma de asociar
servicios**. El propio código lo dice — *"El servicio de consulta se agrega
aparte desde el catálogo de servicios"*. Nadie le informa al cajero qué
servicios prestó la médica, así que en una hospitalización la factura llega
vacía.

## 2. Lo que pidió la clínica

Una factura tipo hospital: **desglosada línea por línea**, donde el tutor ve
qué se le hizo a su mascota y por qué paga lo que paga. Concretamente:

- El insumo aplicado como línea propia (3ml de un medicamento → $5.000)
- Los servicios prestados como líneas propias (hospitalización + aplicación de
  inyectable → $50.000)
- Los medicamentos que se lleva a casa, en **la misma factura**

## 3. Decisiones tomadas

| Decisión | Resolución | Por qué |
|---|---|---|
| ¿Una factura o dos? | **Una sola, desglosada en secciones** | Es lo que hace un hospital y lo que pidió la clínica. Un cobro, un pago, más simple cuando entre DIAN |
| ¿Cómo se fija el precio del insumo? | **Precio de venta por unidad base**, configurado en el insumo | Predecible. La médica no digita precios en consulta y el cajero no puede equivocarse |
| ¿Quién registra los servicios? | **La médica, en la historia** | Quien sabe qué se hizo es quien lo registra. El cajero solo cobra lo que ya está ahí |
| ¿Cómo se representa el insumo en la factura? | **Tipo de línea propio** (`FacturaItem.tipo = 'insumo'`) | Trazabilidad real: la línea apunta al insumo que salió del stock |
| ¿Formato de impresión? | **Dos botones al imprimir**, sin configuración previa | No obliga a nadie a entrar a Configuración; una clínica puede querer tirilla en mostrador y media hoja cuando el tutor pide algo formal |

### Alternativas descartadas

**Convertir cada insumo en una línea tipo `servicio` al vuelo.** Cambio mínimo,
sin migración, pero la factura mentiría sobre qué es cada cosa: se pierde el
vínculo con el insumo y los reportes de servicios más vendidos quedan
contaminados con nombres de medicamentos.

**Modelar la hospitalización como un `ServicioClinico` con receta.** La
infraestructura ya existe (`ServicioClinicoInsumo` define qué insumos consume
un servicio) y no requiere migraciones, pero entrega exactamente lo contrario
de lo pedido: el tutor vería "Hospitalización $55.000" y nada más. Sirve para
procedimientos estandarizados —una vacunación, una castración— donde el consumo
es siempre igual, no para una hospitalización donde cada paciente es distinto.

**Los dos mecanismos conviven.** Los servicios con receta siguen funcionando
igual; este diseño agrega el caso del insumo suelto.

## 4. Modelo de datos

Tres cambios, todos aditivos. Ninguna clínica en operación ve un cambio de
comportamiento hasta que configure precios.

### 4.1 `InsumoClinico.precioVentaUnidadBase`

```
precioVentaUnidadBase: DECIMAL(10,2), NOT NULL, default 0
  comment: 'Precio al que se le cobra al tutor una unidad base (ml, mg, dosis).
            En 0 el insumo no se factura: solo se descuenta y se registra como gasto.'
```

El default 0 es lo que hace segura la migración: el insumo sin precio se
comporta **exactamente** como hoy.

### 4.2 `FacturaItem` — nuevo tipo de línea

```
tipo: ENUM('producto', 'servicio', 'insumo')     // se agrega 'insumo'
insumoClinicoId: UUID, nullable, FK → insumos_clinicos
```

Requiere migración del tipo ENUM en PostgreSQL (`ALTER TYPE ... ADD VALUE`) y
un índice en `insumoClinicoId`, siguiendo el patrón de `servicioClinicoId`.

Hay que actualizar el comentario del modelo, que hoy afirma lo contrario:
*"Los insumos clínicos no se cobran como línea"*.

### 4.3 `HistoriaClinica.servicios`

```
servicios: JSONB, NOT NULL, default []
  // [{ servicioClinicoId, cantidad }]
  comment: 'Servicios del catálogo prestados en esta atención. Se facturan al cobrar la consulta.'
```

Mismo patrón que `medicamentos` y `tratamientoIntrahospitalario`: JSONB, no
tabla relacional, por consistencia con lo que ya existe.

## 5. El flujo diario

Esta sección es el corazón del diseño: la estructura de datos importa menos que
el hecho de que la operación diaria fluya sin fricción.

### 5.1 Consulta simple — clínica de una sola persona

La misma persona es médica y cajera (`permissions.js` ya soporta
`rolesAdicionales`). El camino no debe obligarla a cambiar de contexto:

1. Atiende y documenta la historia
2. En **Servicios prestados** selecciona "Consulta"
3. Si entrega medicamentos, los agrega al plan farmacológico
4. **Cerrar historia** → se descuentan insumos, se genera el gasto
5. **Cobrar** → el POS se abre con el carrito ya armado
6. Cobra e imprime tirilla

Los pasos 4→5 ya existen: `HistoriaClinicaFormDrawer.jsx` navega a Finanzas con
`facturarHistoriaId`, y `FinanzasPage.jsx` carga la preliquidación y abre el POS
solo. **Este trabajo no crea un flujo nuevo: llena de contenido el que ya
existe.**

### 5.2 Hospitalización

1. **Ingreso** — abre la historia y registra el motivo. La historia queda
   abierta.
2. **Durante la estancia** — a medida que aplica, agrega insumos al tratamiento
   intrahospitalario y servicios a la lista. Puede hacerlo cuantas veces
   necesite: la historia sigue editable mientras no se bloquee.
3. **Alta** — cierra la historia: se descuenta el stock de todo lo aplicado y se
   genera un gasto único por el costo total.
4. **Cobro** — el POS abre con las tres secciones. Imprime en media hoja.

**Consecuencia conocida:** el stock de insumos no se descuenta hasta el alta.
Durante una hospitalización de tres días el inventario muestra existencias que
en la práctica ya se aplicaron. Se documenta en la sección 9.

### 5.3 Precios: qué valor manda

El precio se toma **del catálogo en el momento de preliquidar**, no en el
momento de registrar en la historia. Si la clínica sube el precio de la
hospitalización el martes, un paciente ingresado el lunes se cobra al precio del
martes.

Es la regla más simple de explicar y de implementar, y el cajero siempre ve el
precio en el carrito antes de cobrar. La `FacturaItem.descripcion` guarda el
nombre como texto, así que la factura emitida queda inmutable aunque después
renombren o desactiven el insumo.

## 6. La preliquidación

`obtenerPreliquidacion` pasa de armar una sección a armar tres, **en este
orden** (de lo general a lo específico, como una factura de hospital):

**1. Servicios** — recorre `historia.servicios`, busca cada `ServicioClinico`
activo de la clínica, emite línea con `precioVenta` del catálogo.

**2. Insumos aplicados** — recorre `historia.tratamientoIntrahospitalario`,
agrupa por insumo, y emite línea con `cantidad × precioVentaUnidadBase`.
**Salta los insumos con precio 0** (siguen siendo solo costo).
La cantidad **no se redondea**: 3.5 ml se cobran como 3.5. Esto difiere de los
productos, que sí se redondean a enteros porque el inventario de ventas solo
maneja unidades completas.

**3. Medicamentos entregados** — el plan farmacológico, sin cambios respecto a
hoy.

El aviso de `productosSinStock` sigue aplicando solo a los productos: los
insumos ya salieron del stock al cerrar la historia, así que su disponibilidad
no bloquea el cobro.

## 7. Creación de la factura

`crearFactura` debe aceptar líneas `tipo: 'insumo'` con estas reglas:

- **No genera movimiento de inventario.** El insumo ya se descontó al cerrar la
  historia (`MovimientoInventarioClinico` con motivo `uso_procedimiento`). La
  línea es puramente de cobro.
- **No valida stock.** Por lo mismo.
- **Al anular la factura, no se revierte nada** del insumo. El código actual ya
  hace lo correcto: solo revierte movimientos con motivo `uso_servicio`, y
  documenta por qué — *"el medicamento ya entró al paciente y su costo quedó
  registrado como gasto"*.

### Rentabilidad

No requiere cambios. `reporteRentabilidad` calcula `ingresos − gastos`. Con
este diseño el insumo genera ingreso (la línea de factura) y costo (el gasto al
cerrar la historia). La cuenta sale correcta sola.

Queda un desfase menor de fechas: el gasto se registra el día del cierre de la
historia y el ingreso el día del cobro. Si caen en meses distintos, el margen
mensual se distorsiona. Ya ocurre hoy con el plan farmacológico; no se aborda
aquí.

## 8. Formatos de impresión

`reciboTermico.js` está bien aislado: `buildThermalReceiptHtml()` genera el HTML
y `imprimirTirilla()` lo manda a un iframe oculto. Se consume desde `PosModal` y
desde `useFinanzasHistorial`.

Se reorganiza en:

- **`buildThermalReceiptHtml()`** — la tirilla actual (`@page 80mm auto`).
  **Sin cambios de diseño**, más el agrupamiento por secciones.
- **`buildHalfSheetHtml()`** — nuevo, media carta (`@page 216mm × 140mm`).
  Encabezado con datos de la clínica, datos del paciente y del tutor, tabla de
  ítems con las tres secciones tituladas, totales, y espacio para el CUFE.
- **`imprimir({ factura, clinica, formato })`** — un solo punto de entrada.

Ambos consumen la misma función de agrupamiento de ítems, para que tirilla y
media hoja nunca muestren cosas distintas.

En la UI: dos botones donde hoy hay uno, en el POS y en el detalle de factura.

El desglose en tres secciones se luce en media hoja; en 80mm de ancho tres
secciones con títulos se ven apretadas, pero siguen siendo legibles.

## 9. Riesgos y lo que queda fuera

### El stock durante una hospitalización larga

Los insumos solo se descuentan al cerrar la historia, y **el bloqueo es de una
sola vía**. Dos consecuencias:

1. Durante una hospitalización de varios días el inventario está desactualizado.
2. Si la médica cierra la historia el día uno, no puede seguir agregando lo del
   día dos.

**No se resuelve en este trabajo.** Es un problema de diseño aparte —
probablemente consumo incremental con una historia que admita cierres
parciales— y mezclarlo aquí haría el cambio mucho más grande y riesgoso. Pero es
real y le va a pegar a la clínica piloto con el primer paciente hospitalizado
largo. Debe quedar como el siguiente ítem de la cola.

### Fuera de alcance

- Cierres parciales o consumo incremental de historias (arriba)
- Cobro por tiempo de hospitalización calculado automáticamente por horas
- Facturación electrónica DIAN de las líneas de insumo (el proyecto está en v1
  sin DIAN; cuando entre, `'insumo'` mapea a producto o servicio según lo que
  exija Factus)
- Corregir el desfase de fechas entre gasto e ingreso

## 10. Pruebas

**Backend**

- Preliquidación de una historia con servicios, insumos con precio, insumos sin
  precio y plan farmacológico → tres secciones, los insumos en 0 ausentes
- Insumo con cantidad decimal → no se redondea
- Servicio desactivado después de registrarse → no rompe la preliquidación
- Factura con línea `tipo: 'insumo'` → no genera `MovimientoInventarioClinico`
  ni valida stock
- Anular esa factura → el stock del insumo no se revierte y el gasto sigue en pie
- Historia ya facturada → sigue devolviendo 409
- Aislamiento multi-tenant: un insumo de otra clínica no se puede facturar

**Frontend**

- Sección "Servicios prestados" en la historia: agregar, quitar, cantidad
- POS con carrito precargado de tres secciones
- Los dos formatos de impresión generan HTML con las mismas líneas

**Manual**

Reproducir el caso completo de la clínica piloto: hospitalizar, aplicar
insumos, prestar servicios, entregar medicamentos, cerrar, cobrar e imprimir en
los dos formatos.
