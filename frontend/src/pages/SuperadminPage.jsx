import { Navigate } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Activity,
  BadgeDollarSign,
  Building2,
  CalendarClock,
  CircleDollarSign,
  Search,
  ShieldAlert,
  UserRoundCog,
  Waypoints,
} from 'lucide-react'
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
} from '@/components/ui/dialog'
import SuperadminShell from '@/components/layout/SuperadminShell'
import MoneyInput from '@/components/shared/MoneyInput'
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
import { hasRole } from '@/lib/permissions'

const ESTADO_SUSCRIPCION_LABELS = {
  activa: 'Activas',
  prueba: 'Temporal',
  vencida: 'Vencidas',
  cancelada: 'Canceladas',
  sin_suscripcion: 'Sin suscripción',
}

const ESTADO_ELECTRONICO_LABELS = {
  pendiente: 'Pendientes',
  enviada: 'Enviadas',
  validada: 'Validadas',
  rechazada: 'Rechazadas',
  error: 'Con problema',
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
  neutral: 'border-border bg-muted text-foreground',
}

const METODOS_PAGO = [
  'transferencia',
  'nequi',
  'daviplata',
  'efectivo',
  'tarjeta_credito',
  'tarjeta_debito',
  'otro',
]

const METODO_LABELS = {
  transferencia: 'Transferencia',
  nequi: 'Nequi',
  daviplata: 'Daviplata',
  efectivo: 'Efectivo',
  tarjeta_credito: 'Tarjeta crédito',
  tarjeta_debito: 'Tarjeta débito',
  otro: 'Otro',
}

const todayISO = () => new Date().toISOString().split('T')[0]
const nextYearISO = () => {
  const d = new Date()
  d.setFullYear(d.getFullYear() + 1)
  return d.toISOString().split('T')[0]
}

const inputCls =
  'w-full border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground'
const labelCls = 'block text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-1.5'

