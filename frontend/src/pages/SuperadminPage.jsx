import { Navigate } from 'react-router-dom'
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Activity,
  BadgeDollarSign,
  Building2,
  CalendarClock,
  CircleDollarSign,
  ShieldAlert,
  UserRoundCog,
  Waypoints,
} from 'lucide-react'
import SuperadminShell from '@/components/layout/SuperadminShell'
import { superadminApi } from '@/features/superadmin/superadminApi'
import {
  BarPanel,
  DashboardPanel,
  DataTable,
  DonutCard,
  KpiCard,
  StatusPill,
} from '@/features/dashboard/dashboardComponents'
import {
  CHART_COLORS,
  PLAN_META,
  formatCurrency,
  formatLongDate,
  formatNumber,
  objectToChartData,
} from '@/features/dashboard/dashboardUtils'
import { useAuthStore } from '@/store/authStore'

const ESTADO_SUSCRIPCION_LABELS = {
  activa: 'Activas',
  prueba: 'En prueba',
  vencida: 'Vencidas',
  cancelada: 'Canceladas',
  sin_suscripcion: 'Sin suscripcion',
}

const ESTADO_ELECTRONICO_LABELS = {
  pendiente: 'Pendientes',
  enviada: 'Enviadas',
  validada: 'Validadas',
  rechazada: 'Rechazadas',
  error: 'Con error',
}

const ESTADO_CHECK_LABELS = {
  pendiente: 'Pendiente',
  exitoso: 'Estable',
  fallido: 'Con falla',
}

const statusTone = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-700',
  danger: 'border-rose-200 bg-rose-50 text-rose-700',
  neutral: 'border-slate-200 bg-slate-100 text-slate-700',
}

const toBarData = (record) =>
  Object.entries(record || {}).map(([key, value], index) => ({
    key,
    name: key,
    total: Number(value || 0),
    fill: CHART_COLORS[index % CHART_COLORS.length],
  }))

const planLabelsFromCatalog = (catalogoPlanes = {}) =>
  Object.entries(catalogoPlanes).reduce((acc, [key, plan]) => {
    acc[key] = plan.nombre
    return acc
  }, {})

function boolPill(value, positiveLabel = 'Activo', negativeLabel = 'Pendiente') {
  return (
    <StatusPill tone={value ? statusTone.success : statusTone.warning}>
      {value ? positiveLabel : negativeLabel}
    </StatusPill>
  )
}

