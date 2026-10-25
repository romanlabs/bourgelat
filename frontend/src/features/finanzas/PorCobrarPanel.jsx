import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { StatusPill } from '@/features/dashboard/dashboardComponents'
import { formatCurrency, formatNumber, formatShortDate } from '@/features/dashboard/dashboardUtils'
import { useCuentasPorCobrar } from '@/features/finanzas/useAdministracion'
import {
  TRAMOS_ANTIGUEDAD,
  antiguedadCartera,
  diasDesde,
  enlaceWhatsApp,
  estadoVencimiento,
  tramoDe,
} from '@/features/finanzas/resumenFinanzas'
import { hoyLocal } from '@/lib/fecha'
import { useAuthStore } from '@/store/authStore'
import FormAbono from './FormAbono'

const tarjeta = 'rounded-2xl bg-card p-5 sm:p-6'
const TONOS = {
  warning: { chip: 'bg-warning-soft text-warning', barra: 'bg-warning' },
  danger: { chip: 'bg-danger-soft text-danger', barra: 'bg-danger' },
}
const segmento = (activo) =>
  `h-8 rounded-md px-3 text-[13px] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
    activo ? 'bg-card font-semibold text-foreground' : 'font-medium text-muted-foreground hover:text-foreground'
  }`

// Texto y tono del vencimiento de una venta con plazo.
const VENCIMIENTO = {
  vencida: (d) => ({ texto: `Vencida hace ${d} ${d === 1 ? 'día' : 'días'}`, tono: 'bg-danger-soft text-danger' }),
  pronto: (d) => ({ texto: d === 0 ? 'Vence hoy' : `Vence en ${d} ${d === 1 ? 'día' : 'días'}`, tono: 'bg-warning-soft text-warning' }),
  alDia: (d) => ({ texto: `Vence en ${d} días`, tono: 'bg-muted text-muted-foreground' }),
}
const textoVencimiento = (fecha, hoy) => {
  const estado = estadoVencimiento(fecha, hoy)
  return estado ? VENCIMIENTO[estado.tipo](estado.dias) : null
}

const hace = (dias) => (dias === 0 ? 'hoy' : dias === 1 ? 'hace 1 día' : `hace ${dias} días`)

// El mismo orden de la lista aplica a las ventas del cliente.
const ordenarVentas = (facturas, orden) =>
  [...facturas].sort((a, b) =>
    orden === 'antigua'
      ? String(a.fecha).localeCompare(String(b.fecha))
      : Number(b.saldoPendiente) - Number(a.saldoPendiente)
  )

function Cliente({ cliente, hoy, nombreClinica, orden }) {
  const [abierto, setAbierto] = useState(false)
  const [abonando, setAbonando] = useState(null)
  const dias = diasDesde(cliente.facturaMasAntigua, hoy)
  const tono = TONOS[tramoDe(dias).tono]
  const ventas = cliente.facturas.length
  const vencidas = cliente.facturas.filter((f) => estadoVencimiento(f.fechaVencimientoCredito, hoy)?.tipo === 'vencida').length
  const whatsapp = enlaceWhatsApp(
    cliente.telefono,
    `Hola ${cliente.nombre}, te escribimos de ${nombreClinica}. Tienes un saldo pendiente de ${formatCurrency(cliente.totalDeuda)}. Puedes pagarlo en la clínica o por transferencia. ¡Gracias!`
  )

  return (
    <li className="border-t border-border first:border-t-0">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-6"
      >
        <span className="flex min-w-0 flex-col gap-1">
          <span className="truncate text-[15px] font-semibold text-card-foreground">{cliente.nombre}</span>
          <span className="flex flex-wrap items-center gap-2 text-[13px] text-muted-foreground">
            <span>
              {formatNumber(ventas)} {ventas === 1 ? 'venta' : 'ventas'} · desde el {formatShortDate(cliente.facturaMasAntigua)}
            </span>
            <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${tono.chip}`}>{hace(dias)}</span>
            {vencidas ? (
              <span className="rounded-md bg-danger-soft px-1.5 py-0.5 text-[11px] font-semibold text-danger">
                {vencidas === 1 ? '1 vencida' : `${vencidas} vencidas`}
              </span>
            ) : null}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-3">
          <span className="text-lg font-semibold tabular-nums text-card-foreground">{formatCurrency(cliente.totalDeuda)}</span>
          <span aria-hidden className={`text-muted-foreground transition-transform ${abierto ? 'rotate-180' : ''}`}>▾</span>
        </span>
      </button>

      {abierto ? (
        <div className="flex flex-col gap-3 bg-muted/50 px-5 pb-5 pt-1 sm:px-6">
          <ul className="flex flex-col divide-y divide-border rounded-xl bg-card">
            {ordenarVentas(cliente.facturas, orden).map((f) => (
              <li key={f.id} className="flex flex-col gap-3 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="flex flex-col gap-0.5">
                    <span className="flex items-center gap-2 text-sm font-semibold text-card-foreground">
                      {f.numero}
                      {f.estado === 'parcial' ? <StatusPill tone="bg-info-soft text-info">Con abonos</StatusPill> : null}
                      {(() => {
                        const v = textoVencimiento(f.fechaVencimientoCredito, hoy)
                        return v ? <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${v.tono}`}>{v.texto}</span> : null
                      })()}
                    </span>
                    <span className="text-[13px] text-muted-foreground">
                      {formatShortDate(f.fecha)} · {hace(diasDesde(f.fecha, hoy))} · de {formatCurrency(f.total)}
                      {f.fechaVencimientoCredito ? ` · paga el ${formatShortDate(f.fechaVencimientoCredito)}` : ' · sin plazo'}
                    </span>
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="text-right">
                      <span className="block text-[11px] text-muted-foreground">Queda</span>
                      <span className="block font-semibold tabular-nums text-card-foreground">{formatCurrency(f.saldoPendiente)}</span>
                    </span>
                    {abonando === f.id ? null : (
                      <button
                        type="button"
                        onClick={() => setAbonando(f.id)}
                        className="inline-flex h-9 items-center rounded-lg bg-primary px-3.5 text-[13px] font-semibold text-primary-foreground transition hover:brightness-110 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        Registrar abono
                      </button>
                    )}
                  </span>
                </div>
                {abonando === f.id ? (
                  <FormAbono autoFocus factura={f} onListo={() => setAbonando(null)} onCancelar={() => setAbonando(null)} />
                ) : null}
              </li>
            ))}
          </ul>
          {cliente.telefono ? (
            <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <a href={`tel:${cliente.telefono}`} className="font-semibold text-primary hover:underline">
                Llamar al {cliente.telefono}
              </a>
              {whatsapp ? (
                <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:underline">
                  Escribirle por WhatsApp
                </a>
              ) : null}
            </p>
          ) : (
            <p className="text-[13px] text-muted-foreground">Sin teléfono registrado: agrégalo en su ficha para poder recordarle.</p>
          )}
        </div>
      ) : null}
    </li>
  )
}