function AsignarPlanDialog({ open, onOpenChange, clinica, catalogoPlanes, onSubmit, isLoading, error }) {
  const [form, setForm] = useState({
    plan: 'activo',
    estado: 'activa',
    fechaInicio: todayISO(),
    fechaFin: nextYearISO(),
    precio: '',
    metodoPago: '',
    referenciaPago: '',
  })

  useEffect(() => {
    if (!clinica) return
    // Si la clinica esta en prueba o cortesia, el plan a asignar es el pago.
    const PLANES_NO_ASIGNABLES = ['prueba', 'cortesia', 'inicio']
    const planActual =
      clinica.plan && !PLANES_NO_ASIGNABLES.includes(clinica.plan) ? clinica.plan : 'activo'
    const precioSugerido = catalogoPlanes?.[planActual]?.precioMensual ?? ''
    setForm({
      plan: planActual,
      estado: 'activa',
      fechaInicio: todayISO(),
      fechaFin: nextYearISO(),
      precio: precioSugerido !== null ? String(precioSugerido) : '',
      metodoPago: '',
      referenciaPago: '',
    })
  }, [clinica?.id])

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const onPlanChange = (e) => {
    const plan = e.target.value
    const precio = catalogoPlanes?.[plan]?.precioMensual ?? ''
    setForm((f) => ({ ...f, plan, precio: precio !== null ? String(precio) : '' }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit({
      clinicaId: clinica.id,
      plan: form.plan,
      estado: form.estado,
      fechaInicio: form.fechaInicio,
      fechaFin: form.fechaFin,
      ...(form.precio !== '' && { precio: Number(form.precio) }),
      ...(form.metodoPago && { metodoPago: form.metodoPago }),
      ...(form.referenciaPago && { referenciaPago: form.referenciaPago }),
    })
  }

  const planInfo = catalogoPlanes?.[form.plan]

  return (
    <DialogRoot open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Asignar plan</DialogTitle>
          {clinica ? (
            <DialogDescription>
              {clinica.nombre} · {clinica.email}
            </DialogDescription>
          ) : null}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Plan</label>
              <select value={form.plan} onChange={onPlanChange} className={inputCls} required>
                {Object.entries(catalogoPlanes || {}).map(([key, p]) => (
                  <option key={key} value={key}>
                    {p.nombre}
                  </option>
                ))}
              </select>
              {planInfo ? (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Hasta {planInfo.limiteUsuarios ?? '∞'} usuarios · {planInfo.limiteMascotas ?? '∞'} mascotas
                </p>
              ) : null}
            </div>

            <div>
              <label className={labelCls}>Estado</label>
              <select value={form.estado} onChange={set('estado')} className={inputCls} required>
                <option value="activa">Activa</option>
                <option value="prueba">Temporal / prueba</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Fecha inicio</label>
              <input type="date" value={form.fechaInicio} onChange={set('fechaInicio')} className={inputCls} required />
            </div>
            <div>
              <label className={labelCls}>Fecha fin</label>
              <input type="date" value={form.fechaFin} onChange={set('fechaFin')} className={inputCls} required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Precio cobrado (COP)</label>
              <MoneyInput
                placeholder="Ej: 189.000"
                value={form.precio}
                onChange={(value) => setForm((f) => ({ ...f, precio: value === 0 ? '' : String(value) }))}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Método de pago</label>
              <select value={form.metodoPago} onChange={set('metodoPago')} className={inputCls}>
                <option value="">— Opcional —</option>
                {METODOS_PAGO.map((m) => (
                  <option key={m} value={m}>
                    {METODO_LABELS[m]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls}>Referencia de pago</label>
            <input
              type="text"
              placeholder="Ej: TRF-2026-001"
              value={form.referenciaPago}
              onChange={set('referenciaPago')}
              className={inputCls}
            />
          </div>

          {error ? (
            <p className="border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error?.response?.data?.message || error?.message || 'Error al asignar el plan.'}
            </p>
          ) : null}

          <DialogFooter className="pt-2">
            <DialogClose asChild>
              <button
                type="button"
                className="border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-muted"
              >
                Cancelar
              </button>
            </DialogClose>
            <button
              type="submit"
              disabled={isLoading}
              className="border border-primary bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
            >
              {isLoading ? 'Guardando...' : 'Confirmar asignación'}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </DialogRoot>
  )
}

function GestionPlanesSection({ catalogoPlanes }) {
  const queryClient = useQueryClient()
  const [busqueda, setBusqueda] = useState('')
  const [clinicaSeleccionada, setClinicaSeleccionada] = useState(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const clinicasQuery = useQuery({
    queryKey: ['superadmin-clinicas'],
    queryFn: superadminApi.listarClinicas,
    staleTime: 60 * 1000,
  })

  const asignarMutation = useMutation({
    mutationFn: superadminApi.asignarPlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin-clinicas'] })
      queryClient.invalidateQueries({ queryKey: ['superadmin-resumen'] })
      setDialogOpen(false)
    },
  })

  const clinicasFiltradas = useMemo(() => {
    const lista = clinicasQuery.data?.clinicas || []
    if (!busqueda.trim()) return lista
    const q = busqueda.toLowerCase()
    return lista.filter(
      (c) =>
        c.nombre?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.ciudad?.toLowerCase().includes(q)
    )
  }, [clinicasQuery.data?.clinicas, busqueda])

  function abrirDialog(clinica) {
    setClinicaSeleccionada(clinica)
    asignarMutation.reset()
    setDialogOpen(true)
  }

  return (
    <section id="planes">
      <DataTable
        title="Gestion de planes"
        subtitle="Busca una clínica y asígnale el plan que corresponde según el acuerdo comercial. La asignación es inmediata y cancela cualquier suscripción anterior."
        action={
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por nombre, correo o ciudad..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-72 border border-border bg-background py-2 pl-9 pr-4 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
            />
          </div>
        }
        columns={[
          { key: 'nombre', label: 'Clínica' },
          { key: 'email', label: 'Contacto' },
          {
            key: 'ciudad',
            label: 'Ciudad',
            render: (row) => [row.ciudad, row.departamento].filter(Boolean).join(', ') || '—',
          },
          {
            key: 'plan',
            label: 'Plan actual',
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
                  row.estadoSuscripcion === 'activa'
                    ? statusTone.success
                    : row.estadoSuscripcion === 'prueba'
                      ? statusTone.warning
                      : statusTone.neutral
                }
              >
                {ESTADO_SUSCRIPCION_LABELS[row.estadoSuscripcion] || row.estadoSuscripcion}
              </StatusPill>
            ),
          },
          {
            key: 'fechaFin',
            label: 'Vence',
            render: (row) => (row.fechaFin ? formatLongDate(row.fechaFin) : '—'),
          },
          {
            key: 'acciones',
            label: '',
            render: (row) => (
              <button
                type="button"
                onClick={() => abrirDialog(row)}
                className="border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-muted"
              >
                Asignar plan
              </button>
            ),
          },
        ]}
        rows={clinicasFiltradas}
        emptyTitle={
          busqueda ? `Sin resultados para "${busqueda}".` : 'No hay clínicas registradas.'
        }
        emptyBody={
          busqueda
            ? 'Intenta con otro nombre, correo o ciudad.'
            : 'Cuando se creen cuentas en la plataforma aparecerán aquí.'
        }
      />

      <AsignarPlanDialog
        open={dialogOpen}
        onOpenChange={(v) => {
          setDialogOpen(v)
          if (!v) asignarMutation.reset()
        }}
        clinica={clinicaSeleccionada}
        catalogoPlanes={catalogoPlanes}
        onSubmit={(payload) => asignarMutation.mutate(payload)}
        isLoading={asignarMutation.isPending}
        error={asignarMutation.error}
      />
    </section>
  )
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

  const esSuperadmin = hasRole(usuario, 'superadmin')

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
      description="Este panel es tuyo como responsable de la plataforma. Aquí ves adopción, facturación, activaciones temporales por vencer y los puntos delicados de DIAN o integraciones antes de que afecten a una clínica."
      currentKey="resumen"
      asideNote="Si solo tu cuenta es administradora de la plataforma, solo tú verás este panel. Los administradores de cada clínica siguen entrando al panel de su clínica."
      headerBadge={
        <span className="inline-flex items-center border border-border bg-muted px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground">
          Todas las clínicas
        </span>
      }
    >
      {resumenQuery.isError ? (
        <div className="border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700 shadow-sm">
          No pudimos cargar la información. Intenta de nuevo en unos segundos.
        </div>
      ) : null}

      <section id="resumen" className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          <KpiCard
            icon={Building2}
            label="Clinicas activas"
            value={formatNumber(resumenQuery.data?.resumen?.clinicasActivas || 0)}
            helper={`De ${formatNumber(resumenQuery.data?.resumen?.totalClinicas || 0)} clinicas registradas.`}
            tone="text-primary"
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
            tone="text-foreground"
          />
          <KpiCard
            icon={CalendarClock}
            label="Vigencias por vencer"
            value={formatNumber(resumenQuery.data?.resumen?.pruebasPorVencer || 0)}
            helper={`${formatNumber(resumenQuery.data?.resumen?.pruebasActivas || 0)} activaciones temporales en seguimiento.`}
            tone="text-amber-700"
          />
          <KpiCard
            icon={ShieldAlert}
            label="Integraciones con problema"
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
            subtitle="Distribución actual de clínicas por plan vigente."
            data={planData}
            centerLabel="Clinicas"
            centerValue={formatNumber(resumenQuery.data?.resumen?.totalClinicas || 0)}
            emptyMessage="Aún no hay datos de suscripción para mostrar."
          />
          <DonutCard
            title="Estado de suscripciones"
            subtitle="Te muestra cuántas clínicas están activas y cuántas siguen en activación temporal."
            data={estadoSuscripcionData}
            centerLabel="Estados"
            centerValue={formatNumber(
              estadoSuscripcionData.reduce((acc, item) => acc + Number(item.value || 0), 0)
            )}
            emptyMessage="No hay estados de suscripción disponibles."
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
          subtitle="Las últimas clínicas creadas y su estado comercial, para que sepas qué revisar primero."
          columns={[
            { key: 'nombre', label: 'Clínica' },
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
          emptyTitle="Todavía no hay clínicas registradas."
          emptyBody="Cuando empiecen a llegar cuentas nuevas, aquí verás el ritmo de crecimiento y el estado comercial de cada una."
        />

        <DashboardPanel
          title="Gobierno comercial"
          subtitle="El objetivo de este panel no es ver todo: es ver primero lo que exige una decisión tuya."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="border border-border bg-muted p-4">
              <p className="text-sm font-semibold text-slate-950">Nuevas clínicas del mes</p>
              <p className="mt-3 text-3xl font-semibold text-slate-950">
                {formatNumber(resumenQuery.data?.resumen?.nuevasClinicasMes || 0)}
              </p>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Te sirve para medir traccion comercial y ajustar onboarding antes de que el soporte
                se vuelva reactivo.
              </p>
            </div>
            <div className="border border-border bg-muted p-4">
              <p className="text-sm font-semibold text-slate-950">Usuarios activos de clinica</p>
              <p className="mt-3 text-3xl font-semibold text-slate-950">
                {formatNumber(resumenQuery.data?.resumen?.usuariosActivos || 0)}
              </p>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Es un buen indicador de adopcion real: ya no habla solo de cuentas creadas, sino de
                equipos usando el software.
              </p>
            </div>
          </div>
        </DashboardPanel>
      </section>

      <GestionPlanesSection catalogoPlanes={resumenQuery.data?.catalogoPlanes} />

      <section id="gobierno" className="grid gap-5 2xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <DataTable
          title="Activaciones temporales por vencer"
          subtitle="Las cuentas que requieren una acción comercial tuya antes de pasar a Esencial."
          columns={[
            { key: 'clinicaNombre', label: 'Clínica' },
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
          emptyTitle="No hay activaciones temporales cercanas a vencerse."
          emptyBody="Cuando el pipeline este sano, esta tabla deberia mantenerse corta."
        />

        <DataTable
          title="Facturación electrónica por revisar"
          subtitle="Clínicas con plan profesional o superior que aún necesitan configuración, datos fiscales o apoyo de soporte."
          columns={[
            { key: 'clinicaNombre', label: 'Clínica' },
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
              label: 'Integración',
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
          emptyTitle="No hay clínicas bloqueadas en facturación electrónica."
          emptyBody="Cuando este bloque quede vacío, la operación fiscal estará al día."
        />
      </section>

      <section id="operacion" className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <BarPanel
          title="Actividad sensible de la semana"
          subtitle="Acciones más frecuentes de la plataforma, para ayudarte a detectar dónde se está moviendo la operación."
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
            <div className="border border-border p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-950">Pipeline comercial</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Hay{' '}
                    <span className="font-semibold text-slate-950">
                      {formatNumber(resumenQuery.data?.listas?.pruebasPorVencer?.length || 0)}
                    </span>{' '}
                    cuentas que requieren seguimiento antes de perder ritmo comercial.
                  </p>
                </div>
                <Waypoints className="h-5 w-5 text-primary" />
              </div>
            </div>

            <div className="border border-border p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-950">Gobierno de acceso</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Este panel queda separado del panel de las clínicas. Sirve para ti o para un
                    grupo muy corto de responsables de la plataforma, no para clientes finales.
                  </p>
                </div>
                <UserRoundCog className="h-5 w-5 text-foreground" />
              </div>
            </div>

            <div className="border border-border p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-950">DIAN y proveedor</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
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