export default function SuperadminPage() {
  const usuario = useAuthStore((state) => state.usuario)

  const resumenQuery = useQuery({
    queryKey: ['superadmin-resumen'],
    queryFn: superadminApi.obtenerResumen,
    staleTime: 60 * 1000,
  })

  const esSuperadmin = usuario?.rol === 'superadmin'

  const planData = useMemo(
    () =>
      objectToChartData(
        resumenQuery.data?.distribuciones?.porPlan,
        planLabelsFromCatalog(resumenQuery.data?.catalogoPlanes)
      ),
    [resumenQuery.data?.catalogoPlanes, resumenQuery.data?.distribuciones?.porPlan]
  )

  const estadoSuscripcionData = useMemo(
    () =>
      objectToChartData(
        resumenQuery.data?.distribuciones?.porEstadoSuscripcion,
        ESTADO_SUSCRIPCION_LABELS
      ),
    [resumenQuery.data?.distribuciones?.porEstadoSuscripcion]
  )

  const estadoElectronicoData = useMemo(
    () =>
      objectToChartData(
        resumenQuery.data?.distribuciones?.porEstadoElectronico,
        ESTADO_ELECTRONICO_LABELS
      ),
    [resumenQuery.data?.distribuciones?.porEstadoElectronico]
  )

  const actividadPorAccionData = useMemo(
    () => toBarData(resumenQuery.data?.actividad?.porAccion),
    [resumenQuery.data?.actividad?.porAccion]
  )

  if (!esSuperadmin) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <SuperadminShell
      title="Control global de Bourgelat"
      description="Esta consola es tuya como operador del software. Aqui ves adopcion, facturacion, pruebas por vencer y los puntos sensibles de DIAN o integraciones antes de que afecten a una clinica."
      currentKey="resumen"
      asideNote="Si solo tu cuenta tiene el rol `superadmin`, solo tu veras esta consola. Los administradores de clinica siguen entrando a su propio backoffice."
      headerBadge={
        <span className="inline-flex items-center border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-700">
          Plataforma multi-tenant
        </span>
      }
    >
      {resumenQuery.isError ? (
        <div className="border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700 shadow-sm">
          No fue posible cargar la consola global. Revisa el backend o vuelve a intentar en un
          momento.
        </div>
      ) : null}

      <section id="resumen" className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          <KpiCard
            icon={Building2}
            label="Clinicas activas"
            value={formatNumber(resumenQuery.data?.resumen?.clinicasActivas || 0)}
            helper={`De ${formatNumber(resumenQuery.data?.resumen?.totalClinicas || 0)} clinicas registradas.`}
            tone="text-cyan-700"
          />
          <KpiCard
            icon={BadgeDollarSign}
            label="MRR estimado"
            value={formatCurrency(resumenQuery.data?.resumen?.mrrEstimado || 0)}
            helper="Suma del valor mensual de las suscripciones pagas vigentes."
            tone="text-emerald-700"
          />
          <KpiCard
            icon={CircleDollarSign}
            label="Facturado este mes"
            value={formatCurrency(resumenQuery.data?.resumen?.ingresosFacturadosMes || 0)}
            helper="Caja global registrada en las facturas no anuladas del mes."
            tone="text-slate-900"
          />
          <KpiCard
            icon={CalendarClock}
            label="Pruebas por vencer"
            value={formatNumber(resumenQuery.data?.resumen?.pruebasPorVencer || 0)}
            helper={`${formatNumber(resumenQuery.data?.resumen?.pruebasActivas || 0)} pruebas activas en seguimiento.`}
            tone="text-amber-700"
          />
          <KpiCard
            icon={ShieldAlert}
            label="Integraciones con fallo"
            value={formatNumber(resumenQuery.data?.resumen?.integracionesConFallo || 0)}
            helper={`${formatNumber(resumenQuery.data?.resumen?.integracionesActivas || 0)} integraciones activas en total.`}
            tone="text-rose-700"
          />
          <KpiCard
            icon={Activity}
            label="Eventos fallidos semana"
            value={formatNumber(resumenQuery.data?.resumen?.eventosFallidosSemana || 0)}
            helper="Senal temprana de errores operativos o intentos rechazados."
            tone="text-violet-700"
          />
        </div>

        <div className="grid gap-5 xl:grid-cols-3">
          <DonutCard
            title="Base comercial"
            subtitle="Distribucion actual de clinicas por plan vigente."
            data={planData}
            centerLabel="Clinicas"
            centerValue={formatNumber(resumenQuery.data?.resumen?.totalClinicas || 0)}
            emptyMessage="Aun no hay datos de suscripcion para mostrar."
          />
          <DonutCard
            title="Estado de suscripciones"
            subtitle="Te muestra cuantas clinicas estan activas y cuantas siguen en prueba."
            data={estadoSuscripcionData}
            centerLabel="Estados"
            centerValue={formatNumber(
              estadoSuscripcionData.reduce((acc, item) => acc + Number(item.value || 0), 0)
            )}
            emptyMessage="No hay estados de suscripcion disponibles."
          />
          <DonutCard
            title="Factura electronica"
            subtitle="Corte del mes para validar si la capa electronica esta fluyendo estable."
            data={estadoElectronicoData}
            centerLabel="Documentos"
            centerValue={formatNumber(
              estadoElectronicoData.reduce((acc, item) => acc + Number(item.value || 0), 0)
            )}
            emptyMessage="Todavia no hay documentos electronicos en el periodo."
          />
        </div>
      </section>

      <section id="suscripciones" className="grid gap-5 2xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <DataTable
          title="Altas recientes"
          subtitle="Las ultimas clinicas creadas y su estado comercial para que sepas que revisar primero."
          columns={[
            { key: 'nombre', label: 'Clinica' },
            { key: 'email', label: 'Contacto' },
            {
              key: 'ubicacion',
              label: 'Ciudad',
              render: (row) => [row.ciudad, row.departamento].filter(Boolean).join(', ') || '-',
            },
            {
              key: 'plan',
              label: 'Plan',
              render: (row) => {
                const meta = PLAN_META[row.plan]
                return meta ? <StatusPill tone={meta.tone}>{meta.nombre}</StatusPill> : row.plan
              },
            },
            {
              key: 'estadoSuscripcion',
              label: 'Estado',
              render: (row) => (
                <StatusPill
                  tone={
                    row.estadoSuscripcion === 'prueba'
                      ? statusTone.warning
                      : row.estadoSuscripcion === 'activa'
                        ? statusTone.success
                        : statusTone.neutral
                  }
                >
                  {ESTADO_SUSCRIPCION_LABELS[row.estadoSuscripcion] || row.estadoSuscripcion}
                </StatusPill>
              ),
            },
            {
              key: 'createdAt',
              label: 'Alta',
              render: (row) => formatLongDate(row.createdAt),
            },
          ]}
          rows={resumenQuery.data?.listas?.clinicasRecientes || []}
          emptyTitle="Todavia no hay clinicas registradas."
          emptyBody="Cuando empiecen a llegar altas nuevas, aqui veras el ritmo de crecimiento y el estado comercial de cada cuenta."
        />

        <DashboardPanel
          title="Gobierno comercial"
          subtitle="El objetivo de esta consola no es ver todo: es ver primero lo que exige una decision tuya."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-950">Nuevas clinicas del mes</p>
              <p className="mt-3 text-3xl font-semibold text-slate-950">
                {formatNumber(resumenQuery.data?.resumen?.nuevasClinicasMes || 0)}
              </p>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Te sirve para medir traccion comercial y ajustar onboarding antes de que el soporte
                se vuelva reactivo.
              </p>
            </div>
            <div className="border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-950">Usuarios activos de clinica</p>
              <p className="mt-3 text-3xl font-semibold text-slate-950">
                {formatNumber(resumenQuery.data?.resumen?.usuariosActivos || 0)}
              </p>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Es un buen indicador de adopcion real: ya no habla solo de cuentas creadas, sino de
                equipos usando el software.
              </p>
            </div>
          </div>
        </DashboardPanel>
      </section>

      <section id="gobierno" className="grid gap-5 2xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <DataTable
          title="Pruebas por vencer"
          subtitle="Las cuentas que requieren accion comercial tuya antes de caer a Inicio Gratis."
          columns={[
            { key: 'clinicaNombre', label: 'Clinica' },
            { key: 'contacto', label: 'Contacto' },
            {
              key: 'ubicacion',
              label: 'Ubicacion',
              render: (row) => [row.ciudad, row.departamento].filter(Boolean).join(', ') || '-',
            },
            {
              key: 'diasRestantes',
              label: 'Dias',
              render: (row) => (
                <StatusPill tone={row.diasRestantes <= 3 ? statusTone.danger : statusTone.warning}>
                  {row.diasRestantes} dias
                </StatusPill>
              ),
            },
            {
              key: 'fechaFin',
              label: 'Cierre',
              render: (row) => formatLongDate(row.fechaFin),
            },
          ]}
          rows={resumenQuery.data?.listas?.pruebasPorVencer || []}
          emptyTitle="No hay pruebas cercanas a vencerse."
          emptyBody="Cuando el pipeline este sano, esta tabla deberia mantenerse corta."
        />

        <DataTable
          title="Facturacion electronica por intervenir"
          subtitle="Clinicas con plan profesional o superior que aun necesitan configuracion, datos fiscales o revision tecnica."
          columns={[
            { key: 'clinicaNombre', label: 'Clinica' },
            {
              key: 'plan',
              label: 'Plan',
              render: (row) => {
                const meta = PLAN_META[row.plan]
                return meta ? <StatusPill tone={meta.tone}>{meta.nombre}</StatusPill> : row.plan
              },
            },
            {
              key: 'perfilFiscalCompleto',
              label: 'Perfil fiscal',
              render: (row) => boolPill(row.perfilFiscalCompleto, 'Completo', 'Incompleto'),
            },
            {
              key: 'integracionActiva',
              label: 'Integracion',
              render: (row) => boolPill(row.integracionActiva, 'Activa', 'Sin activar'),
            },
            {
              key: 'ultimoEstadoChequeo',
              label: 'Chequeo',
              render: (row) => (
                <StatusPill
                  tone={
                    row.ultimoEstadoChequeo === 'fallido'
                      ? statusTone.danger
                      : row.ultimoEstadoChequeo === 'exitoso'
                        ? statusTone.success
                        : statusTone.warning
                  }
                >
                  {ESTADO_CHECK_LABELS[row.ultimoEstadoChequeo] || row.ultimoEstadoChequeo}
                </StatusPill>
              ),
            },
          ]}
          rows={resumenQuery.data?.listas?.facturacionPendiente || []}
          emptyTitle="No hay clinicas bloqueadas en facturacion electronica."
          emptyBody="Cuando este bloque quede vacio, la operacion fiscal estara respirando mejor."
        />
      </section>

      <section id="operacion" className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <BarPanel
          title="Actividad sensible de la semana"
          subtitle="Acciones mas frecuentes de la plataforma para ayudarte a detectar donde se esta moviendo la operacion."
          data={actividadPorAccionData}
          dataKey="total"
          color="#0f4c81"
          formatter={formatNumber}
          emptyMessage="Aun no hay actividad reciente para visualizar."
        />

        <DashboardPanel
          title="Decisiones prioritarias"
          subtitle="Lo que normalmente deberias revisar antes de abrir el resto del software."
        >
          <div className="space-y-4">
            <div className="border border-slate-200 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-950">Pipeline comercial</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Hay{' '}
                    <span className="font-semibold text-slate-950">
                      {formatNumber(resumenQuery.data?.listas?.pruebasPorVencer?.length || 0)}
                    </span>{' '}
                    cuentas que requieren seguimiento antes de perder momentum.
                  </p>
                </div>
                <Waypoints className="h-5 w-5 text-cyan-700" />
              </div>
            </div>

            <div className="border border-slate-200 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-950">Gobierno de acceso</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Esta consola queda aislada del backoffice clinico. Sirve para ti o para un
                    grupo muy corto de operadores globales, no para clientes finales.
                  </p>
                </div>
                <UserRoundCog className="h-5 w-5 text-slate-700" />
              </div>
            </div>

            <div className="border border-slate-200 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-950">DIAN y proveedor</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    La configuracion sensible ya no queda en manos de la clinica. Desde aqui
                    priorizas los casos donde falta activacion, hay fallo tecnico o el perfil fiscal
                    sigue incompleto.
                  </p>
                </div>
                <ShieldAlert className="h-5 w-5 text-amber-700" />
              </div>
            </div>
          </div>
        </DashboardPanel>
      </section>
    </SuperadminShell>
  )
}
