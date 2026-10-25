import { useMemo, useState } from 'react'
import { fechaCorta } from '@/features/pacientes/fichaSaludUtils'
import { toast } from 'sonner'
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
  useRentabilidad,
} from '@/features/finanzas/useAdministracion'
import { mesLocal } from '@/lib/fecha'
import { useAuthStore } from '@/store/authStore'
import { FuncionNoIncluida } from '@/components/shared/FuncionNoIncluida'
import { tieneFuncionalidad, FUNCIONALIDAD_REPORTES_COMPLETOS } from '@/lib/suscripcion'
import { CATEGORIAS_GASTO as CATEGORIAS } from '@/features/finanzas/finanzasConstants'
import FormAbono from './FormAbono'

const METODOS_GASTO = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'tarjeta', label: 'Tarjeta' },
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
  'h-11 rounded-lg border border-input bg-card px-3 text-sm text-foreground outline-none transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

export function GastoForm() {
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
    <form onSubmit={asentar} className="mb-5 grid gap-3 rounded-xl bg-muted p-4 sm:grid-cols-3 lg:grid-cols-[1fr_1.5fr_0.8fr_0.8fr_auto]">
      <label className="grid gap-1">
        <span className="text-[13px] font-semibold text-muted-foreground">Categoría</span>
        <Select
          variant="field"
          aria-label="Categoría del gasto"
          value={form.categoria}
          onValueChange={setValor('categoria')}
          options={CATEGORIAS}
        />
      </label>
      <label className="grid gap-1">
        <span className="text-[13px] font-semibold text-muted-foreground">Concepto</span>
        <input
          value={form.descripcion}
          onChange={set('descripcion')}
          placeholder="¿En qué se gastó?"
          maxLength={500}
          className={inputClass}
        />
      </label>
      <label className="grid gap-1">
        <span className="text-[13px] font-semibold text-muted-foreground">Valor</span>
        <MoneyInput
          value={form.monto}
          onChange={(value) => setForm((f) => ({ ...f, monto: value === 0 ? '' : String(value) }))}
          placeholder="0"
          className={`${inputClass} text-right tabular-nums`}
        />
      </label>
      <label className="grid gap-1">
        <span className="text-[13px] font-semibold text-muted-foreground">Pago</span>
        <Select
          variant="field"
          aria-label="Método de pago"
          value={form.metodoPago}
          onValueChange={setValor('metodoPago')}
          options={METODOS_GASTO}
        />
      </label>
      <div className="flex items-end">
        <button
          type="submit"
          disabled={crearGasto.isPending}
          className="h-11 w-full px-4 rounded-lg bg-primary text-sm font-semibold text-primary-foreground transition hover:brightness-110 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {crearGasto.isPending ? 'Registrando…' : 'Registrar gasto'}
        </button>
      </div>
      {mensaje ? (
        <p className={`sm:col-span-2 lg:col-span-5 text-sm ${mensaje.tipo === 'ok' ? 'text-success' : 'text-danger'}`}>
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
      toast.error(err.response?.data?.message || 'No se pudo anular el gasto')
    }
  }

  const rows = (data?.gastos || []).map((gasto) => ({ id: gasto.id, gasto }))

  return (
    <DashboardPanel
      title="Gastos del negocio"
      subtitle={data ? `${data.total} gastos · total ${formatCurrency(data.totalMonto || 0)} en el periodo.` : 'Registra y consulta los gastos del periodo.'}
      action={
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
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
                  <span className="ml-2"><StatusPill tone="bg-info-soft text-info">Automático</StatusPill></span>
                ) : null}
                {row.gasto.anulado ? (
                  <span className="ml-2"><StatusPill tone="bg-danger-soft text-danger">Anulado</StatusPill></span>
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
              <span className="font-semibold tabular-nums text-danger">
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
                  className="inline-flex h-9 items-center rounded-lg px-3 text-[13px] font-semibold text-muted-foreground transition hover:bg-danger-soft hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
  const [abierto, setAbierto] = useState(false)

  return (
    <div className="rounded-xl">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="min-w-0">
          <span className="block truncate text-[15px] font-semibold text-foreground">{cliente.nombre}</span>
          <span className="block text-[13px] text-muted-foreground">
            debe desde {fechaCorta(cliente.facturaMasAntigua)}{cliente.telefono ? ` · ${cliente.telefono}` : ''}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-3">
          <span className="font-semibold tabular-nums text-danger">{formatCurrency(cliente.totalDeuda)}</span>
          <span aria-hidden className="text-[13px] text-muted-foreground">{abierto ? '▲' : '▼'}</span>
        </span>
      </button>

      {abierto ? (
        <div className="space-y-2 rounded-xl bg-muted px-4 pb-4">
          {cliente.facturas.map((f) => (
            <div key={f.id} className="flex flex-wrap items-center gap-3 pt-3 text-sm">
              <span className="text-muted-foreground">#{f.numero} · {fechaCorta(f.fecha)}</span>
              <span className="text-muted-foreground">de {formatCurrency(f.total)} quedan</span>
              <span className="font-semibold tabular-nums text-danger">{formatCurrency(f.saldoPendiente)}</span>
              {facturaAbono === f.id ? (
                <FormAbono
                  autoFocus
                  factura={f}
                  onListo={() => setFacturaAbono(null)}
                  onCancelar={() => setFacturaAbono(null)}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setFacturaAbono(f.id)}
                  className="inline-flex h-9 items-center px-3 rounded-lg bg-secondary text-sm font-semibold text-secondary-foreground transition hover:brightness-95 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring text-[13px]"
                >
                  Registrar abono
                </button>
              )}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function CuentasPorCobrarPanel() {
  const { data, isLoading } = useCuentasPorCobrar()

  return (
    <DashboardPanel
      title="Cuentas por cobrar"
      subtitle={
        data?.totalClientes
          ? `${data.totalClientes === 1 ? 'Un cliente debe' : `${data.totalClientes} clientes deben`} ${formatCurrency(data.totalPorCobrar)} en total.`
          : 'Clientes con saldo de fiado pendiente.'
      }
    >
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Revisando deudas…</p>
      ) : !data?.clientes?.length ? (
        <div className="rounded-xl bg-muted px-4 py-6">
          <p className="text-sm font-semibold text-card-foreground">Nadie debe</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">El fiado está al día.</p>
        </div>
      ) : (
        <div className="space-y-1">
          {data.clientes.map((cliente) => (
            <FilaDeudor key={cliente.propietarioId || 'mostrador'} cliente={cliente} />
          ))}
        </div>
      )}
    </DashboardPanel>
  )
}

export default function GastosRentabilidadPanel() {
  const [mes, setMes] = useState(() => mesLocal())
  const periodo = useMemo(() => rangoDelMes(mes), [mes])
  const suscripcion = useAuthStore((state) => state.suscripcion)
  const incluyeRentabilidad = tieneFuncionalidad(suscripcion, FUNCIONALIDAD_REPORTES_COMPLETOS)
  const rentabilidad = useRentabilidad(periodo, { enabled: incluyeRentabilidad })
  const cuentasPorCobrar = useCuentasPorCobrar()

  const ganancia = Number(rentabilidad.data?.ganancia || 0)
  const positiva = ganancia >= 0

  return (
    <div className="space-y-5">
      {!incluyeRentabilidad && (
        <FuncionNoIncluida
          size="sm"
          titulo="La rentabilidad del mes es del plan Clínica"
          descripcion="Tu plan Esencial incluye gastos y cuentas por cobrar. El cálculo de ingresos, gastos y ganancia del mes está en el plan Clínica."
        />
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {incluyeRentabilidad && (
          <>
        <KpiCard
          icon={Wallet}
          label="Ingresos del mes"
          value={rentabilidad.isLoading ? '—' : formatCurrency(rentabilidad.data?.totalIngresos || 0)}
          helper="Suma de ingresos del periodo seleccionado."
          tone="text-success"
        />
        <KpiCard
          icon={TrendingDown}
          label="Gastos del mes"
          value={rentabilidad.isLoading ? '—' : formatCurrency(rentabilidad.data?.totalGastos || 0)}
          helper="Suma de gastos registrados en el periodo."
          tone="text-danger"
        />
        <KpiCard
          icon={positiva ? TrendingUp : TrendingDown}
          label={positiva ? 'Ganancia del mes' : 'Pérdida del mes'}
          value={rentabilidad.isLoading ? '—' : formatCurrency(ganancia)}
          helper={rentabilidad.data?.margen ? `Margen ${rentabilidad.data.margen} sobre ingresos.` : 'Ingresos menos gastos del periodo.'}
          tone={positiva ? 'text-success' : 'text-danger'}
        />
          </>
        )}
        <KpiCard
          icon={HandCoins}
          label="Total por cobrar"
          value={cuentasPorCobrar.isLoading ? '—' : formatCurrency(cuentasPorCobrar.data?.totalPorCobrar || 0)}
          helper="Saldo de fiado pendiente de todos los clientes."
          tone="text-warning"
        />
      </div>

      <GastosTable periodo={periodo} mes={mes} onMesChange={setMes} />
      <CuentasPorCobrarPanel />
    </div>
  )
}
