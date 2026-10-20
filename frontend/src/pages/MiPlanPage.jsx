import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Check, Copy, Minus } from 'lucide-react'
import AdminShell from '@/components/layout/AdminShell'
import { planApi } from '@/features/plan/planApi'
import { pagoManual } from '@/content/publicSiteContent'
import { useAuthStore } from '@/store/authStore'
import { hasAnyRole } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import qrBourgelat from '@/assets/pagos/qr-bourgelat.svg'

const FOCO = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'

const NOMBRES = {
  prueba: 'Prueba gratis',
  esencial: 'Plan Esencial',
  activo: 'Plan Clínica',
  cortesia: 'Plan de cortesía',
  personalizado: 'Plan personalizado',
}

const pesos = (valor) => `$${Number(valor || 0).toLocaleString('es-CO')}`

// `fechaFin` llega como DATEONLY ('YYYY-MM-DD'): se arma local para no correr un día.
const fechaLarga = (iso) => {
  if (!iso) return null
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es-CO', { day: 'numeric', month: 'long' })
}

const sinVencimiento = (iso) => !iso || Number(iso.slice(0, 4)) >= 2090

const espacio = (mb) => {
  if (mb >= 1024) return `${(mb / 1024).toLocaleString('es-CO', { maximumFractionDigits: 1 })} GB`
  return `${Math.max(mb, 0).toLocaleString('es-CO', { maximumFractionDigits: 1 })} MB`
}

const enlaceSolicitud = (asunto, categoria = 'facturacion') =>
  `/soporte?nuevo=1&categoria=${categoria}&asunto=${encodeURIComponent(asunto)}`

const describirActual = (suscripcion, planActual) => {
  const fecha = fechaLarga(suscripcion?.fechaFin)
  switch (suscripcion?.estado) {
    case 'prueba':
      return fecha ? `Tu prueba gratis termina el ${fecha}` : 'Estás en la prueba gratis'
    case 'solo_lectura':
    case 'vencida':
    case 'cancelada':
      return 'Tu plan no está vigente: la clínica queda en solo lectura hasta registrar el pago'
    default:
      break
  }
  if (suscripcion?.plan === 'cortesia' || sinVencimiento(suscripcion?.fechaFin)) return 'Sin vencimiento'
  const precio = planActual?.precioMensual ? `${pesos(planActual.precioMensual)} al mes · ` : ''
  return `${precio}vigente hasta el ${fecha}`
}

function BarraUso({ etiqueta, usados, limite, formato = (v) => v }) {
  if (limite === null || limite === undefined) {
    return (
      <div className="flex min-w-[200px] flex-col gap-2">
        <span className="flex justify-between gap-4 text-sm"><span>{etiqueta}</span><span className="font-semibold">{formato(usados)} · sin límite</span></span>
      </div>
    )
  }
  const pct = Math.min(100, Math.round((usados / limite) * 100))
  return (
    <div className="flex min-w-[200px] flex-col gap-2">
      <span className="flex justify-between gap-4 text-sm">
        <span>{etiqueta}</span>
        <span className="font-semibold">{formato(usados)} de {formato(limite)}</span>
      </span>
      <span className="flex h-2 rounded bg-primary-foreground/20" role="progressbar" aria-label={etiqueta} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <span className={cn('h-2 rounded', pct >= 90 ? 'bg-brand' : 'bg-primary-foreground')} style={{ width: `${pct}%` }} />
      </span>
    </div>
  )
}

