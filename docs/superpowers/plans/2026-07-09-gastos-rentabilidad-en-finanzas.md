# Gastos y Rentabilidad en Finanzas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the standalone "Libro mayor" page (`/administracion`) with a "Gastos y rentabilidad" tab inside `FinanzasPage.jsx`, restyled with the app's standard design system instead of the bespoke ledger look.

**Architecture:** Move the existing data-layer files (`administracionApi.js`, `useAdministracion.js`) from `features/administracion/` to `features/finanzas/` unchanged. Build a new single-file UI component (`GastosRentabilidadPanel.jsx`) that renders KPIs + a gastos table + a cuentas-por-cobrar list using the shared `dashboardComponents` (`KpiCard`, `DashboardPanel`, `DataTable`, `StatusPill`). Wire it into `FinanzasPage.jsx` as a fifth tab. Delete the old page, route, and sidebar entry.

**Tech Stack:** React 19, React Query (existing hooks, unchanged), Tailwind CSS with the app's `bg-card`/`border-border`/`text-foreground` tokens, `lucide-react` icons.

## Global Constraints

- No backend changes — `gastoController`, `reporteController`, and the abono/cuentas-por-cobrar endpoints stay exactly as-is.
- Reuse `useGastos`, `useCrearGasto`, `useAnularGasto`, `useCuentasPorCobrar`, `useRegistrarAbono`, `useRentabilidad` and `administracionApi` verbatim — only their file location changes.
- New UI must use the same visual language as the rest of `FinanzasPage.jsx` (rounded-[28px] cards, `border-border`, `bg-card`, `KpiCard`, `DataTable`, `StatusPill`) — no bespoke ledger styling (no `IBM Plex Mono`, no green-paper/double-underline treatment).
- No automated test framework covers pages/features in this codebase (only a few isolated unit tests exist for `lib/`); verification for this plan is manual in-browser, per existing project convention.
- Money formatting via `formatCurrency` from `@/features/dashboard/dashboardUtils` (already used throughout `FinanzasPage.jsx`).

---

### Task 1: Move the gastos/fiado/rentabilidad data layer into `features/finanzas/`

**Files:**
- Move: `frontend/src/features/administracion/administracionApi.js` → `frontend/src/features/finanzas/administracionApi.js`
- Move: `frontend/src/features/administracion/useAdministracion.js` → `frontend/src/features/finanzas/useAdministracion.js`

Both files import each other by relative path (`./administracionApi`), so no import rewriting is needed inside them — only the directory changes.

**Interfaces:**
- Produces (used by Task 2): from `@/features/finanzas/useAdministracion` — `useGastos(filtros)`, `useCrearGasto()`, `useAnularGasto()`, `useCuentasPorCobrar()`, `useRegistrarAbono()`, `useRentabilidad(periodo)`. Same signatures as before the move (no code changes in this task).

- [ ] **Step 1: Move the two files with git so history is preserved**

```bash
git mv frontend/src/features/administracion/administracionApi.js frontend/src/features/finanzas/administracionApi.js
git mv frontend/src/features/administracion/useAdministracion.js frontend/src/features/finanzas/useAdministracion.js
```

- [ ] **Step 2: Confirm the only remaining consumer is the soon-to-be-deleted page**

```bash
grep -rn "features/administracion" frontend/src
```

Expected: only `frontend/src/pages/AdministracionPage.jsx` matches (it will be deleted in Task 4). If anything else matches, note it — it must be updated to import from `@/features/finanzas/useAdministracion` instead.

- [ ] **Step 3: Confirm the two files exist at their new path**

```bash
ls frontend/src/features/finanzas/administracionApi.js frontend/src/features/finanzas/useAdministracion.js
```

