import { useMemo, useState } from 'react'
import { HandCoins, TrendingDown, TrendingUp, Wallet } from 'lucide-react'
import {
  DashboardPanel,
  DataTable,
  KpiCard,
  StatusPill,
} from '@/features/dashboard/dashboardComponents'
import { formatCurrency } from '@/features/dashboard/dashboardUtils'
import MoneyInput from '@/components/shared/MoneyInput'
import { Select } from '@/components/ui/select'
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
  const setValor = (campo) => (valor) => setForm((f) => ({ ...f, [campo]: valor }))

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
    <form onSubmit={asentar} className="mb-5 grid gap-3 border border-border bg-muted p-4 sm:grid-cols-3 lg:grid-cols-[1fr_1.5fr_0.8fr_0.8fr_auto]">
      <label className="grid gap-1">
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Categoría</span>
        <Select
          variant="field"
          aria-label="Categoria del gasto"
          value={form.categoria}
          onValueChange={setValor('categoria')}
          options={CATEGORIAS}
        />
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
        <MoneyInput
          value={form.monto}
          onChange={(value) => setForm((f) => ({ ...f, monto: value === 0 ? '' : String(value) }))}
          placeholder="0"
          className={`${inputClass} text-right tabular-nums`}
        />
      </label>
      <label className="grid gap-1">
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Pago</span>
        <Select
          variant="field"
          aria-label="Metodo de pago"
          value={form.metodoPago}
          onValueChange={setValor('metodoPago')}
          options={METODOS_GASTO}
        />
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
                {/* Lo generó el sistema al cerrar una historia, no un usuario. */}
                {row.gasto.origen === 'consumo_insumos' ? (
                  <span className="ml-2"><StatusPill tone="border-sky-200 bg-sky-50 text-sky-700">Automático</StatusPill></span>
                ) : null}
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
                  <MoneyInput
                    autoFocus
                    value={monto}
                    onChange={(value) => setMonto(value === 0 ? '' : String(value))}
                    placeholder="valor"
                    className={`${inputClass} h-9 w-28 text-right tabular-nums`}
                  />
                  <Select
                    variant="field"
                    aria-label="Metodo del abono"
                    className="h-9"
                    value={metodoPago}
                    onValueChange={setMetodoPago}
                    options={METODOS_ABONO}
                  />
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