function Rasgo({ incluido = true, children }) {
  return (
    <li className={cn('flex gap-2.5', !incluido && 'text-muted-foreground')}>
      {incluido ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" strokeWidth={3} /> : <Minus className="mt-0.5 h-4 w-4 shrink-0" />}
      {children}
    </li>
  )
}

function TarjetaPlan({ nombre, lema, plan, anual, actual, accion, rasgos }) {
  const precio = anual ? plan.precioAnual : plan.precioMensual
  const nota = anual
    ? `al mes, pagando ${pesos(plan.precioAnualTotal)} al año · ahorras ${pesos(plan.ahorroAnual)}`
    : 'al mes'
  return (
    <article className={cn('flex flex-col gap-[18px] rounded-2xl bg-card p-7', actual && 'ring-[3px] ring-inset ring-primary')}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <h3 className="text-[22px] font-semibold text-foreground">{nombre}</h3>
          <span className="text-[15px] text-muted-foreground">{lema}</span>
        </div>
        {actual ? <span className="shrink-0 whitespace-nowrap rounded-[5px] bg-primary px-2 py-1 text-[13px] font-semibold text-primary-foreground">Tu plan</span> : null}
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-[44px] font-semibold leading-none tracking-[-0.04em] text-foreground">{pesos(precio)}</span>
        <span className="text-sm text-muted-foreground">{nota}</span>
      </div>
      <ul className="flex flex-col gap-2.5 text-[15px] text-foreground">{rasgos}</ul>
      {accion}
    </article>
  )
}

export default function MiPlanPage() {
  const usuario = useAuthStore((state) => state.usuario)
  const clinica = useAuthStore((state) => state.clinica)
  const esAdmin = hasAnyRole(usuario, ['admin'])
  const [anual, setAnual] = useState(false)
  const [copiada, setCopiada] = useState(false)

  useEffect(() => {
    document.title = 'Mi plan | Bourgelat'
  }, [])

  const activaQuery = useQuery({
    queryKey: ['suscripcion-activa'],
    queryFn: planApi.obtenerSuscripcionActiva,
    enabled: esAdmin,
  })
  const planesQuery = useQuery({
    queryKey: ['suscripcion-planes'],
    queryFn: planApi.obtenerPlanes,
    enabled: esAdmin,
    staleTime: 60 * 60 * 1000,
  })

  if (!esAdmin) {
    return (
      <AdminShell currentKey="planes" title="Mi plan">
        <p className="rounded-2xl bg-card px-6 py-5 text-sm text-muted-foreground">
          El plan de la clínica lo maneja la administración. Si necesitas algo, pídeselo a quien administra Bourgelat en tu clínica.
        </p>
      </AdminShell>
    )
  }

  const suscripcion = activaQuery.data?.suscripcion
  const uso = activaQuery.data?.uso
  const planes = planesQuery.data?.planes || {}
  const esencial = planes.esencial
  const clinicaPlan = planes.activo
  const planActual = planes[suscripcion?.plan]
  const nombreActual = NOMBRES[suscripcion?.plan] || planActual?.nombre || 'Tu plan'
  const vencido = ['solo_lectura', 'vencida', 'cancelada'].includes(suscripcion?.estado)
  const enPlanPago = suscripcion?.estado === 'activa' && ['esencial', 'activo'].includes(suscripcion?.plan)
  const cargando = activaQuery.isPending || planesQuery.isPending

  const accionPlan = (key) => {
    const esActual = suscripcion?.plan === key && enPlanPago
    if (esActual && !anual) {
      return (
        <span className="mt-auto flex h-12 items-center justify-center rounded-[10px] bg-muted text-[15px] font-semibold text-muted-foreground">
          Es tu plan actual
        </span>
      )
    }
    const nombre = key === 'activo' ? 'Clínica' : 'Esencial'
    const texto = esActual
      ? 'Pasar a pago anual'
      : enPlanPago && key === 'esencial'
        ? 'Bajar a Esencial'
        : `Elegir ${nombre}`
    const asunto = esActual
      ? `Quiero pasar el plan ${nombre} a pago anual`
      : `Quiero el plan ${nombre}${anual ? ' con pago anual' : ''}`
    return (
      <Link
        to={enlaceSolicitud(asunto)}
        className={cn(
          'mt-auto flex h-12 items-center justify-center rounded-[10px] text-[15px] font-semibold transition hover:brightness-105 active:translate-y-px',
          key === 'activo' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground',
          FOCO
        )}
      >
        {texto}
      </Link>
    )
  }

  const copiarLlave = async () => {
    try {
      await navigator.clipboard.writeText(pagoManual.llaveBreB)
      setCopiada(true)
      setTimeout(() => setCopiada(false), 2000)
    } catch {
      setCopiada(false)
    }
  }

  const mensajeComprobante = encodeURIComponent(
    `Hola, adjunto el comprobante de pago de Bourgelat. Mi clínica es: ${clinica?.nombre || ''}`
  )

  return (
    <AdminShell currentKey="planes" title="Mi plan" hidePageHeader>
      <div className="flex flex-col gap-7 lg:pt-6">
        <section
          aria-labelledby="pl-actual"
          className={cn('flex flex-wrap items-end justify-between gap-7 rounded-2xl px-5 py-7 sm:px-9', vencido ? 'bg-danger text-primary-foreground' : 'bg-primary text-primary-foreground')}
        >
          <div className="flex flex-col gap-2.5">
            <h1 id="pl-actual" className="text-4xl font-semibold leading-none tracking-[-0.04em] sm:text-5xl">
              {cargando ? 'Tu plan' : nombreActual}
            </h1>
            <p className="text-[17px] opacity-85">{cargando ? 'Cargando…' : describirActual(suscripcion, planActual)}</p>
          </div>
          {uso ? (
            <div className="flex flex-wrap gap-7">
              <BarraUso etiqueta="Usuarios" usados={uso.usuarios.usados} limite={uso.usuarios.limite} />
              <BarraUso etiqueta="Archivos" usados={uso.almacenamientoMB.usados} limite={uso.almacenamientoMB.limite} formato={espacio} />
            </div>
          ) : null}
        </section>

        {activaQuery.isError || planesQuery.isError ? (
          <p className="rounded-xl bg-danger-soft px-4 py-3.5 text-sm text-danger">
            No pudimos cargar la información del plan. Intenta de nuevo en un momento.
          </p>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-[28px] font-semibold tracking-[-0.03em] text-foreground">Cambiar de plan</h2>
          <div role="group" aria-label="Forma de pago" className="flex gap-1 rounded-[10px] bg-secondary p-1">
            {[
              { valor: false, texto: 'Mensual' },
              { valor: true, texto: `Anual · ahorra hasta ${pesos(clinicaPlan?.ahorroAnual)}` },
            ].map((opcion) => (
              <button
                key={opcion.texto}
                type="button"
                aria-pressed={anual === opcion.valor}
                onClick={() => setAnual(opcion.valor)}
                className={cn(
                  'h-[38px] rounded-[7px] px-3.5 text-[13px] transition',
                  anual === opcion.valor ? 'bg-card font-semibold text-foreground' : 'font-medium text-muted-foreground hover:text-foreground',
                  FOCO
                )}
              >
                {opcion.texto}
              </button>
            ))}
          </div>
        </div>

        {esencial && clinicaPlan ? (
          <div className="grid gap-5 lg:grid-cols-3">
            <TarjetaPlan
              nombre="Esencial"
              lema="Para el consultorio que atiende solo"
              plan={esencial}
              anual={anual}
              actual={suscripcion?.plan === 'esencial'}
              accion={accionPlan('esencial')}
              rasgos={
                <>
                  <Rasgo>{esencial.limiteUsuarios} usuario</Rasgo>
                  <Rasgo>Agenda, historias, inventario y caja</Rasgo>
                  <Rasgo>Pacientes ilimitados</Rasgo>
                  <Rasgo>{espacio(esencial.almacenamientoMB)} para archivos y exámenes</Rasgo>
                  <Rasgo incluido={false}>Sin reportes de rentabilidad</Rasgo>
                </>
              }
            />
            <TarjetaPlan
              nombre="Clínica"
              lema="Para todo el equipo"
              plan={clinicaPlan}
              anual={anual}
              actual={suscripcion?.plan === 'activo'}
              accion={accionPlan('activo')}
              rasgos={
                <>
                  <Rasgo>{clinicaPlan.limiteUsuarios} usuarios con roles</Rasgo>
                  <Rasgo>Todo lo de Esencial</Rasgo>
                  <Rasgo>Reportes, gastos y rentabilidad</Rasgo>
                  <Rasgo>{espacio(clinicaPlan.almacenamientoMB)} para archivos y exámenes</Rasgo>
                  <Rasgo>Exportar reportes a Excel</Rasgo>
                </>
              }
            />
            <article className={cn('flex flex-col gap-[18px] rounded-2xl bg-secondary p-7', suscripcion?.plan === 'personalizado' && 'ring-[3px] ring-inset ring-primary')}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-1.5">
                  <h3 className="text-[22px] font-semibold text-foreground">Personalizado</h3>
                  <span className="text-[15px] text-muted-foreground">Varias sedes o más de {clinicaPlan.limiteUsuarios} usuarios</span>
                </div>
                {suscripcion?.plan === 'personalizado' ? (
                  <span className="shrink-0 whitespace-nowrap rounded-[5px] bg-primary px-2 py-1 text-[13px] font-semibold text-primary-foreground">Tu plan</span>
                ) : null}
              </div>
              <span className="text-[32px] font-semibold leading-tight tracking-[-0.03em] text-foreground">Lo armamos contigo</span>
              <p className="text-[15px] leading-relaxed text-foreground/85">
                Migramos tus datos, configuramos cada sede y acompañamos al equipo las primeras semanas.
              </p>
              <Link
                to={enlaceSolicitud('Quiero un plan personalizado')}
                className={cn('mt-auto flex h-12 items-center justify-center rounded-[10px] bg-card text-[15px] font-semibold text-foreground transition hover:brightness-95 active:translate-y-px', FOCO)}
              >
                Hablemos
              </Link>
            </article>
          </div>
        ) : cargando ? (
          <div className="grid gap-5 lg:grid-cols-3">
            {[0, 1, 2].map((i) => <div key={i} className="h-[420px] animate-pulse rounded-2xl bg-card" />)}
          </div>
        ) : null}

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <section aria-labelledby="pl-pago" className="flex flex-wrap items-center gap-7 rounded-2xl bg-card p-7">
            <img src={qrBourgelat} alt="Código QR de pago Bre-B de Bourgelat" className="h-[148px] w-[148px] shrink-0 rounded-[14px] bg-white p-2" />
            <div className="flex min-w-[240px] flex-1 flex-col gap-2.5">
              <h2 id="pl-pago" className="text-xl font-semibold tracking-[-0.02em] text-foreground">Cómo pagar</h2>
              <p className="text-[15px] leading-relaxed text-foreground/85">
                Escanea el código con tu banco o paga por Bre-B a la llave{' '}
                <button
                  type="button"
                  onClick={copiarLlave}
                  title="Copiar la llave"
                  className={cn('inline-flex items-center gap-1 rounded font-semibold text-primary underline-offset-2 hover:underline', FOCO)}
                >
                  {pagoManual.llaveBreB}
                  {copiada ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
                . Sube el comprobante y activamos el plan el mismo día hábil.
              </p>
              <div className="flex flex-wrap gap-2.5 pt-1">
                <Link
                  to={enlaceSolicitud('Comprobante de pago')}
                  className={cn('flex h-11 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:brightness-110 active:translate-y-px', FOCO)}
                >
                  Subir comprobante
                </Link>
                {pagoManual.whatsapp ? (
                  <a
                    href={`https://wa.me/${pagoManual.whatsapp}?text=${mensajeComprobante}`}
                    target="_blank"
                    rel="noreferrer"
                    className={cn('flex h-11 items-center rounded-lg bg-secondary px-4 text-sm font-semibold text-secondary-foreground transition hover:brightness-95', FOCO)}
                  >
                    Escribir por WhatsApp
                  </a>
                ) : null}
              </div>
            </div>
          </section>

          <section aria-labelledby="pl-dian" className="flex flex-col gap-2.5 rounded-2xl bg-warning-soft p-7 text-warning">
            <span className="self-start rounded-[5px] bg-card px-2 py-1 text-[13px] font-semibold">Próximamente</span>
            <h2 id="pl-dian" className="text-xl font-semibold">Facturación electrónica DIAN</h2>
            <p className="text-[15px] leading-relaxed">
              Un complemento para cualquier plan: tus ventas salen como factura electrónica válida ante la DIAN.
            </p>
            <Link
              to={enlaceSolicitud('Quiero que me avisen cuando llegue la facturación electrónica DIAN', 'sugerencia')}
              className={cn('mt-auto flex h-11 items-center self-start rounded-lg bg-card px-4 text-sm font-semibold transition hover:brightness-95', FOCO)}
            >
              Quiero que me avisen
            </Link>
          </section>
        </div>
      </div>
    </AdminShell>
  )
}