Expected: both paths print without error. (Skip a full `npm run build` here — `AdministracionPage.jsx` still imports the old path and will fail until Task 4 deletes it; that failure is expected and not a regression from this task.)

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/finanzas/administracionApi.js frontend/src/features/finanzas/useAdministracion.js frontend/src/features/administracion
git commit -m "refactor(finanzas): mover gastos/fiado/rentabilidad a features/finanzas"
```

---

### Task 2: Build the "Gastos y rentabilidad" panel with standard design tokens

**Files:**
- Create: `frontend/src/features/finanzas/GastosRentabilidadPanel.jsx`

**Interfaces:**
- Consumes: `useGastos(filtros)`, `useCrearGasto()`, `useAnularGasto()`, `useCuentasPorCobrar()`, `useRegistrarAbono()`, `useRentabilidad(periodo)` from `@/features/finanzas/useAdministracion` (Task 1). `KpiCard`, `DashboardPanel`, `DataTable`, `StatusPill` from `@/features/dashboard/dashboardComponents`. `formatCurrency` from `@/features/dashboard/dashboardUtils`.
- Produces: default export `GastosRentabilidadPanel()` — a self-contained component with no required props, used by Task 3 as the content of the new Finanzas tab.

Data shapes (from the existing backend, unchanged):
- `useGastos(filtros).data` → `{ gastos: [{ id, fecha, categoria, descripcion, monto, metodoPago, anulado }], total, totalMonto }`
- `useCuentasPorCobrar().data` → `{ clientes: [{ propietarioId, nombre, telefono, facturaMasAntigua, totalDeuda, facturas: [{ id, numero, fecha, total, saldoPendiente }] }], totalClientes, totalPorCobrar }`
- `useRentabilidad(periodo).data` → `{ totalIngresos, totalGastos, ganancia, margen }`

- [ ] **Step 1: Create the panel file**

```jsx
import { useMemo, useState } from 'react'
import { HandCoins, TrendingDown, TrendingUp, Wallet } from 'lucide-react'
import {
  DashboardPanel,
  DataTable,
  KpiCard,
  StatusPill,
} from '@/features/dashboard/dashboardComponents'
import { formatCurrency } from '@/features/dashboard/dashboardUtils'
import {
  useAnularGasto,
  useCrearGasto,
  useCuentasPorCobrar,
  useGastos,
  useRegistrarAbono,
  useRentabilidad,
} from '@/features/finanzas/useAdministracion'

const CATEGORIAS = [
  { value: 'nomina', label: 'Nómina' },
  { value: 'arriendo', label: 'Arriendo' },
  { value: 'servicios_publicos', label: 'Servicios públicos' },
  { value: 'insumos', label: 'Insumos' },
  { value: 'proveedor', label: 'Proveedor' },
  { value: 'mantenimiento', label: 'Mantenimiento' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'impuestos', label: 'Impuestos' },
  { value: 'otros', label: 'Otros' },
]

const METODOS_GASTO = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'tarjeta', label: 'Tarjeta' },
  { value: 'otro', label: 'Otro' },
]

const METODOS_ABONO = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'nequi', label: 'Nequi' },
  { value: 'daviplata', label: 'Daviplata' },
  { value: 'tarjeta_debito', label: 'Tarjeta débito' },
  { value: 'otro', label: 'Otro' },
]

const etiquetaCategoria = (value) => CATEGORIAS.find((c) => c.value === value)?.label || value
const etiquetaMetodo = (value) => METODOS_GASTO.find((m) => m.value === value)?.label || value

function rangoDelMes(mesISO) {
  const [anio, mes] = mesISO.split('-').map(Number)
  const ultimo = new Date(anio, mes, 0).getDate()
  return {
    fechaInicio: `${mesISO}-01`,
    fechaFin: `${mesISO}-${String(ultimo).padStart(2, '0')}`,
  }
}

const inputClass =
  'h-10 border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary'

