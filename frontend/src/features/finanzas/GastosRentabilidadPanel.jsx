import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { StatusPill } from '@/features/dashboard/dashboardComponents'
import { formatCurrency, formatNumber, formatShortDate } from '@/features/dashboard/dashboardUtils'
import MoneyInput from '@/components/shared/MoneyInput'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Select } from '@/components/ui/select'
import {
  useAnularGasto,
  useCrearGasto,
  useGastos,
} from '@/features/finanzas/useAdministracion'
import { badgeVariacion, variacion } from '@/features/finanzas/analisisPeriodo'
import { mesAnterior, nombreMes, rangoDelMes } from '@/features/finanzas/resumenFinanzas'
import { hasAnyRole } from '@/lib/permissions'
import { hoyLocal, mesLocal } from '@/lib/fecha'
import { useAuthStore } from '@/store/authStore'
import { CATEGORIAS_GASTO as CATEGORIAS } from '@/features/finanzas/finanzasConstants'

const METODOS_GASTO = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'tarjeta', label: 'Tarjeta' },
  { value: 'otro', label: 'Otro' },
]

const etiquetaCategoria = (value) => CATEGORIAS.find((c) => c.value === value)?.label || value
const etiquetaMetodo = (value) => METODOS_GASTO.find((m) => m.value === value)?.label || value

const inputClass =
  'h-11 rounded-lg border border-input bg-card px-3 text-base text-foreground outline-none transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:text-sm'
const tarjeta = 'rounded-2xl bg-card p-5 sm:p-6'
// El backend no da más de 100 por página: «Ver más» sube hasta ahí.
const LIMITE_INICIAL = 30
const LIMITE_MAXIMO = 100

// Formulario en línea del turno de caja (pestaña Turno de caja).
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

// Tarjeta para registrar un gasto desde Finanzas: con fecha (un recibo de ayer
// se puede asentar hoy) y aviso de cuándo el efectivo sale de la caja.
function RegistrarGasto() {
  const crearGasto = useCrearGasto()
  const hoy = hoyLocal()
  const vacio = { fecha: hoy, categoria: 'insumos', descripcion: '', monto: '', metodoPago: 'transferencia' }
  const [form, setForm] = useState(vacio)
  const [mensaje, setMensaje] = useState(null)
  const setValor = (campo) => (valor) => setForm((f) => ({ ...f, [campo]: valor }))

  const guardar = async (e) => {
    e.preventDefault()
    setMensaje(null)
    try {
      const res = await crearGasto.mutateAsync({
        ...form,
        monto: Number(form.monto),
        descripcion: form.descripcion || undefined,
      })
      setForm({ ...vacio, categoria: form.categoria, metodoPago: form.metodoPago })
      setMensaje({ tipo: 'ok', texto: res.message })
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err.response?.data?.message || 'No se pudo registrar el gasto' })
    }
  }

  const campo = 'flex min-w-0 flex-col gap-1.5'
  const etiqueta = 'text-[13px] font-semibold text-primary-foreground/90'

  return (
    <form onSubmit={guardar} aria-labelledby="g-registrar" className="flex flex-col gap-3 rounded-2xl bg-primary p-5 text-primary-foreground sm:p-6">
      <h2 id="g-registrar" className="text-lg font-semibold">Registrar gasto</h2>
      <label className={campo}>
        <span className={etiqueta}>Concepto</span>
        <input
          value={form.descripcion}
          onChange={(e) => setValor('descripcion')(e.target.value)}
          placeholder="Ej.: domicilio de medicamentos"
          maxLength={500}
          className={`${inputClass} w-full`}
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className={campo}>
          <span className={etiqueta}>Categoría</span>
          <Select variant="field" aria-label="Categoría del gasto" value={form.categoria} onValueChange={setValor('categoria')} options={CATEGORIAS} />
        </label>
        <label className={campo}>
          <span className={etiqueta}>Valor</span>
          <MoneyInput
            value={form.monto}
            onChange={(value) => setValor('monto')(value === 0 ? '' : String(value))}
            placeholder="$ 0"
            className={`${inputClass} w-full min-w-0 text-right font-semibold tabular-nums`}
          />
        </label>
        <label className={campo}>
          <span className={etiqueta}>Pagado con</span>
          <Select variant="field" aria-label="Método de pago" value={form.metodoPago} onValueChange={setValor('metodoPago')} options={METODOS_GASTO} />
        </label>
        <label className={campo}>
          <span className={etiqueta}>Fecha</span>
          <input
            type="date"
            value={form.fecha}
            max={hoy}
            onChange={(e) => e.target.value && setValor('fecha')(e.target.value)}
            className={`${inputClass} w-full min-w-0 tabular-nums`}
          />
        </label>
      </div>
      {form.metodoPago === 'efectivo' ? (
        <p className="text-[13px] leading-5 text-primary-foreground/85">
          En efectivo sale de tu turno de caja si lo tienes abierto, así el arqueo cuadra.
        </p>
      ) : null}
      <button
        type="submit"
        disabled={crearGasto.isPending || !form.monto}
        className="mt-1 h-11 rounded-lg bg-card text-sm font-semibold text-primary transition hover:brightness-95 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
      >
        {crearGasto.isPending ? 'Guardando…' : 'Guardar gasto'}
      </button>
      {mensaje ? (
        <p role="status" className={`rounded-lg px-3 py-2 text-sm font-medium ${mensaje.tipo === 'ok' ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger'}`}>
          {mensaje.texto}
        </p>
      ) : null}
    </form>
  )
}

