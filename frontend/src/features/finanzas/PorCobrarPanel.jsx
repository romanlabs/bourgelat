import { useMemo, useState } from 'react'
import { MessageCircle, Phone, Search, Wallet } from 'lucide-react'
import FilaDeslizable from '@/components/movil/FilaDeslizable'
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
import { CLASE_RESALTADO, TRANSICION_RESALTADO, useResaltado } from '@/lib/useResaltado'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import FormAbono from './FormAbono'
import { formatearCelular } from '@/lib/celular'

const tarjeta = 'rounded-2xl bg-card p-5 sm:p-6'
const TONOS = {
  warning: { chip: 'bg-warning-soft text-warning', barra: 'bg-warning' },
  danger: { chip: 'bg-danger-soft text-danger', barra: 'bg-danger' },
}
const segmento = (activo) =>
  `h-11 shrink-0 whitespace-nowrap rounded-md px-3 text-[13px] transition lg:h-8 lg:shrink lg:whitespace-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
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
  [...facturas].sort((a, b) => {
    if (orden === 'antigua') return String(a.fecha).localeCompare(String(b.fecha))
    if (orden === 'reciente') return String(b.fecha).localeCompare(String(a.fecha))
    return Number(b.saldoPendiente) - Number(a.saldoPendiente)
  })

// Fecha de la última venta a crédito del cliente (para «Más reciente»).
const ultimaVenta = (cliente) =>
  cliente.facturas.reduce((max, f) => (String(f.fecha) > max ? String(f.fecha) : max), '')

const ORDENES = [
  ['deuda', 'Mayor deuda'],
  ['antigua', 'Más antigua'],
  ['reciente', 'Más reciente'],
]

// Clave del cliente en la lista y en los avisos de la campanita.
const claveCliente = (cliente) => cliente.propietarioId || 'mostrador'

function Cliente({ cliente, hoy, nombreClinica, orden, abiertoAlInicio = false, resaltado = false }) {
  const [abierto, setAbierto] = useState(abiertoAlInicio)
  const [abonando, setAbonando] = useState(null)
  const dias = diasDesde(cliente.facturaMasAntigua, hoy)
  const tono = TONOS[tramoDe(dias).tono]
  const ventas = cliente.facturas.length
  const vencidas = cliente.facturas.filter((f) => estadoVencimiento(f.fechaVencimientoCredito, hoy)?.tipo === 'vencida').length
  const whatsapp = enlaceWhatsApp(
    cliente.telefono,
    `Hola ${cliente.nombre}, te escribimos de ${nombreClinica}. Tienes un saldo pendiente de ${formatCurrency(cliente.totalGeneral ?? cliente.totalDeuda)}. Puedes pagarlo en la clínica o por transferencia. ¡Gracias!`
  )

  return (
    <li
      data-resaltar-id={claveCliente(cliente)}
      className={cn('border-t border-border first:border-t-0', TRANSICION_RESALTADO, resaltado && CLASE_RESALTADO)}
    >
      {/* Atajos con el dedo; Llamar, WhatsApp y Registrar abono están también al abrir el cliente. */}
      <FilaDeslizable
        redondeo="rounded-none"
        acciones={[
          ...(cliente.telefono
            ? [{ key: 'llamar', label: 'Llamar', icon: Phone, tono: 'info', onClick: () => { window.location.href = `tel:${cliente.telefono}` } }]
            : []),
          ...(whatsapp
            ? [{ key: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, tono: 'primary', onClick: () => window.open(whatsapp, '_blank', 'noopener,noreferrer') }]
            : []),
          {
            key: 'abonar',
            label: 'Abonar',
            icon: Wallet,
            tono: 'neutro',
            onClick: () => {
              setAbierto(true)
              if (cliente.facturas.length === 1) setAbonando(cliente.facturas[0].id)
            },
          },
        ]}
      >
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
      </FilaDeslizable>

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
                        className="inline-flex h-11 items-center rounded-lg bg-primary px-3.5 text-[13px] lg:h-9 font-semibold text-primary-foreground transition hover:brightness-110 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
              <a href={`tel:${cliente.telefono}`} className="inline-flex min-h-11 items-center font-semibold text-primary hover:underline lg:min-h-0">
                Llamar al {formatearCelular(cliente.telefono)}
              </a>
              {whatsapp ? (
                <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center font-semibold text-primary hover:underline lg:min-h-0">
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
  const clienteResaltado = useResaltado('cliente', {
    presente: (id) => clientes.some((cliente) => claveCliente(cliente) === id),
  })
  const tramos = useMemo(() => antiguedadCartera(clientes, hoy), [clientes, hoy])
  const masAntigua = clientes.reduce(
    (vieja, c) => (!vieja || c.facturaMasAntigua < vieja ? c.facturaMasAntigua : vieja),
    null
  )

  const visibles = useMemo(() => {
    const texto = buscar.trim().toLowerCase()
    return clientes
      .filter((c) => !texto || c.nombre.toLowerCase().includes(texto) || (c.telefono || '').includes(texto))
      // Con un tramo elegido, cada cliente muestra solo sus ventas de ese tramo.
      .map((c) => {
        if (!tramo) return c
        const facturas = c.facturas.filter((f) => tramoDe(diasDesde(f.fecha, hoy)).id === tramo)
        return {
          ...c,
          // El recordatorio por WhatsApp habla de toda la deuda, no solo del tramo.
          totalGeneral: c.totalDeuda,
          facturas,
          totalDeuda: facturas.reduce((suma, f) => suma + Number(f.saldoPendiente || 0), 0),
          facturaMasAntigua: facturas.reduce((vieja, f) => (!vieja || f.fecha < vieja ? f.fecha : vieja), null),
        }
      })
      .filter((c) => c.facturas.length > 0)
      .sort((a, b) => {
        if (orden === 'antigua') return String(a.facturaMasAntigua).localeCompare(String(b.facturaMasAntigua))
        if (orden === 'reciente') return ultimaVenta(b).localeCompare(ultimaVenta(a))
        return b.totalDeuda - a.totalDeuda
      })
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
          <p className="text-[44px] font-semibold leading-none tracking-[-0.04em] text-foreground max-lg:tabular-nums sm:text-5xl">
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
            <div role="group" aria-label="Ordenar" className="flex max-w-full gap-1 overflow-x-auto rounded-lg bg-secondary p-1 [scrollbar-width:none] lg:overflow-visible [&::-webkit-scrollbar]:hidden">
              {ORDENES.map(([id, label]) => (
                <button key={id} type="button" aria-pressed={orden === id} onClick={() => setOrden(id)} className={segmento(orden === id)}>
                  {label}
                </button>
              ))}
            </div>
            ) : null}
          </div>
          {clientes.length > 3 ? (
            <div className="px-5 pb-3 sm:px-6">
              <label className="flex h-11 items-center gap-2 rounded-lg border border-input px-3 lg:h-10 text-muted-foreground focus-within:ring-2 focus-within:ring-ring">
                <Search aria-hidden className="h-4 w-4" />
                <input
                  type="search"
                  value={buscar}
                  onChange={(e) => setBuscar(e.target.value)}
                  placeholder="Buscar cliente o teléfono"
                  aria-label="Buscar cliente o teléfono"
                  className="min-w-0 flex-1 bg-transparent text-base text-foreground outline-none lg:text-sm"
                />
              </label>
            </div>
          ) : null}
          {visibles.length ? (
            <ul className="border-t border-border">
              {visibles.map((cliente) => (
                <Cliente
                  key={`${cliente.propietarioId || 'mostrador'}-${tramo || 'todos'}`}
                  cliente={cliente}
                  hoy={hoy}
                  nombreClinica={nombreClinica}
                  orden={orden}
                  abiertoAlInicio={Boolean(tramo)}
                  resaltado={clienteResaltado === claveCliente(cliente)}
                />
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