function GastoForm() {
  const crearGasto = useCrearGasto()
  const [form, setForm] = useState({
    categoria: 'insumos',
    descripcion: '',
    monto: '',
    metodoPago: 'efectivo',
  })
  const [mensaje, setMensaje] = useState(null)

  const set = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }))

  const asentar = async (e) => {
    e.preventDefault()
    setMensaje(null)
    try {
      const res = await crearGasto.mutateAsync({
        ...form,
        monto: Number(form.monto),
        descripcion: form.descripcion || undefined,
      })
      setForm((f) => ({ ...f, descripcion: '', monto: '' }))
      setMensaje({ tipo: 'ok', texto: res.message })
    } catch (err) {
      setMensaje({
        tipo: 'error',
        texto: err.response?.data?.message || 'No se pudo registrar el gasto',
      })
    }
  }

  return (
    <form onSubmit={asentar} className="mb-5 grid gap-3 border border-border bg-muted p-4 sm:grid-cols-2 lg:grid-cols-[10rem_1fr_9rem_9rem_auto]">
      <label className="grid gap-1">
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Categoría</span>
        <select value={form.categoria} onChange={set('categoria')} className={inputClass}>
          {CATEGORIAS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </label>
      <label className="grid gap-1">
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Concepto</span>
        <input
          value={form.descripcion}
          onChange={set('descripcion')}
          placeholder="¿En qué se gastó?"
          maxLength={500}
          className={inputClass}
        />
      </label>
      <label className="grid gap-1">
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Valor</span>
        <input
          value={form.monto}
          onChange={set('monto')}
          type="number"
          min="1"
          step="1"
          required
          placeholder="0"
          className={`${inputClass} text-right tabular-nums`}
        />
      </label>
      <label className="grid gap-1">
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Pago</span>
        <select value={form.metodoPago} onChange={set('metodoPago')} className={inputClass}>
          {METODOS_GASTO.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
      </label>
      <div className="flex items-end">
        <button
          type="submit"
          disabled={crearGasto.isPending}
          className="h-10 w-full border border-border bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {crearGasto.isPending ? 'Registrando…' : 'Registrar gasto'}
        </button>
      </div>
      {mensaje ? (
        <p className={`sm:col-span-2 lg:col-span-5 text-sm ${mensaje.tipo === 'ok' ? 'text-emerald-700' : 'text-red-700'}`}>
          {mensaje.texto}
        </p>
      ) : null}
    </form>
  )
}

function GastosTable({ periodo, mes, onMesChange }) {
  const { data, isLoading } = useGastos(periodo)
  const anularGasto = useAnularGasto()

  const anular = async (gasto) => {
    const motivo = window.prompt(
      `Anular gasto de ${etiquetaCategoria(gasto.categoria)} por ${formatCurrency(gasto.monto)}. ¿Motivo?`
    )
    if (!motivo?.trim()) return
    try {
      await anularGasto.mutateAsync({ gastoId: gasto.id, motivoAnulacion: motivo.trim() })
    } catch (err) {
      window.alert(err.response?.data?.message || 'No se pudo anular el gasto')
    }
  }

  const rows = (data?.gastos || []).map((gasto) => ({ id: gasto.id, gasto }))

  return (
    <DashboardPanel
      title="Gastos del negocio"
      subtitle={data ? `${data.total} gastos · total ${formatCurrency(data.totalMonto || 0)} en el periodo.` : 'Registra y consulta los gastos del periodo.'}
      action={
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          Periodo
          <input
            type="month"
            value={mes}
            onChange={(e) => onMesChange(e.target.value)}
            className={inputClass}
          />
        </label>
      }
    >
      <GastoForm />
      <DataTable
        title="Historial de gastos"
        subtitle="Ordenados del más reciente al más antiguo."
        rows={isLoading ? [] : rows}
        columns={[
          {
            key: 'fecha',
            label: 'Fecha',
            render: (row) => <span className="tabular-nums">{row.gasto.fecha?.slice(5)}</span>,
          },
          {
            key: 'categoria',
            label: 'Categoría / concepto',
            render: (row) => (
              <span>
                <span className="font-semibold">{etiquetaCategoria(row.gasto.categoria)}</span>
                {row.gasto.descripcion ? <span className="text-muted-foreground"> — {row.gasto.descripcion}</span> : null}
                {row.gasto.anulado ? (
                  <span className="ml-2"><StatusPill tone="border-red-200 bg-red-50 text-red-700">Anulado</StatusPill></span>
                ) : null}
              </span>
            ),
          },
          {
            key: 'metodoPago',
            label: 'Pago',
            render: (row) => etiquetaMetodo(row.gasto.metodoPago),
          },
          {
            key: 'monto',
            label: 'Monto',
            render: (row) => (
              <span className="font-semibold tabular-nums text-red-700">
                {formatCurrency(row.gasto.monto)}
              </span>
            ),
          },
          {
            key: 'acciones',
            label: 'Acciones',
            render: (row) =>
              row.gasto.anulado ? null : (
                <button
                  type="button"
                  onClick={() => anular(row.gasto)}
                  className="text-xs font-semibold text-muted-foreground underline decoration-dotted underline-offset-2 hover:decoration-solid"
                >
                  Anular
                </button>
              ),
          },
        ]}
        emptyTitle={isLoading ? 'Cargando gastos…' : 'Sin gastos este mes'}
        emptyBody="Registra el primer gasto del periodo con el formulario de arriba."
      />
    </DashboardPanel>
  )
}

function FilaDeudor({ cliente }) {
  const [facturaAbono, setFacturaAbono] = useState(null)
  const [monto, setMonto] = useState('')
  const [metodoPago, setMetodoPago] = useState('efectivo')
  const [error, setError] = useState(null)
  const [abierto, setAbierto] = useState(false)
  const registrarAbono = useRegistrarAbono()

  const cobrar = async (factura) => {
    setError(null)
    try {
      await registrarAbono.mutateAsync({ facturaId: factura.id, monto: Number(monto), metodoPago })
      setFacturaAbono(null)
      setMonto('')
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo registrar el abono')
    }
  }

  return (
    <div className="border-b border-border last:border-b-0">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-muted/50"
      >
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-foreground">{cliente.nombre}</span>
          <span className="block text-xs text-muted-foreground">
            debe desde {cliente.facturaMasAntigua}{cliente.telefono ? ` · ${cliente.telefono}` : ''}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-3">
          <span className="font-semibold tabular-nums text-red-700">{formatCurrency(cliente.totalDeuda)}</span>
          <span aria-hidden className="text-xs text-muted-foreground">{abierto ? '▲' : '▼'}</span>
        </span>
      </button>

      {abierto ? (
        <div className="space-y-2 bg-muted/40 px-4 pb-4">
          {cliente.facturas.map((f) => (
            <div key={f.id} className="flex flex-wrap items-center gap-3 border-t border-border pt-3 text-sm">
              <span className="text-muted-foreground">#{f.numero} · {f.fecha}</span>
              <span className="text-muted-foreground">de {formatCurrency(f.total)} quedan</span>
              <span className="font-semibold tabular-nums text-red-700">{formatCurrency(f.saldoPendiente)}</span>
              {facturaAbono === f.id ? (
                <span className="flex flex-wrap items-center gap-2">
                  <input
                    autoFocus
                    type="number"
                    min="1"
                    max={f.saldoPendiente}
                    value={monto}
                    onChange={(e) => setMonto(e.target.value)}
                    placeholder="valor"
                    className={`${inputClass} h-9 w-28 text-right tabular-nums`}
                  />
                  <select
                    value={metodoPago}
                    onChange={(e) => setMetodoPago(e.target.value)}
                    className={`${inputClass} h-9`}
                  >
                    {METODOS_ABONO.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                  <button
                    type="button"
                    onClick={() => cobrar(f)}
                    disabled={registrarAbono.isPending || !monto}
                    className="h-9 border border-primary bg-primary px-3 text-xs font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Abonar
                  </button>
                  <button
                    type="button"
                    onClick={() => { setFacturaAbono(null); setMonto('') }}
                    className="text-xs text-muted-foreground underline decoration-dotted"
                  >
                    Cancelar
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => { setFacturaAbono(f.id); setMonto('') }}
                  className="text-xs font-semibold text-primary underline decoration-dotted underline-offset-2 hover:decoration-solid"
                >
                  Registrar abono
                </button>
              )}
            </div>
          ))}
          {error ? <p className="text-xs text-red-700">{error}</p> : null}
        </div>
      ) : null}
    </div>
  )
}

function CuentasPorCobrarPanel() {
  const { data, isLoading } = useCuentasPorCobrar()

  return (
    <DashboardPanel
      title="Cuentas por cobrar"
      subtitle={
        data?.totalClientes
          ? `${data.totalClientes} clientes deben ${formatCurrency(data.totalPorCobrar)} en total.`
          : 'Clientes con saldo de fiado pendiente.'
      }
    >
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Revisando deudas…</p>
      ) : !data?.clientes?.length ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted px-4 py-6">
          <p className="text-sm font-semibold text-card-foreground">Nadie debe</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">El fiado está al día.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border">
          {data.clientes.map((cliente) => (
            <FilaDeudor key={cliente.propietarioId || 'mostrador'} cliente={cliente} />
          ))}
        </div>
      )}
    </DashboardPanel>
  )
}