function Antiguedad({ tramos, total, filtro, onFiltrar }) {
  const mayor = Math.max(1, ...tramos.map((t) => t.total))
  return (
    <section aria-labelledby="c-antiguedad" className={`${tarjeta} flex flex-col gap-4`}>
      <div>
        <h2 id="c-antiguedad" className="text-lg font-semibold text-card-foreground">Antigüedad de la deuda</h2>
        <p className="mt-1 text-[13px] text-muted-foreground">Entre más vieja, más difícil de cobrar. Toca un tramo para filtrar.</p>
      </div>
      <ul className="-mx-2 flex flex-col gap-1">
        {tramos.map((t) => {
          const activo = filtro === t.id
          const tono = TONOS[t.tono]
          return (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => onFiltrar(activo ? null : t.id)}
                disabled={t.ventas === 0}
                aria-pressed={activo}
                className={`flex w-full flex-col gap-1.5 rounded-lg px-2 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default ${
                  activo ? 'bg-primary/10' : 'enabled:hover:bg-muted'
                }`}
              >
                <span className="flex justify-between gap-3 text-sm">
                  <span className={t.ventas ? 'font-medium text-card-foreground' : 'text-muted-foreground'}>{t.label}</span>
                  <span className="shrink-0 tabular-nums">
                    {t.ventas ? (
                      <>
                        <span className="text-muted-foreground">{formatNumber(t.ventas)} · </span>
                        <span className="font-semibold text-card-foreground">{formatCurrency(t.total)}</span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </span>
                </span>
                <span aria-hidden className="flex h-1.5 rounded-full bg-muted">
                  {t.total > 0 ? (
                    <span className={`h-1.5 rounded-full ${tono.barra}`} style={{ width: `${Math.max(3, (t.total / mayor) * 100)}%` }} />
                  ) : null}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      <p className="border-t border-border pt-3 text-[13px] text-muted-foreground">
        {total > 0
          ? 'Los abonos se registran desde cada venta. En efectivo entran al turno de caja abierto.'
          : 'Cuando vendas a crédito, aquí verás cuánto tiempo lleva cada deuda.'}
      </p>
    </section>
  )
}

// Cuentas por cobrar: la misma vista en Caja (recepción recibe los abonos) y en
// Finanzas (administración revisa cuánto le deben).
export default function PorCobrarPanel() {
  const { data, isLoading, isError, error } = useCuentasPorCobrar()
  const clinica = useAuthStore((state) => state.clinica)
  const nombreClinica = clinica?.nombreComercial || clinica?.nombre || 'la clínica'
  const [buscar, setBuscar] = useState('')
  const [orden, setOrden] = useState('deuda')
  const [tramo, setTramo] = useState(null)
  const hoy = hoyLocal()

  const clientes = useMemo(() => data?.clientes || [], [data])
  const tramos = useMemo(() => antiguedadCartera(clientes, hoy), [clientes, hoy])
  const masAntigua = clientes.reduce(
    (vieja, c) => (!vieja || c.facturaMasAntigua < vieja ? c.facturaMasAntigua : vieja),
    null
  )

  const visibles = useMemo(() => {
    const texto = buscar.trim().toLowerCase()
    return clientes
      .filter((c) => !texto || c.nombre.toLowerCase().includes(texto) || (c.telefono || '').includes(texto))
      .filter((c) => !tramo || c.facturas.some((f) => tramoDe(diasDesde(f.fecha, hoy)).id === tramo))
      .sort((a, b) =>
        orden === 'antigua'
          ? String(a.facturaMasAntigua).localeCompare(String(b.facturaMasAntigua))
          : b.totalDeuda - a.totalDeuda
      )
  }, [clientes, buscar, tramo, orden, hoy])

  const total = data?.totalPorCobrar || 0
  const vencido = clientes.reduce(
    (suma, c) => suma + c.facturas.reduce((s2, f) => (estadoVencimiento(f.fechaVencimientoCredito, hoy)?.tipo === 'vencida' ? s2 + Number(f.saldoPendiente || 0) : s2), 0),
    0
  )

  return (
    <div className="space-y-5">
      {data ? (
        <header className="flex flex-col gap-2">
          <p className="text-[44px] font-semibold leading-none tracking-[-0.04em] text-foreground sm:text-5xl">
            {formatCurrency(total)}
            <span className="ml-3 text-xl font-medium tracking-[-0.01em] text-muted-foreground sm:text-2xl">por cobrar</span>
          </p>
          <p className="text-[15px] text-muted-foreground">
            {total > 0
              ? `${formatNumber(data.totalFacturas)} ${data.totalFacturas === 1 ? 'venta' : 'ventas'} a crédito de ${formatNumber(data.totalClientes)} ${data.totalClientes === 1 ? 'cliente' : 'clientes'} · la más antigua de ${hace(diasDesde(masAntigua, hoy))}`
              : 'Nadie te debe: el fiado está al día.'}
            {vencido > 0 ? (
              <span className="ml-2 inline-flex items-center rounded-md bg-danger-soft px-2 py-0.5 text-[13px] font-semibold text-danger">
                {formatCurrency(vencido)} vencidos
              </span>
            ) : null}
          </p>
        </header>
      ) : (
        <div aria-hidden className="h-[76px] w-80 max-w-full animate-pulse rounded-2xl bg-card" />
      )}

      {isError ? (
        <div className="rounded-xl bg-danger-soft px-4 py-4 text-sm text-danger">
          {error?.response?.data?.message || 'No fue posible cargar las cuentas por cobrar.'}
        </div>
      ) : null}

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section aria-labelledby="c-clientes" className="min-w-0 overflow-hidden rounded-2xl bg-card">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 pb-3 pt-5 sm:px-6">
            <h2 id="c-clientes" className="text-lg font-semibold text-card-foreground">
              {tramo ? TRAMOS_ANTIGUEDAD.find((t) => t.id === tramo)?.label : 'Quién debe'}
            </h2>
            {(data?.totalFacturas || 0) > 1 ? (
            <div role="group" aria-label="Ordenar" className="flex gap-1 rounded-lg bg-secondary p-1">
              <button type="button" aria-pressed={orden === 'deuda'} onClick={() => setOrden('deuda')} className={segmento(orden === 'deuda')}>
                Mayor deuda
              </button>
              <button type="button" aria-pressed={orden === 'antigua'} onClick={() => setOrden('antigua')} className={segmento(orden === 'antigua')}>
                Más antigua
              </button>
            </div>
            ) : null}
          </div>
          {clientes.length > 3 ? (
            <div className="px-5 pb-3 sm:px-6">
              <label className="flex h-10 items-center gap-2 rounded-lg border border-input px-3 text-muted-foreground focus-within:ring-2 focus-within:ring-ring">
                <Search aria-hidden className="h-4 w-4" />
                <input
                  type="search"
                  value={buscar}
                  onChange={(e) => setBuscar(e.target.value)}
                  placeholder="Buscar cliente o teléfono"
                  aria-label="Buscar cliente o teléfono"
                  className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none"
                />
              </label>
            </div>
          ) : null}
          {visibles.length ? (
            <ul className="border-t border-border">
              {visibles.map((cliente) => (
                <Cliente key={cliente.propietarioId || 'mostrador'} cliente={cliente} hoy={hoy} nombreClinica={nombreClinica} orden={orden} />
              ))}
            </ul>
          ) : (
            <p className="px-5 pb-6 text-sm text-muted-foreground sm:px-6">
              {isLoading ? 'Revisando deudas…' : clientes.length ? 'Ningún cliente coincide con el filtro.' : 'Nadie debe. Las ventas a crédito aparecerán aquí.'}
            </p>
          )}
          {tramo ? (
            <div className="border-t border-border px-5 py-3 sm:px-6">
              <button type="button" onClick={() => setTramo(null)} className="text-sm font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                Ver todos los clientes
              </button>
            </div>
          ) : null}
        </section>
        <Antiguedad tramos={tramos} total={total} filtro={tramo} onFiltrar={setTramo} />
      </div>
    </div>
  )
}
