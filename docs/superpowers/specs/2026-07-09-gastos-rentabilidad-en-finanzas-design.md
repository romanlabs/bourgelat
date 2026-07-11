# Integrar Libro mayor como pestaña "Gastos y rentabilidad" en Finanzas

Fecha: 2026-07-09
Rama: `feat/ciclo-administrativo-gastos-fiado`

## Contexto

`AdministracionPage.jsx` (ruta `/administracion`, "Libro mayor") implementa gastos del
negocio, cuentas por cobrar (fiado) y reporte de rentabilidad con una dirección de diseño
propia tipo cuaderno contable (papel verde, tinta, doble subrayado) que no comparte tokens
con el resto de la app. El resto de módulos, incluyendo `FinanzasPage.jsx` ("Caja y
facturación"), usa el sistema de diseño estándar: `KpiCard`, `DataTable`, `DashboardPanel`,
`StatusPill`, tokens `bg-card` / `border-border` / `text-foreground`, tabs con
`border-primary`.

Se decidió eliminar la página separada y mover su funcionalidad a una nueva pestaña dentro
de Finanzas, con el lenguaje visual estándar.

## Alcance

- Nueva pestaña **"Gastos y rentabilidad"** en `FinanzasPage.jsx`, junto a Resumen / Venta /
  Turnos de caja / Historial.
- Vista única (sin sub-pestañas):
  1. Fila de KPIs (`KpiCard`): Ingresos del mes, Gastos del mes, Ganancia/Pérdida (tono
     verde si positiva, rojo si negativa), Total por cobrar (fiado).
  2. Panel "Gastos del negocio" (`DashboardPanel` + `DataTable`): formulario de registro de
     gasto (categoría, concepto, valor, método de pago) + tabla de gastos del periodo con
     acción "Anular". Selector de periodo (mes) en el header del panel.
  3. Panel "Cuentas por cobrar" (`DashboardPanel` + `DataTable`): tabla de clientes con
     deuda, expandible por fila para ver facturas pendientes y registrar abono.
- Los hooks (`useGastos`, `useCrearGasto`, `useAnularGasto`, `useCuentasPorCobrar`,
  `useRegistrarAbono`, `useRentabilidad`) y `administracionApi.js` se mueven de
  `features/administracion/` a `features/finanzas/` sin cambios de lógica — solo se
  reescribe la capa visual (los componentes de `AdministracionPage.jsx`).
- Se elimina `AdministracionPage.jsx`, la ruta `/administracion` en `router/index.jsx`, y el
  link correspondiente en el sidebar (`AdminShell.jsx`).
- Los estilos ad-hoc de "Libro mayor" en `frontend/src/index.css` (si los hay, ligados solo
  a esa página) se retiran junto con la página.

## Fuera de alcance

- No se cambia la lógica de negocio del backend (`gastoController`, `reporteController`,
  endpoints de abono) — es puramente frontend.
- No se agregan sub-pestañas internas ni se reorganiza el resto de tabs de Finanzas.
- No se toca el módulo de inventario clínico ni tenant guard (trabajo ya mergeado en
  `main` por separado).

## Detalle por sección

### KPIs
Reutilizar `useRentabilidad(periodo)` para ingresos/gastos/ganancia, y
`useCuentasPorCobrar()` para el total por cobrar. Mismo patrón que el tab Resumen: grid
`xl:grid-cols-4` con `KpiCard` (icon, label, value, helper, tone).

### Panel de gastos
- Selector de periodo tipo `<input type="month">` en el header del panel (como hoy en
  `AdministracionPage`), controlado por estado local de la pestaña.
- Formulario de alta: mismos campos y validación que `AsientoNuevo` actual, pero con
  inputs/selects del sistema estándar (`border border-border bg-card`, no el estilo
  subrayado del ledger).
- Tabla de gastos vía `DataTable`: columnas fecha, categoría, descripción, método de pago,
  monto (formateado con `formatCurrency`, rojo si es egreso vía color de texto, no
  paréntesis contables), acción "Anular" (con `window.prompt` de motivo, igual que hoy).
  Filas anuladas se muestran atenuadas o con `StatusPill` "Anulado".

### Panel de cuentas por cobrar
- Tabla vía `DataTable` con clientes deudores: nombre, teléfono, fecha de la deuda más
  antigua, total adeudado.
- Cada fila expandible (mismo patrón `FilaDeudor` actual, restilizado) mostrando facturas
  pendientes del cliente con input de monto + select de método de pago + botón "Registrar
  abono", usando estilos estándar de formulario (igual que el bloque "Registrar pago" que ya
  existe en el detalle de factura del tab Historial).

## Testing / verificación

- Verificar en navegador: abrir la pestaña, registrar un gasto, anularlo, registrar un abono
  a una factura de fiado, y confirmar que los KPIs se refrescan (React Query invalidation ya
  cubre esto vía los hooks existentes).
- Confirmar que `/administracion` ya no existe como ruta (redirige o da 404 controlado del
  router) y que el sidebar no muestra el link.