export default function GastosRentabilidadPanel() {
  const [mes, setMes] = useState(() => new Date().toISOString().slice(0, 7))
  const periodo = useMemo(() => rangoDelMes(mes), [mes])
  const rentabilidad = useRentabilidad(periodo)
  const cuentasPorCobrar = useCuentasPorCobrar()

  const ganancia = Number(rentabilidad.data?.ganancia || 0)
  const positiva = ganancia >= 0

  return (
    <div className="space-y-5">
      <div className="grid gap-4 xl:grid-cols-4">
        <KpiCard
          icon={Wallet}
          label="Ingresos del mes"
          value={rentabilidad.isLoading ? '—' : formatCurrency(rentabilidad.data?.totalIngresos || 0)}
          helper="Suma de ingresos del periodo seleccionado."
          tone="text-emerald-700"
        />
        <KpiCard
          icon={TrendingDown}
          label="Gastos del mes"
          value={rentabilidad.isLoading ? '—' : formatCurrency(rentabilidad.data?.totalGastos || 0)}
          helper="Suma de gastos registrados en el periodo."
          tone="text-red-700"
        />
        <KpiCard
          icon={positiva ? TrendingUp : TrendingDown}
          label={positiva ? 'Ganancia del mes' : 'Pérdida del mes'}
          value={rentabilidad.isLoading ? '—' : formatCurrency(ganancia)}
          helper={rentabilidad.data?.margen ? `Margen ${rentabilidad.data.margen} sobre ingresos.` : 'Ingresos menos gastos del periodo.'}
          tone={positiva ? 'text-emerald-700' : 'text-red-700'}
        />
        <KpiCard
          icon={HandCoins}
          label="Total por cobrar"
          value={cuentasPorCobrar.isLoading ? '—' : formatCurrency(cuentasPorCobrar.data?.totalPorCobrar || 0)}
          helper="Saldo de fiado pendiente de todos los clientes."
          tone="text-amber-700"
        />
      </div>

      <GastosTable periodo={periodo} mes={mes} onMesChange={setMes} />
      <CuentasPorCobrarPanel />
    </div>
  )
}
```

- [ ] **Step 2: Verify the file has no syntax/lint errors**

```bash
cd frontend && npx eslint src/features/finanzas/GastosRentabilidadPanel.jsx
```

Expected: no errors. Fix any unused-var warnings inline before continuing.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/finanzas/GastosRentabilidadPanel.jsx
git commit -m "feat(finanzas): panel de gastos y rentabilidad con diseno estandar"
```