// En qué se va: una barra por categoría, todas del mismo color (una sola
// serie). Tocar una filtra el historial.
function EnQueSeVa({ porCategoria, total, filtro, onFiltrar }) {
  const mayor = porCategoria[0]?.total || 1
  return (
    <section aria-labelledby="g-categorias" className={`${tarjeta} flex flex-col gap-4`}>
      <div>
        <h2 id="g-categorias" className="text-lg font-semibold text-card-foreground">En qué se va</h2>
        <p className="mt-1 text-[13px] text-muted-foreground">Toca una categoría para ver solo esos gastos.</p>
      </div>
      {porCategoria.length ? (
        <ul className="-mx-2 flex flex-col gap-1">
          {porCategoria.map((c) => {
            const activa = filtro === c.categoria
            const porcentaje = Math.round((c.total / (total || 1)) * 100)
            return (
              <li key={c.categoria}>
                <button
                  type="button"
                  onClick={() => onFiltrar(activa ? null : c.categoria)}
                  aria-pressed={activa}
                  className={`flex w-full flex-col gap-1.5 rounded-lg px-2 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${activa ? 'bg-primary/10' : 'hover:bg-muted'}`}
                >
                  <span className="flex justify-between gap-3 text-sm">
                    <span className="font-medium text-card-foreground">{etiquetaCategoria(c.categoria)}</span>
                    <span className="shrink-0 tabular-nums">
                      <span className="text-muted-foreground">{porcentaje === 0 ? '<1' : porcentaje} % · </span>
                      <span className="font-semibold text-card-foreground">{formatCurrency(c.total)}</span>
                    </span>
                  </span>
                  <span aria-hidden className="flex h-1.5 rounded-full bg-muted">
                    <span className="h-1.5 rounded-full bg-primary" style={{ width: `${Math.max(2, (c.total / mayor) * 100)}%` }} />
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">Sin gastos en el periodo.</p>
      )}
    </section>
  )
}

function AnularGasto({ gasto, onCerrar }) {
  const anularGasto = useAnularGasto()
  const [motivo, setMotivo] = useState('')

  const cerrar = () => {
    setMotivo('')
    onCerrar()
  }

  const confirmar = async () => {
    if (!motivo.trim()) {
      toast.error('Escribe el motivo de la anulación')
      return
    }
    try {
      await anularGasto.mutateAsync({ gastoId: gasto.id, motivoAnulacion: motivo.trim() })
      toast.success('Gasto anulado')
      cerrar()
    } catch (err) {
      toast.error(err.response?.data?.message || 'No se pudo anular el gasto')
    }
  }

  return (
    <ConfirmDialog
      open={Boolean(gasto)}
      onOpenChange={(abierto) => !abierto && cerrar()}
      title="Anular gasto"
      description={gasto ? `${gasto.descripcion || etiquetaCategoria(gasto.categoria)} por ${formatCurrency(gasto.monto)}. Queda en el historial como anulado.` : ''}
      confirmLabel="Anular gasto"
      loading={anularGasto.isPending}
      onConfirm={confirmar}
    >
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold text-foreground">Motivo</span>
        <textarea
          autoFocus
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder="Ej.: se registró dos veces"
          className="rounded-lg border border-input bg-card px-3 py-2 text-base text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring lg:text-sm"
        />
      </label>
    </ConfirmDialog>
  )
}

function HistorialGastos({ data, cargando, filtro, onFiltrar, onVerMas, limite }) {
  const [anulando, setAnulando] = useState(null)
  const gastos = data?.gastos || []
  const faltan = (data?.total || 0) > gastos.length

  return (
    <section aria-labelledby="g-historial" className="min-w-0 overflow-hidden rounded-2xl bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 pb-3 pt-5 sm:px-6">
        <h2 id="g-historial" className="text-lg font-semibold text-card-foreground">
          {filtro ? etiquetaCategoria(filtro) : 'Todos los gastos'}
          {data ? <span className="ml-2 text-sm font-normal text-muted-foreground">{formatNumber(data.total)}</span> : null}
        </h2>
        {filtro ? (
          <button type="button" onClick={() => onFiltrar(null)} className="text-sm font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            Ver todas las categorías
          </button>
        ) : null}
      </div>
      {gastos.length ? (
        <>
        {/* Celular: una tarjeta por gasto, sin tabla. */}
        <ul className="divide-y divide-border border-t border-border lg:hidden">
          {gastos.map((g) => (
            <li key={g.id} className={`flex flex-col gap-2 px-5 py-3.5 ${g.anulado ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between gap-3">
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="font-medium text-card-foreground">{g.descripcion || etiquetaCategoria(g.categoria)}</span>
                  <span className="text-[13px] text-muted-foreground">
                    <span className="tabular-nums">{formatShortDate(g.fecha)}</span> · {etiquetaMetodo(g.metodoPago)}
                  </span>
                  <span className="flex flex-wrap items-center gap-1.5 text-[13px] text-muted-foreground">
                    {[g.descripcion ? etiquetaCategoria(g.categoria) : null, g.usuario?.nombre].filter(Boolean).join(' · ') || null}
                    {g.origen === 'consumo_insumos' ? <StatusPill tone="bg-info-soft text-info">Insumos de consulta</StatusPill> : null}
                    {g.anulado ? <StatusPill tone="bg-danger-soft text-danger">Anulado</StatusPill> : null}
                  </span>
                </span>
                <span className={`shrink-0 font-semibold tabular-nums ${g.anulado ? 'line-through' : 'text-card-foreground'}`}>
                  {formatCurrency(g.monto)}
                </span>
              </div>
              {g.anulado ? null : (
                <button
                  type="button"
                  onClick={() => setAnulando(g)}
                  className="inline-flex h-11 w-fit items-center rounded-lg px-3 text-[13px] font-semibold text-muted-foreground transition hover:bg-danger-soft hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Anular
                </button>
              )}
            </li>
          ))}
        </ul>
        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full min-w-[480px] text-sm">
            <thead className="whitespace-nowrap text-left text-[13px] text-muted-foreground">
              <tr>
                <th scope="col" className="px-5 py-2 font-medium sm:px-6">Fecha</th>
                <th scope="col" className="px-3 py-2 font-medium">Concepto</th>
                <th scope="col" className="px-3 py-2 font-medium">Pagado con</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Valor</th>
                <th scope="col" className="px-5 py-2 sm:px-6"><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              {gastos.map((g) => (
                <tr key={g.id} className={`border-t border-border ${g.anulado ? 'opacity-60' : ''}`}>
                  <td className="whitespace-nowrap px-5 py-3 tabular-nums text-muted-foreground sm:px-6">{formatShortDate(g.fecha)}</td>
                  <td className="px-3 py-3">
                    <span className="block font-medium text-card-foreground">{g.descripcion || etiquetaCategoria(g.categoria)}</span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[13px] text-muted-foreground">
                      {/* Categoría (si el concepto ya es el título) y quién lo registró. */}
                      {[g.descripcion ? etiquetaCategoria(g.categoria) : null, g.usuario?.nombre].filter(Boolean).join(' · ') || null}
                      {/* Lo generó el sistema al cerrar una historia, no un usuario. */}
                      {g.origen === 'consumo_insumos' ? <StatusPill tone="bg-info-soft text-info">Insumos de consulta</StatusPill> : null}
                      {g.anulado ? <StatusPill tone="bg-danger-soft text-danger">Anulado</StatusPill> : null}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-muted-foreground">{etiquetaMetodo(g.metodoPago)}</td>
                  <td className={`whitespace-nowrap px-3 py-3 text-right font-semibold tabular-nums ${g.anulado ? 'line-through' : 'text-card-foreground'}`}>
                    {formatCurrency(g.monto)}
                  </td>
                  <td className="px-5 py-3 text-right sm:px-6">
                    {g.anulado ? null : (
                      <button
                        type="button"
                        onClick={() => setAnulando(g)}
                        className="inline-flex h-8 items-center rounded-lg px-2.5 text-[13px] font-semibold text-muted-foreground transition hover:bg-danger-soft hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        Anular
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      ) : (
        <p className="px-5 pb-6 text-sm text-muted-foreground sm:px-6">
          {cargando ? 'Cargando gastos…' : 'No hay gastos registrados en este periodo.'}
        </p>
      )}
      {faltan ? (
        <div className="border-t border-border px-5 py-3 text-sm sm:px-6">
          {limite < LIMITE_MAXIMO ? (
            <button type="button" onClick={onVerMas} className="font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              Ver más gastos
            </button>
          ) : (
            <span className="text-muted-foreground">
              Se muestran los {LIMITE_MAXIMO} más recientes. Toca una categoría en «En qué se va» para ver el resto.
            </span>
          )}
        </div>
      ) : null}
      <AnularGasto gasto={anulando} onCerrar={() => setAnulando(null)} />
    </section>
  )
}

// Pestaña Gastos de Finanzas. La rentabilidad vive en el Resumen («Lo que
// queda»); aquí se registra, se revisa y se ve en qué se va el dinero.
export default function GastosRentabilidadPanel() {
  const usuario = useAuthStore((state) => state.usuario)
  const esAdmin = hasAnyRole(usuario, ['admin', 'superadmin'])
  const [mes, setMes] = useState(() => mesLocal())
  const [categoria, setCategoria] = useState(null)
  const [limite, setLimite] = useState(LIMITE_INICIAL)

  const periodo = useMemo(() => rangoDelMes(mes), [mes])
  const previo = useMemo(() => rangoDelMes(mesAnterior(mes)), [mes])
  const filtros = useMemo(
    () => ({ ...periodo, categoria: categoria || undefined, pagina: 1, limite }),
    [periodo, categoria, limite]
  )

  const gastosQuery = useGastos(filtros, { enabled: esAdmin })
  // Sin filtro de categoría: el total del mes para la cifra grande y el desglose.
  const totalQuery = useGastos({ ...periodo, pagina: 1, limite: 1 }, { enabled: esAdmin })
  const previoQuery = useGastos({ ...previo, pagina: 1, limite: 1 }, { enabled: esAdmin })

  const totalMes = totalQuery.data?.totalMonto || 0
  const porCategoria = totalQuery.data?.porCategoria || []
  const cantidadMes = porCategoria.reduce((suma, c) => suma + c.cantidad, 0)
  const totalPrevio = previoQuery.data?.totalMonto
  const nombrePrevio = nombreMes(mesAnterior(mes))
  const comparacion =
    totalQuery.data && previoQuery.data && variacion(totalMes, totalPrevio) !== null
      ? badgeVariacion(totalMes, totalPrevio, nombrePrevio, { mayorEsMejor: false })
      : null

  const cambiarMes = (valor) => {
    setMes(valor)
    setCategoria(null)
    setLimite(LIMITE_INICIAL)
  }
  const filtrar = (valor) => {
    setCategoria(valor)
    setLimite(LIMITE_INICIAL)
  }

  if (!esAdmin) {
    return (
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className={`${tarjeta} flex flex-col gap-2`}>
          <h2 className="text-lg font-semibold text-card-foreground">Gastos del negocio</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Registra aquí lo que se paga: domicilios, insumos, servicios. El historial y el total del mes los revisa administración.
          </p>
        </div>
        <RegistrarGasto />
      </div>
    )
  }

  return (
    <div className={`space-y-5 transition-opacity ${gastosQuery.isFetching && gastosQuery.data ? 'opacity-80' : ''}`}>
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        {totalQuery.data ? (
          <header className="flex flex-col gap-2">
            <p className="text-[44px] font-semibold leading-none tracking-[-0.04em] text-foreground max-lg:tabular-nums sm:text-5xl">
              {formatCurrency(totalMes)}
              <span className="ml-3 text-xl font-medium tracking-[-0.01em] text-muted-foreground sm:text-2xl">
                en gastos de {nombreMes(mes)}
              </span>
            </p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[15px] text-muted-foreground">
              <span>
                {formatNumber(cantidadMes)} {cantidadMes === 1 ? 'gasto' : 'gastos'}
                {porCategoria[0] ? ` · lo que más pesa: ${etiquetaCategoria(porCategoria[0].categoria).toLowerCase()}` : ''}
              </span>
              {comparacion ? (
                <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[13px] font-semibold ${comparacion.badgeTone}`}>
                  {comparacion.badge}
                </span>
              ) : null}
            </div>
          </header>
        ) : (
          <div aria-hidden className="h-[76px] w-80 max-w-full animate-pulse rounded-2xl bg-card" />
        )}
        <input
          type="month"
          value={mes}
          max={mesLocal()}
          onChange={(e) => e.target.value && cambiarMes(e.target.value)}
          aria-label="Mes"
          className="h-11 rounded-lg border border-input bg-card px-3 text-base tabular-nums text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring lg:h-10 lg:text-sm"
        />
      </div>

      {gastosQuery.isError ? (
        <div className="rounded-xl bg-danger-soft px-4 py-4 text-sm text-danger">
          {gastosQuery.error?.response?.data?.message || 'No fue posible cargar los gastos.'}
        </div>
      ) : null}

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <HistorialGastos
          data={gastosQuery.data}
          cargando={gastosQuery.isLoading}
          filtro={categoria}
          onFiltrar={filtrar}
          limite={limite}
          onVerMas={() => setLimite((l) => Math.min(LIMITE_MAXIMO, l + 35))}
        />
        <div className="flex flex-col gap-5">
          <RegistrarGasto />
          <EnQueSeVa porCategoria={porCategoria} total={totalMes} filtro={categoria} onFiltrar={filtrar} />
        </div>
      </div>
    </div>
  )
}