---

### Task 3: Wire the new tab into `FinanzasPage.jsx`

**Files:**
- Modify: `frontend/src/pages/FinanzasPage.jsx:37` (imports), `:46-51` (TABS), `:304-352` (add render block after the Facturación tab block, before the Turnos tab block)

**Interfaces:**
- Consumes: default export `GastosRentabilidadPanel` from `@/features/finanzas/GastosRentabilidadPanel` (Task 2).

- [ ] **Step 1: Add the import**

In `frontend/src/pages/FinanzasPage.jsx`, right after the existing import of `PosModal` (currently line 37):

```jsx
import PosModal from '@/features/finanzas/PosModal'
import GastosRentabilidadPanel from '@/features/finanzas/GastosRentabilidadPanel'
```

- [ ] **Step 2: Add the tab entry**

Replace the `TABS` array (currently lines 46-51):

```jsx
const TABS = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'facturacion', label: 'Venta' },
  { id: 'gastos', label: 'Gastos y rentabilidad' },
  { id: 'turnos', label: 'Turnos de caja' },
  { id: 'historial', label: 'Historial' },
]
```

- [ ] **Step 3: Render the panel for the new tab**

Immediately after the closing of the `{/* ── Tab: Facturacion ── */}` block (the `)}` that closes the ternary starting at `activeTab === 'facturacion' && (`, currently ending around line 352) and before the `{/* ── Tab: Turnos de caja ── */}` comment, add:

```jsx
          {/* ── Tab: Gastos y rentabilidad ── */}
          {activeTab === 'gastos' && <GastosRentabilidadPanel />}
```

- [ ] **Step 4: Verify the frontend builds**

```bash
cd frontend && npm run build
```

Expected: this build may still fail because `AdministracionPage.jsx` (deleted in Task 4) imports from the old `features/administracion` path that Task 1 removed. If that is the only error, proceed to Task 4 and re-run the build check there. If there are any *other* errors, fix them now.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/FinanzasPage.jsx
git commit -m "feat(finanzas): agregar pestana Gastos y rentabilidad"
```

---

### Task 4: Remove the standalone Libro mayor page, route, and sidebar entry

**Files:**
- Delete: `frontend/src/pages/AdministracionPage.jsx`
- Modify: `frontend/src/router/index.jsx:22` (remove lazy import), `:95` (remove route)
- Modify: `frontend/src/components/layout/AdminShell.jsx:37` (remove nav item), `:54` (remove from section items), `:4` (remove now-unused `BookOpenText` import if nothing else uses it)
- Modify: `frontend/src/index.css:1-4` (remove the IBM Plex Mono font import, now unused)

- [ ] **Step 1: Delete the page**

```bash
git rm frontend/src/pages/AdministracionPage.jsx
```

- [ ] **Step 2: Remove the route**

In `frontend/src/router/index.jsx`, remove this line (currently line 22):

```jsx
const AdministracionPage = lazy(() => import('@/pages/AdministracionPage'))
```

And remove this line (currently line 95):

```jsx
{ path: '/administracion', element: <Suspense fallback={<Loader />}><AdministracionPage /></Suspense> },
```

- [ ] **Step 3: Remove the sidebar entry**

In `frontend/src/components/layout/AdminShell.jsx`, remove this line from `NAV_ITEMS` (currently line 37):

```jsx
{ key: 'administracion', label: 'Libro', to: '/administracion', icon: BookOpenText },
```

Update the `gestion` section's `items` array (currently line 54) from:

```jsx
items: ['finanzas', 'administracion', 'inventario', 'usuarios'],
```

to:

```jsx
items: ['finanzas', 'inventario', 'usuarios'],
```

Check whether `BookOpenText` is still used elsewhere in the file:

```bash
grep -n "BookOpenText" frontend/src/components/layout/AdminShell.jsx
```

If the only remaining match is the import line itself, remove `BookOpenText,` from the `lucide-react` import block (currently line 4).

- [ ] **Step 4: Remove the now-unused IBM Plex Mono font import**

In `frontend/src/index.css`, remove these two lines (currently lines 3-4):

```css
/* IBM Plex Mono: voz tabular de los montos en el Libro mayor (/administracion) */
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&display=swap');
```

- [ ] **Step 5: Confirm no dangling references remain**

```bash
grep -rn "AdministracionPage\|features/administracion\|/administracion'" frontend/src
```

Expected: no matches.

- [ ] **Step 6: Verify the frontend builds clean**

```bash
cd frontend && npm run build
```

Expected: build succeeds with no errors.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/router/index.jsx frontend/src/components/layout/AdminShell.jsx frontend/src/index.css
git commit -m "refactor(finanzas): eliminar pagina Libro mayor separada"
```

---

### Task 5: Manual verification in the browser

**Files:** none (verification only)

- [ ] **Step 1: Start the stack**

```bash
docker compose up
```

Or, if Docker isn't available locally: `cd backend && npm run dev` in one terminal, `cd frontend && npm run dev` in another.

- [ ] **Step 2: Log in and open Finanzas**

Navigate to `http://localhost:5173`, log in with a clinic user that has `facturacion_interna` and `reportes_operativos` enabled, go to **Caja** (`/finanzas`).

Expected: the tab bar now reads **Resumen · Venta · Gastos y rentabilidad · Turnos de caja · Historial**, and the sidebar no longer shows a separate "Libro" entry.

- [ ] **Step 3: Register and anull a gasto**

Click the **Gastos y rentabilidad** tab. Fill the gasto form (categoría, concepto, valor, método de pago) and submit.

Expected: a success message appears, the gastos table shows the new row, and the "Gastos del mes" KPI increases. Click "Anular" on that row, confirm the prompt with a motivo.

Expected: the row shows an "Anulado" pill and the KPI decreases back.

- [ ] **Step 4: Register an abono on a fiado invoice**

If there's an existing invoice with `estado: pendiente` and a propietario associated (fiado), it should appear under "Cuentas por cobrar". Expand a client row, click "Registrar abono" on one of their facturas, enter an amount ≤ saldoPendiente, submit.

Expected: the abono succeeds, the factura's saldoPendiente decreases (or the row disappears if fully paid), and "Total por cobrar" KPI updates.

- [ ] **Step 5: Confirm the old route is gone**

Navigate directly to `http://localhost:5173/administracion`.

Expected: the router's catch-all/redirect behavior kicks in (not a working Libro mayor page) — confirm it doesn't render the old ledger UI.

- [ ] **Step 6: No commit needed for this task** — it's verification only. If any step fails, fix the underlying code in the relevant earlier task and re-commit there.

---

## Self-Review Notes

- **Spec coverage:** KPIs (Task 2, `GastosRentabilidadPanel`) ✓, Gastos panel with form + table (Task 2, `GastosTable`/`GastoForm`) ✓, Cuentas por cobrar panel (Task 2, `CuentasPorCobrarPanel`/`FilaDeudor`) ✓, hooks/api moved to `features/finanzas/` (Task 1) ✓, old page/route/sidebar/CSS removed (Task 4) ✓, manual verification (Task 5) ✓.
- **Type/name consistency:** `GastosRentabilidadPanel` is the exact name imported in Task 3 and exported in Task 2. `useAdministracion` hook names match between Task 1 (moved as-is) and Task 2 (imported names). `administracionApi.js` internal import path (`./administracionApi`) is unaffected by the move since both files move together.
- **Placeholder scan:** none found — all steps contain complete, runnable code.
