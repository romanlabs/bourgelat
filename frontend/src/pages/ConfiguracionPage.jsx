import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Building2,
  CalendarOff,
  Clock,
  Mail,
  Phone,
  Plus,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
  Wallet,
} from 'lucide-react'
import AdminShell from '@/components/layout/AdminShell'
import { NavCta } from '@/components/shared/NavCta'
import { EmptyState } from '@/components/shared/EmptyState'
import { HoraPicker } from '@/components/shared/HoraPicker'
import {
  DialogRoot,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { formatHora12, formatFranja12 } from '@/lib/hora'
import {
  DashboardPanel,
  KpiCard,
  StatusPill,
} from '@/features/dashboard/dashboardComponents'
import { formatNumber } from '@/features/dashboard/dashboardUtils'
import { configuracionApi } from '@/features/configuracion/configuracionApi'
import { recepcionApi } from '@/features/recepcion/recepcionApi'
import colombia from '@/data/colombia'
import { useAuthStore } from '@/store/authStore'
import { hasAnyRole } from '@/lib/permissions'
import { tieneFuncionalidad, FUNCIONALIDAD_DIAN } from '@/lib/suscripcion'
import { Select } from '@/components/ui/select'

const PERSON_TYPE_OPTIONS = [
  { value: 'persona_juridica', label: 'Persona jurídica' },
  { value: 'persona_natural', label: 'Persona natural' },
]

const FISCAL_DOCUMENT_OPTIONS = [
  { value: '3', label: 'Cédula de ciudadanía' },
  { value: '5', label: 'Cédula de extranjería' },
  { value: '6', label: 'NIT' },
  { value: '7', label: 'Pasaporte' },
]

const LEGAL_ORGANIZATION_OPTIONS = [
  { value: '1', label: 'Persona jurídica' },
  { value: '2', label: 'Persona natural' },
]

const FACTUS_ENV_OPTIONS = [
  { value: 'sandbox', label: 'Sandbox (pruebas)' },
  { value: 'production', label: 'Producción' },
]

const FISCAL_FIELD_LABELS = {
  nit: 'NIT',
  razonSocial: 'Razón social',
  direccion: 'Dirección principal',
  telefono: 'Celular principal',
  email: 'Correo institucional',
  municipioId: 'Municipio DIAN',
  tipoDocumentoFacturacionId: 'Documento fiscal',
  organizacionJuridicaId: 'Organización jurídica',
  tributoId: 'Tributo',
}

const INPUT_CLASS =
  'h-11 border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary'
const LABEL_CLASS = 'text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground'

const normalizeEmail = (value) => value.trim().toLowerCase()
const normalizePhone = (value) => value.replace(/\D/g, '').slice(0, 10)
const normalizeNit = (value) => value.replace(/\D/g, '').slice(0, 15)

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.errores?.[0]?.mensaje || error?.response?.data?.message || fallback

const buildClinicForm = (clinica) => ({
  nombre: clinica?.nombre || '',
  nombreComercial: clinica?.nombreComercial || '',
  razonSocial: clinica?.razonSocial || '',
  tipoPersona: clinica?.tipoPersona || 'persona_juridica',
  email: clinica?.email || '',
  telefono: clinica?.telefono || '',
  direccion: clinica?.direccion || '',
  departamento: clinica?.departamento || '',
  ciudad: clinica?.ciudad || '',
  codigoPostal: clinica?.codigoPostal || '',
  nit: clinica?.nit || '',
  digitoVerificacion: clinica?.digitoVerificacion || '',
  municipioId: clinica?.municipioId ? String(clinica.municipioId) : '',
  tipoDocumentoFacturacionId: clinica?.tipoDocumentoFacturacionId
    ? String(clinica.tipoDocumentoFacturacionId)
    : '',
  organizacionJuridicaId: clinica?.organizacionJuridicaId || '',
  tributoId: clinica?.tributoId || '',
  logo: clinica?.logo || '',
})

const buildFactusForm = (data) => ({
  activa: Boolean(data?.integracion?.activa || data?.configuracionEfectiva?.activa),
  ambiente: data?.integracion?.ambiente || data?.configuracionEfectiva?.ambiente || 'sandbox',
  baseUrl: data?.integracion?.baseUrl || data?.configuracionEfectiva?.baseUrl || '',
  clientId: '',
  clientSecret: '',
  username: '',
  password: '',
  rangoNumeracionId: data?.integracion?.rangoNumeracionId ? String(data.integracion.rangoNumeracionId) : '',
  documentoCodigo: data?.integracion?.documentoCodigo || '01',
  formaPagoCodigo: data?.integracion?.formaPagoCodigo || '1',
  metodoPagoCodigo: data?.integracion?.metodoPagoCodigo || '10',
  enviarEmail: Boolean(data?.integracion?.enviarEmail),
})

const formatDateTime = (value) => {
  if (!value) return 'Sin revisión reciente'

  try {
    return new Intl.DateTimeFormat('es-CO', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value))
  } catch {
    return 'Sin revisión reciente'
  }
}

const formatCredentialSource = (value) => {
  const sourceMap = {
    integracion: 'Claves propias',
    env: 'Claves generales de Bourgelat',
    mixta: 'Mixta',
    ninguna: 'Sin claves configuradas',
  }

  return sourceMap[value] || 'Sin definir'
}

function FormField({ label, helper, required = false, children }) {
  return (
    <label className="grid gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className={LABEL_CLASS}>{label}</span>
        {required ? (
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-700">
            Requerido
          </span>
        ) : null}
      </div>
      {children}
      {helper ? <p className="text-xs leading-6 text-muted-foreground">{helper}</p> : null}
    </label>
  )
}

function RestrictedConfigPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <DashboardPanel
          title="Configuración de clínica"
          subtitle="Esta sección se reserva para la administración principal."
        >
          <div className="border border-border bg-muted px-4 py-5 text-sm leading-7 text-muted-foreground">
            Tu acceso actual no tiene permisos para editar la configuración institucional o fiscal
            de la clínica.
          </div>
        </DashboardPanel>
      </div>
    </div>
  )
}

function ConfiguracionContent({
  initialClinica,
  perfilFiscal,
  initialFactus,
  puedeVerFacturacionElectronica,
  puedeEditarFacturacionElectronica,
  setClinica,
}) {
  const queryClient = useQueryClient()
  const [activeSection, setActiveSection] = useState('resumen')
  const [clinicForm, setClinicForm] = useState(() => buildClinicForm(initialClinica))
  const [factusForm, setFactusForm] = useState(() => buildFactusForm(initialFactus))

  useEffect(() => {
    setClinicForm(buildClinicForm(initialClinica))
  }, [initialClinica])

  useEffect(() => {
    setFactusForm(buildFactusForm(initialFactus))
  }, [initialFactus])

  const ciudadesDisponibles = useMemo(() => {
    const match = colombia.find((item) => item.departamento === clinicForm.departamento)
    return match?.ciudades || []
  }, [clinicForm.departamento])

  const camposPendientes = useMemo(
    () =>
      (perfilFiscal?.camposFaltantes || []).map((field) => FISCAL_FIELD_LABELS[field] || field),
    [perfilFiscal?.camposFaltantes]
  )

  const datosBaseCubiertos = useMemo(() => {
    const fields = [
      clinicForm.nombre,
      clinicForm.email,
      clinicForm.telefono,
      clinicForm.direccion,
      clinicForm.departamento,
      clinicForm.ciudad,
    ]

    return fields.filter(Boolean).length
  }, [
    clinicForm.ciudad,
    clinicForm.departamento,
    clinicForm.direccion,
    clinicForm.email,
    clinicForm.nombre,
    clinicForm.telefono,
  ])

  const integracionFactus = initialFactus?.integracion || null
  const configuracionEfectiva = initialFactus?.configuracionEfectiva || null
  const configuracionLocal = initialFactus?.configuracionLocal || null
  const credencialesCompletas = Boolean(configuracionEfectiva?.credencialesCompletas)
  const estadoFactus = integracionFactus?.ultimoEstadoChequeo || null

  const actualizarClinicaMutation = useMutation({
    mutationFn: configuracionApi.actualizarClinica,
    onSuccess: (data) => {
      toast.success(data?.message || 'Configuración actualizada correctamente')
      if (data?.clinica) {
        setClinica(data.clinica)
        setClinicForm(buildClinicForm(data.clinica))
      }
      queryClient.invalidateQueries({ queryKey: ['configuracion-clinica'] })
      queryClient.invalidateQueries({ queryKey: ['suscripcion-activa'] })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'No fue posible actualizar la configuración de la clínica.'))
    },
  })

  const guardarFactusMutation = useMutation({
    mutationFn: configuracionApi.guardarConfiguracionFactus,
    onSuccess: (data) => {
      toast.success(data?.message || 'Configuración de Factus guardada correctamente')
      queryClient.invalidateQueries({ queryKey: ['configuracion-factus'] })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'No fue posible guardar la configuración de Factus.'))
    },
  })

  const probarFactusMutation = useMutation({
    mutationFn: configuracionApi.probarFactus,
    onSuccess: (data) => {
      toast.success(data?.message || 'Conexion con Factus exitosa')
      queryClient.invalidateQueries({ queryKey: ['configuracion-factus'] })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'No fue posible probar la conexion con Factus.'))
    },
  })

  const sincronizarFactusMutation = useMutation({
    mutationFn: configuracionApi.sincronizarFactus,
    onSuccess: (data) => {
      toast.success(data?.message || 'Sincronización con Factus exitosa')
      queryClient.invalidateQueries({ queryKey: ['configuracion-factus'] })
      queryClient.invalidateQueries({ queryKey: ['configuracion-clinica'] })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'No fue posible sincronizar Factus.'))
    },
  })

  const handleSaveClinica = (event) => {
    event.preventDefault()

    const payload = {
      nombre: clinicForm.nombre.trim(),
      nombreComercial: clinicForm.nombreComercial.trim(),
      razonSocial: clinicForm.razonSocial.trim(),
      tipoPersona: clinicForm.tipoPersona,
      email: normalizeEmail(clinicForm.email),
      telefono: normalizePhone(clinicForm.telefono),
      direccion: clinicForm.direccion.trim(),
      departamento: clinicForm.departamento,
      ciudad: clinicForm.ciudad,
      codigoPostal: clinicForm.codigoPostal.trim(),
      nit: normalizeNit(clinicForm.nit),
      digitoVerificacion: clinicForm.digitoVerificacion.trim(),
      municipioId: clinicForm.municipioId,
      tipoDocumentoFacturacionId: clinicForm.tipoDocumentoFacturacionId,
      organizacionJuridicaId: clinicForm.organizacionJuridicaId.trim(),
      tributoId: clinicForm.tributoId.trim(),
      logo: clinicForm.logo.trim(),
    }

    if (payload.nombre.length < 3) {
      toast.error('El nombre institucional debe tener al menos 3 caracteres.')
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
      toast.error('Ingresa un correo institucional válido.')
      return
    }

    if (payload.telefono && !/^3\d{9}$/.test(payload.telefono)) {
      toast.error('El teléfono debe ser un celular colombiano válido de 10 dígitos.')
      return
    }

    if ((payload.departamento && !payload.ciudad) || (!payload.departamento && payload.ciudad)) {
      toast.error('Completa departamento y ciudad juntos para mantener la ficha institucional consistente.')
      return
    }

    if (payload.logo && !/^https?:\/\/.+/i.test(payload.logo)) {
      toast.error('La URL del logo debe iniciar con http:// o https://.')
      return
    }

    actualizarClinicaMutation.mutate({
      ...payload,
      nombreComercial: payload.nombreComercial || '',
      razonSocial: payload.razonSocial || '',
      direccion: payload.direccion || '',
      codigoPostal: payload.codigoPostal || '',
      nit: payload.nit || '',
      digitoVerificacion: payload.digitoVerificacion || '',
      municipioId: payload.municipioId || '',
      tipoDocumentoFacturacionId: payload.tipoDocumentoFacturacionId || '',
      organizacionJuridicaId: payload.organizacionJuridicaId || '',
      tributoId: payload.tributoId || '',
      logo: payload.logo || '',
    })
  }

  const handleSaveFactus = (event) => {
    event.preventDefault()

    if (factusForm.baseUrl && !/^https?:\/\/.+/i.test(factusForm.baseUrl.trim())) {
      toast.error('La URL base de Factus debe iniciar con http:// o https://.')
      return
    }

    if (factusForm.rangoNumeracionId && !/^\d+$/.test(factusForm.rangoNumeracionId)) {
      toast.error('El rango de numeración debe ser numérico.')
      return
    }

    guardarFactusMutation.mutate({
      activa: factusForm.activa,
      ambiente: factusForm.ambiente,
      baseUrl: factusForm.baseUrl.trim() || undefined,
      clientId: factusForm.clientId.trim() || undefined,
      clientSecret: factusForm.clientSecret.trim() || undefined,
      username: factusForm.username.trim() || undefined,
      password: factusForm.password.trim() || undefined,
      rangoNumeracionId: factusForm.rangoNumeracionId
        ? Number(factusForm.rangoNumeracionId)
        : undefined,
      documentoCodigo: factusForm.documentoCodigo.trim() || undefined,
      formaPagoCodigo: factusForm.formaPagoCodigo.trim() || undefined,
      metodoPagoCodigo: factusForm.metodoPagoCodigo.trim() || undefined,
      enviarEmail: factusForm.enviarEmail,
    })
  }

  const sectionOptions = [
    { id: 'resumen', label: 'Resumen', helper: 'Panorama institucional' },
    { id: 'ficha', label: 'Ficha editable', helper: 'Identidad, contacto y fiscal' },
    { id: 'consultorios', label: 'Consultorios', helper: 'Salas usadas por recepción y agenda' },
    { id: 'horarios', label: 'Horarios y cierres', helper: 'Horario de atención y días bloqueados' },
    ...(puedeVerFacturacionElectronica
      ? [{ id: 'facturacion', label: 'Facturación electrónica', helper: 'Estado e integración' }]
      : []),
  ]

  return (
    <div className="space-y-5">
      <DashboardPanel
        title="Organiza esta configuración por bloques"
        subtitle="Primero revisa el resumen, luego edita la ficha institucional y deja la facturación electrónica en una vista separada."
        action={
          <StatusPill tone="border-border bg-muted text-foreground">
            Configuracion guiada
          </StatusPill>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
          {sectionOptions.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => setActiveSection(section.id)}
              className={`border px-4 py-4 text-left transition ${
                activeSection === section.id
                  ? 'border-primary bg-primary/10'
                  : 'border-border bg-muted hover:border-border hover:bg-white'
              }`}
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {section.label}
              </p>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{section.helper}</p>
            </button>
          ))}
        </div>
      </DashboardPanel>

      <div className="grid gap-4 xl:grid-cols-4">
        <KpiCard
          icon={Building2}
          label="Ficha institucional"
          value={`${formatNumber(datosBaseCubiertos)}/6`}
          helper="Nombre, correo, celular, dirección, departamento y ciudad listos para operar."
          tone="text-primary"
        />
        <KpiCard
          icon={Mail}
          label="Contacto principal"
          value={clinicForm.email ? 'Listo' : 'Pendiente'}
          helper={clinicForm.email || 'Define un correo institucional para respuestas y documentos.'}
          tone={clinicForm.email ? 'text-emerald-700' : 'text-amber-700'}
          borderTone={clinicForm.email ? 'border-border' : 'border-amber-300'}
        />
        <KpiCard
          icon={Phone}
          label="Linea administrativa"
          value={clinicForm.telefono ? 'Activa' : 'Pendiente'}
          helper={clinicForm.telefono || 'Agrega un celular colombiano válido para el contacto principal.'}
          tone={clinicForm.telefono ? 'text-emerald-700' : 'text-amber-700'}
          borderTone={clinicForm.telefono ? 'border-border' : 'border-amber-300'}
        />
        <KpiCard
          icon={ShieldCheck}
          label="Perfil fiscal"
          value={perfilFiscal?.listoParaFacturacion ? 'Listo' : `${formatNumber(camposPendientes.length)} pendientes`}
          helper={
            perfilFiscal?.listoParaFacturacion
              ? 'La clínica ya tiene base institucional y fiscal para una operación más formal.'
              : 'Completa la ficha para habilitar una salida tributaria más ordenada.'
          }
          tone={perfilFiscal?.listoParaFacturacion ? 'text-emerald-700' : 'text-amber-700'}
          borderTone={perfilFiscal?.listoParaFacturacion ? 'border-border' : 'border-amber-300'}
        />
      </div>

      {activeSection === 'resumen' ? (
        <div className="grid gap-5 2xl:grid-cols-[minmax(0,1.2fr)_400px]">
          <DashboardPanel
            title="Lectura institucional"
            subtitle="Lo que ya esta listo para operar, comunicarse y presentarse de forma coherente al equipo y al cliente."
          >
            <div className="space-y-4">
              <div className="border border-border bg-muted px-4 py-4 text-sm leading-7 text-muted-foreground">
                <p className="font-semibold text-foreground">
                  {clinicForm.nombreComercial || clinicForm.nombre || 'Clinica sin nombre visible'}
                </p>
                <p>{clinicForm.razonSocial || 'Razon social pendiente'}</p>
                <p>
                  {[clinicForm.ciudad, clinicForm.departamento].filter(Boolean).join(', ') ||
                    'Ubicación pendiente'}
                </p>
                <p>{clinicForm.email || 'Correo pendiente'}</p>
                <p>{clinicForm.telefono || 'Celular pendiente'}</p>
              </div>

              <div className="grid gap-3 xl:grid-cols-2">
                <div className="border border-border bg-card px-4 py-3 text-sm text-foreground">
                  Nombre visible:{' '}
                  <span className="font-semibold text-slate-950">
                    {clinicForm.nombreComercial || clinicForm.nombre || 'Pendiente'}
                  </span>
                </div>
                <div className="border border-border bg-card px-4 py-3 text-sm text-foreground">
                  Logo institucional:{' '}
                  <span className="font-semibold text-slate-950">
                    {clinicForm.logo ? 'Disponible' : 'Pendiente'}
                  </span>
                </div>
                <div className="border border-border bg-card px-4 py-3 text-sm text-foreground">
                  Contacto principal:{' '}
                  <span className="font-semibold text-slate-950">
                    {clinicForm.email ? 'Listo' : 'Pendiente'}
                  </span>
                </div>
                <div className="border border-border bg-card px-4 py-3 text-sm text-foreground">
                  Perfil fiscal:{' '}
                  <span className="font-semibold text-slate-950">
                    {perfilFiscal?.listoParaFacturacion ? 'Listo' : 'En ajuste'}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={() => setActiveSection('ficha')}
                  className="border border-border bg-foreground px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Editar ficha institucional
                </button>
                {puedeVerFacturacionElectronica ? (
                  <button
                    type="button"
                    onClick={() => setActiveSection('facturacion')}
                    className="border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-muted"
                  >
                    Ver facturacion electronica
                  </button>
                ) : null}
              </div>
            </div>
          </DashboardPanel>

          <div className="space-y-5">
            <DashboardPanel
              title="Pendientes fiscales"
              subtitle="Lo que aun falta para dejar la salida tributaria mas completa."
            >
              {camposPendientes.length ? (
                <div className="space-y-3">
                  <div className="border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-7 text-amber-800">
                    Todavia faltan datos fiscales base. Completa esta lista antes de formalizar la
                    facturacion electronica.
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {camposPendientes.map((item) => (
                      <StatusPill key={item} tone="border-amber-200 bg-white text-amber-700">
                        {item}
                      </StatusPill>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm leading-7 text-emerald-700">
                  La ficha fiscal ya tiene la informacion base para una operacion mas profesional.
                </div>
              )}
            </DashboardPanel>

            <DashboardPanel
              title="Criterio de administración"
              subtitle="La clínica mantiene sus datos base; la configuración delicada con DIAN y Factus se controla aparte."
            >
              <div className="space-y-3">
                <div className="border border-border bg-muted px-4 py-4 text-sm leading-7 text-muted-foreground">
                  Esta separacion reduce errores y evita que el cliente mezcle configuracion visible
                  con claves de acceso o cambios delicados de integración.
                </div>
                <NavCta to="/finanzas" icon={Wallet} variant="outline" className="w-full justify-center">
                  Ir a finanzas
                </NavCta>
              </div>
            </DashboardPanel>
          </div>
        </div>
      ) : null}

      {activeSection === 'ficha' ? (
      <div className="grid gap-5 2xl:grid-cols-[minmax(0,1.2fr)_400px]">
        <DashboardPanel
          title="Ficha institucional editable"
          subtitle="Aquí conviene editar nombre visible, contacto, dirección y datos fiscales, sin mezclarlo con la facturación electrónica."
          action={
            <StatusPill
              tone={
                perfilFiscal?.listoParaFacturacion
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-amber-200 bg-amber-50 text-amber-700'
              }
            >
              {perfilFiscal?.listoParaFacturacion ? 'Perfil fiscal listo' : 'Perfil fiscal pendiente'}
            </StatusPill>
          }
        >
          <form className="grid gap-4" onSubmit={handleSaveClinica}>
            <div className="grid gap-4 xl:grid-cols-2">
              <FormField label="Nombre institucional" required>
                <input
                  type="text"
                  value={clinicForm.nombre}
                  onChange={(event) => setClinicForm((current) => ({ ...current, nombre: event.target.value }))}
                  placeholder="Clinica Veterinaria Bourgelat"
                  className={INPUT_CLASS}
                />
              </FormField>
              <FormField
                label="Nombre comercial"
                helper="Es el nombre que normalmente veran tutores y equipo operativo."
              >
                <input
                  type="text"
                  value={clinicForm.nombreComercial}
                  onChange={(event) =>
                    setClinicForm((current) => ({ ...current, nombreComercial: event.target.value }))
                  }
                  placeholder="Bourgelat"
                  className={INPUT_CLASS}
                />
              </FormField>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <FormField label="Razon social">
                <input
                  type="text"
                  value={clinicForm.razonSocial}
                  onChange={(event) =>
                    setClinicForm((current) => ({ ...current, razonSocial: event.target.value }))
                  }
                  placeholder="Clinica Veterinaria Bourgelat SAS"
                  className={INPUT_CLASS}
                />
              </FormField>
              <FormField label="Tipo de persona">
                <Select
                  variant="field"
                  aria-label="Tipo de persona"
                  value={clinicForm.tipoPersona}
                  onValueChange={(value) =>
                    setClinicForm((current) => ({ ...current, tipoPersona: value }))
                  }
                  options={PERSON_TYPE_OPTIONS}
                />
              </FormField>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <FormField label="Correo institucional" required>
                <input
                  type="email"
                  value={clinicForm.email}
                  onChange={(event) => setClinicForm((current) => ({ ...current, email: event.target.value }))}
                  placeholder="administracion@tuclinica.co"
                  className={INPUT_CLASS}
                />
              </FormField>
              <FormField
                label="Celular principal"
                helper="Solo celulares colombianos de 10 digitos, por ejemplo 3001234567."
              >
                <input
                  type="text"
                  inputMode="numeric"
                  value={clinicForm.telefono}
                  onChange={(event) =>
                    setClinicForm((current) => ({ ...current, telefono: normalizePhone(event.target.value) }))
                  }
                  placeholder="3001234567"
                  className={INPUT_CLASS}
                />
              </FormField>
            </div>

            <FormField label="Dirección principal">
              <input
                type="text"
                value={clinicForm.direccion}
                onChange={(event) => setClinicForm((current) => ({ ...current, direccion: event.target.value }))}
                placeholder="Calle 123 # 45 - 67"
                className={INPUT_CLASS}
              />
            </FormField>

            <div className="grid gap-4 2xl:grid-cols-3">
              <FormField label="Departamento">
                <Select
                  variant="field"
                  aria-label="Departamento"
                  placeholder="Selecciona departamento"
                  value={clinicForm.departamento}
                  onValueChange={(value) =>
                    setClinicForm((current) => ({
                      ...current,
                      departamento: value,
                      ciudad: '',
                    }))
                  }
                  options={colombia.map((item) => ({
                    value: item.departamento,
                    label: item.departamento,
                  }))}
                />
              </FormField>
              <FormField label="Ciudad o municipio">
                <Select
                  variant="field"
                  aria-label="Ciudad o municipio"
                  placeholder="Selecciona ciudad"
                  value={clinicForm.ciudad}
                  onValueChange={(value) => setClinicForm((current) => ({ ...current, ciudad: value }))}
                  options={ciudadesDisponibles.map((city) => ({ value: city, label: city }))}
                />
              </FormField>
              <FormField label="Codigo postal">
                <input
                  type="text"
                  value={clinicForm.codigoPostal}
                  onChange={(event) =>
                    setClinicForm((current) => ({ ...current, codigoPostal: event.target.value }))
                  }
                  placeholder="110111"
                  className={INPUT_CLASS}
                />
              </FormField>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <FormField label="URL del logo" helper="Debe ser un enlace público a la imagen del logo.">
                <input
                  type="text"
                  value={clinicForm.logo}
                  onChange={(event) => setClinicForm((current) => ({ ...current, logo: event.target.value }))}
                  placeholder="https://tu-dominio.com/logo.png"
                  className={INPUT_CLASS}
                />
              </FormField>
              <FormField label="NIT">
                <input
                  type="text"
                  value={clinicForm.nit}
                  onChange={(event) =>
                    setClinicForm((current) => ({ ...current, nit: normalizeNit(event.target.value) }))
                  }
                  placeholder="900123456"
                  className={INPUT_CLASS}
                />
              </FormField>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <FormField label="Dígito de verificación">
                <input
                  type="text"
                  inputMode="numeric"
                  value={clinicForm.digitoVerificacion}
                  onChange={(event) =>
                    setClinicForm((current) => ({
                      ...current,
                      digitoVerificacion: event.target.value.replace(/\D/g, '').slice(0, 2),
                    }))
                  }
                  placeholder="1"
                  className={INPUT_CLASS}
                />
              </FormField>
              <FormField label="Código DIAN del municipio">
                <input
                  type="text"
                  inputMode="numeric"
                  value={clinicForm.municipioId}
                  onChange={(event) =>
                    setClinicForm((current) => ({ ...current, municipioId: event.target.value.replace(/\D/g, '') }))
                  }
                  placeholder="11001"
                  className={INPUT_CLASS}
                />
              </FormField>
            </div>

            <div className="grid gap-4 2xl:grid-cols-3">
              <FormField label="Documento fiscal">
                <Select
                  variant="field"
                  aria-label="Tipo de documento de facturación"
                  placeholder="Selecciona documento"
                  value={clinicForm.tipoDocumentoFacturacionId}
                  onValueChange={(value) =>
                    setClinicForm((current) => ({
                      ...current,
                      tipoDocumentoFacturacionId: value,
                    }))
                  }
                  options={FISCAL_DOCUMENT_OPTIONS}
                />
              </FormField>
              <FormField label="Organización jurídica">
                <Select
                  variant="field"
                  aria-label="Organización jurídica"
                  placeholder="Selecciona organización"
                  value={clinicForm.organizacionJuridicaId}
                  onValueChange={(value) =>
                    setClinicForm((current) => ({
                      ...current,
                      organizacionJuridicaId: value,
                    }))
                  }
                  options={LEGAL_ORGANIZATION_OPTIONS}
                />
              </FormField>
              <FormField label="Tributo">
                <input
                  type="text"
                  value={clinicForm.tributoId}
                  onChange={(event) =>
                    setClinicForm((current) => ({ ...current, tributoId: event.target.value }))
                  }
                  placeholder="01"
                  className={INPUT_CLASS}
                />
              </FormField>
            </div>

            <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
              <button
                type="submit"
                disabled={actualizarClinicaMutation.isPending}
                className="border border-border bg-foreground px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actualizarClinicaMutation.isPending ? 'Guardando...' : 'Guardar configuración'}
              </button>
              <button
                type="button"
                onClick={() => setActiveSection('resumen')}
                className="inline-flex items-center gap-2 border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-muted"
              >
                Volver al resumen
              </button>
            </div>
          </form>
        </DashboardPanel>

        <div className="space-y-5">
          <DashboardPanel
            title="Resumen institucional"
            subtitle="Lectura corta para revisar si lo que ven el cliente y el equipo ya está listo."
          >
            <div className="space-y-4">
              <div className="border border-border bg-muted px-4 py-4 text-sm leading-7 text-muted-foreground">
                <p className="font-semibold text-foreground">
                  {clinicForm.nombreComercial || clinicForm.nombre || 'Clinica sin nombre visible'}
                </p>
                <p>{clinicForm.razonSocial || 'Razon social pendiente'}</p>
                <p>
                  {[clinicForm.ciudad, clinicForm.departamento].filter(Boolean).join(', ') ||
                    'Ubicación pendiente'}
                </p>
                <p>{clinicForm.email || 'Correo pendiente'}</p>
                <p>{clinicForm.telefono || 'Celular pendiente'}</p>
              </div>

              <div className="grid gap-3">
                <div className="border border-border bg-card px-4 py-3 text-sm text-foreground">
                  NIT: <span className="font-semibold text-slate-950">{clinicForm.nit || 'Pendiente'}</span>
                </div>
                <div className="border border-border bg-card px-4 py-3 text-sm text-foreground">
                  Documento fiscal:{' '}
                  <span className="font-semibold text-slate-950">
                    {FISCAL_DOCUMENT_OPTIONS.find(
                      (option) => option.value === clinicForm.tipoDocumentoFacturacionId
                    )?.label || 'Pendiente'}
                  </span>
                </div>
                <div className="border border-border bg-card px-4 py-3 text-sm text-foreground">
                  Logo institucional:{' '}
                  <span className="font-semibold text-slate-950">{clinicForm.logo ? 'Disponible' : 'Pendiente'}</span>
                </div>
              </div>
            </div>
          </DashboardPanel>

          <DashboardPanel
            title="Pendientes fiscales"
            subtitle="Lo que aun falta para dejar la salida tributaria mas completa."
          >
            {camposPendientes.length ? (
              <div className="space-y-3">
                <div className="border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-7 text-amber-800">
                  Todavia faltan datos fiscales base. Completa esta lista antes de formalizar la
                  facturacion electronica.
                </div>
                <div className="flex flex-wrap gap-2">
                  {camposPendientes.map((item) => (
                    <StatusPill key={item} tone="border-amber-200 bg-white text-amber-700">
                      {item}
                    </StatusPill>
                  ))}
                </div>
              </div>
            ) : (
              <div className="border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm leading-7 text-emerald-700">
                La ficha fiscal ya tiene la informacion base para una operacion mas profesional.
              </div>
            )}
          </DashboardPanel>
        </div>
      </div>
      ) : null}

      {activeSection === 'consultorios' ? <ConsultoriosSection /> : null}

      {activeSection === 'horarios' ? (
        <HorariosSection horarioAtencion={initialClinica?.horarioAtencion} />
      ) : null}

      {activeSection === 'facturacion' ? (
        !puedeVerFacturacionElectronica ? (
        <EmptyState
          icon={<Sparkles />}
          title="Facturación electrónica no incluida en el plan actual"
          description="La conexión con Factus se habilita cuando la clínica sube a un plan con facturación electrónica. Mientras tanto, puedes dejar lista la ficha institucional y fiscal."
          action={<NavCta to="/planes" icon={Sparkles}>Revisar planes</NavCta>}
        />
      ) : (
        <div className="grid gap-5 2xl:grid-cols-[minmax(0,1.2fr)_400px]">
          {puedeEditarFacturacionElectronica ? (
            <DashboardPanel
              title="Facturación electrónica"
              subtitle="Configura la conexión con Factus, guarda tus claves de acceso y revisa que todo esté funcionando sin salir de esta pantalla."
              action={
                <div className="flex flex-wrap gap-2">
                  <StatusPill
                    tone={
                      factusForm.activa
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-border bg-muted text-foreground'
                    }
                  >
                    {factusForm.activa ? 'Integración activa' : 'Integración inactiva'}
                  </StatusPill>
                  <StatusPill
                    tone={
                      credencialesCompletas
                        ? 'border-primary/30 bg-primary/10 text-primary'
                        : 'border-amber-200 bg-amber-50 text-amber-700'
                    }
                  >
                    {credencialesCompletas ? 'Credenciales listas' : 'Credenciales pendientes'}
                  </StatusPill>
                </div>
              }
            >
              <form className="grid gap-4" onSubmit={handleSaveFactus}>
                <div className="grid gap-4 xl:grid-cols-2">
                  <FormField label="Ambiente">
                    <Select
                      variant="field"
                      aria-label="Ambiente"
                      value={factusForm.ambiente}
                      onValueChange={(value) =>
                        setFactusForm((current) => ({ ...current, ambiente: value }))
                      }
                      options={FACTUS_ENV_OPTIONS}
                    />
                  </FormField>
                  <label className="flex items-center gap-3 border border-border bg-muted px-4 py-3 text-sm text-foreground">
                    <input
                      type="checkbox"
                      checked={factusForm.activa}
                      onChange={(event) =>
                        setFactusForm((current) => ({ ...current, activa: event.target.checked }))
                      }
                      className="h-4 w-4 border-border text-primary focus:ring-primary"
                    />
                    Activar la conexión para la clínica
                  </label>
                </div>

                <FormField label="URL base" helper="Dirección del servicio de Factus. Si no estás seguro, déjala como viene.">
                  <input
                    type="text"
                    value={factusForm.baseUrl}
                    onChange={(event) =>
                      setFactusForm((current) => ({ ...current, baseUrl: event.target.value }))
                    }
                    placeholder="https://api-sandbox.factus.com.co"
                    className={INPUT_CLASS}
                  />
                </FormField>

                <div className="grid gap-4 xl:grid-cols-2">
                  <FormField label="Client ID" helper="Lo encuentras en tu cuenta de Factus, en la sección de integraciones.">
                    <input
                      type="text"
                      value={factusForm.clientId}
                      onChange={(event) =>
                        setFactusForm((current) => ({ ...current, clientId: event.target.value }))
                      }
                      placeholder="Ingresa el client ID"
                      className={INPUT_CLASS}
                    />
                  </FormField>
                  <FormField label="Client secret" helper="Clave privada que entrega Factus. No la compartas con nadie.">
                    <input
                      type="password"
                      value={factusForm.clientSecret}
                      onChange={(event) =>
                        setFactusForm((current) => ({ ...current, clientSecret: event.target.value }))
                      }
                      placeholder="Ingresa el client secret"
                      className={INPUT_CLASS}
                    />
                  </FormField>
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                  <FormField label="Usuario o correo" helper="El mismo con el que ingresas al portal de Factus.">
                    <input
                      type="text"
                      value={factusForm.username}
                      onChange={(event) =>
                        setFactusForm((current) => ({ ...current, username: event.target.value }))
                      }
                      placeholder="usuario@factus.co"
                      className={INPUT_CLASS}
                    />
                  </FormField>
                  <FormField label="Contraseña" helper="La contraseña de tu cuenta de Factus, no la de Bourgelat.">
                    <input
                      type="password"
                      value={factusForm.password}
                      onChange={(event) =>
                        setFactusForm((current) => ({ ...current, password: event.target.value }))
                      }
                      placeholder="Ingresa la contraseña"
                      className={INPUT_CLASS}
                    />
                  </FormField>
                </div>

                <div className="grid gap-4 sm:grid-cols-4">
                  <FormField label="Rango de numeración">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={factusForm.rangoNumeracionId}
                      onChange={(event) =>
                        setFactusForm((current) => ({
                          ...current,
                          rangoNumeracionId: event.target.value.replace(/\D/g, ''),
                        }))
                      }
                      placeholder="1"
                      className={INPUT_CLASS}
                    />
                  </FormField>
                  <FormField label="Código de documento">
                    <input
                      type="text"
                      value={factusForm.documentoCodigo}
                      onChange={(event) =>
                        setFactusForm((current) => ({ ...current, documentoCodigo: event.target.value }))
                      }
                      placeholder="01"
                      className={INPUT_CLASS}
                    />
                  </FormField>
                  <FormField label="Forma de pago">
                    <input
                      type="text"
                      value={factusForm.formaPagoCodigo}
                      onChange={(event) =>
                        setFactusForm((current) => ({ ...current, formaPagoCodigo: event.target.value }))
                      }
                      placeholder="1"
                      className={INPUT_CLASS}
                    />
                  </FormField>
                  <FormField label="Metodo de pago">
                    <input
                      type="text"
                      value={factusForm.metodoPagoCodigo}
                      onChange={(event) =>
                        setFactusForm((current) => ({ ...current, metodoPagoCodigo: event.target.value }))
                      }
                      placeholder="10"
                      className={INPUT_CLASS}
                    />
                  </FormField>
                </div>

                <label className="flex items-center gap-3 border border-border bg-muted px-4 py-3 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={factusForm.enviarEmail}
                    onChange={(event) =>
                      setFactusForm((current) => ({ ...current, enviarEmail: event.target.checked }))
                    }
                    className="h-4 w-4 border-border text-primary focus:ring-primary"
                  />
                  Enviar correo al emitir documentos desde la integración
                </label>

                <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
                  <button
                    type="submit"
                    disabled={guardarFactusMutation.isPending}
                    className="border border-border bg-foreground px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {guardarFactusMutation.isPending ? 'Guardando...' : 'Guardar Factus'}
                  </button>
                  <button
                    type="button"
                    onClick={() => probarFactusMutation.mutate()}
                    disabled={probarFactusMutation.isPending}
                    className="border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {probarFactusMutation.isPending ? 'Probando...' : 'Probar conexion'}
                  </button>
                  <button
                    type="button"
                    onClick={() => sincronizarFactusMutation.mutate()}
                    disabled={sincronizarFactusMutation.isPending}
                    className="border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {sincronizarFactusMutation.isPending ? 'Sincronizando...' : 'Sincronizar catálogos'}
                  </button>
                </div>
              </form>
            </DashboardPanel>
          ) : (
            <DashboardPanel
              title="Facturación electrónica"
              subtitle="La conexión con la DIAN y Factus se administra desde Bourgelat para evitar cambios delicados por parte de la clínica."
              action={
                <StatusPill tone="border-border bg-muted text-foreground">
                  Solo lectura para la clínica
                </StatusPill>
              }
            >
              <div className="grid gap-4">
                <div className="border border-primary/30 bg-primary/10 px-4 py-4 text-sm leading-7 text-primary">
                  Tu equipo puede usar la facturación electrónica desde la sección de caja, pero
                  la conexión con la DIAN y Factus solo la puede cambiar el equipo de soporte o un
                  administrador de la plataforma.
                </div>
                <div className="grid gap-4 xl:grid-cols-2">
                  <div className="border border-border bg-card px-4 py-4 text-sm text-foreground">
                    <p className={LABEL_CLASS}>Ambiente</p>
                    <p className="mt-3 font-semibold text-slate-950">
                      {FACTUS_ENV_OPTIONS.find((option) => option.value === factusForm.ambiente)?.label ||
                        'Sin definir'}
                    </p>
                  </div>
                  <div className="border border-border bg-card px-4 py-4 text-sm text-foreground">
                    <p className={LABEL_CLASS}>Estado de la conexión</p>
                    <p className="mt-3 font-semibold text-slate-950">
                      {factusForm.activa ? 'Activa para emitir' : 'Pendiente de activación'}
                    </p>
                  </div>
                </div>
                <div className="grid gap-4 2xl:grid-cols-3">
                  <div className="border border-border bg-card px-4 py-4 text-sm text-foreground">
                    <p className={LABEL_CLASS}>Origen de las claves</p>
                    <p className="mt-3 font-semibold text-slate-950">
                      {formatCredentialSource(configuracionEfectiva?.fuenteCredenciales)}
                    </p>
                  </div>
                  <div className="border border-border bg-card px-4 py-4 text-sm text-foreground">
                    <p className={LABEL_CLASS}>Rango de numeración</p>
                    <p className="mt-3 font-semibold text-slate-950">
                      {integracionFactus?.rangoNumeracionId || 'Pendiente'}
                    </p>
                  </div>
                  <div className="border border-border bg-card px-4 py-4 text-sm text-foreground">
                    <p className={LABEL_CLASS}>Última revisión</p>
                    <p className="mt-3 font-semibold text-slate-950">
                      {formatDateTime(integracionFactus?.ultimoChequeo)}
                    </p>
                  </div>
                </div>
              </div>
            </DashboardPanel>
          )}

          <div className="space-y-5">
            <DashboardPanel
              title="Estado de la conexión"
              subtitle="Resumen corto para soporte, gerencia o cierre operativo."
            >
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <StatusPill
                    tone={
                      credencialesCompletas
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-amber-200 bg-amber-50 text-amber-700'
                    }
                  >
                    {credencialesCompletas ? 'Credenciales completas' : 'Credenciales incompletas'}
                  </StatusPill>
                  <StatusPill tone="border-border bg-muted text-foreground">
                    {formatCredentialSource(configuracionEfectiva?.fuenteCredenciales)}
                  </StatusPill>
                </div>

                <div className="grid gap-3">
                  <div className="border border-border bg-card px-4 py-3 text-sm text-foreground">
                    Ambiente:{' '}
                    <span className="font-semibold text-slate-950">
                      {FACTUS_ENV_OPTIONS.find((option) => option.value === factusForm.ambiente)?.label ||
                        'Sin definir'}
                    </span>
                  </div>
                  <div className="border border-border bg-card px-4 py-3 text-sm text-foreground">
                    Ultimo chequeo:{' '}
                    <span className="font-semibold text-slate-950">
                      {formatDateTime(integracionFactus?.ultimoChequeo)}
                    </span>
                  </div>
                  <div className="border border-border bg-card px-4 py-3 text-sm text-foreground">
                    Rango activo:{' '}
                    <span className="font-semibold text-slate-950">
                      {integracionFactus?.rangoNumeracionId || 'Pendiente'}
                    </span>
                  </div>
                  <div className="border border-border bg-card px-4 py-3 text-sm text-foreground">
                    URL base:{' '}
                    <span className="font-semibold text-slate-950">
                      {configuracionEfectiva?.baseUrl || 'Pendiente'}
                    </span>
                  </div>
                </div>

                {integracionFactus?.ultimoMensajeChequeo ? (
                  <div
                    className={`px-4 py-4 text-sm leading-7 ${
                      estadoFactus === 'exitoso'
                        ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border border-amber-200 bg-amber-50 text-amber-800'
                    }`}
                  >
                    {integracionFactus.ultimoMensajeChequeo}
                  </div>
                ) : null}

                {configuracionLocal ? (
                  <div className="border border-border bg-muted px-4 py-4 text-sm leading-7 text-muted-foreground">
                    Hay configuracion local disponible. Si no guardas credenciales propias, la
                    clinica puede apoyarse en las variables del entorno del despliegue.
                  </div>
                ) : null}
              </div>
            </DashboardPanel>

            {camposPendientes.length ? (
              <DashboardPanel
                title="Bloqueos para facturar"
                subtitle="Antes de emitir documentos, completa estos puntos institucionales."
              >
                <div className="space-y-3">
                  <div className="border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-7 text-amber-800">
                    Factus puede quedar configurado, pero la clinica aun necesita completar datos
                    para una salida fiscal mas ordenada.
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {camposPendientes.map((item) => (
                      <StatusPill key={item} tone="border-amber-200 bg-white text-amber-700">
                        {item}
                      </StatusPill>
                    ))}
                  </div>
                </div>
              </DashboardPanel>
            ) : null}
          </div>
        </div>
        )
      ) : null}
    </div>
  )
}

// El horario se guarda con las claves de Date.getDay() (0 = domingo), pero la
// clinica lo lee empezando en lunes.
const DIAS_SEMANA = [
  { clave: '1', label: 'Lunes' },
  { clave: '2', label: 'Martes' },
  { clave: '3', label: 'Miércoles' },
  { clave: '4', label: 'Jueves' },
  { clave: '5', label: 'Viernes' },
  { clave: '6', label: 'Sábado' },
  { clave: '0', label: 'Domingo' },
]

const FRANJA_POR_DEFECTO = { inicio: '08:00', fin: '12:00' }

const buildHorarioForm = (horarioAtencion) =>
  Object.fromEntries(
    DIAS_SEMANA.map(({ clave }) => [
      clave,
      (horarioAtencion?.[clave] || []).map((franja) => ({
        inicio: franja.inicio,
        fin: franja.fin,
      })),
    ])
  )

/** Repite la validacion del backend para no enviar un horario que va a fallar. */
const validarHorarioForm = (horario) => {
  for (const { clave, label } of DIAS_SEMANA) {
    const franjas = [...(horario[clave] || [])].sort((a, b) => a.inicio.localeCompare(b.inicio))

    for (const franja of franjas) {
      if (franja.fin <= franja.inicio) {
        return `En ${label.toLowerCase()} la hora de cierre debe ser mayor a la de apertura.`
      }
    }

    for (let i = 1; i < franjas.length; i += 1) {
      if (franjas[i].inicio < franjas[i - 1].fin) {
        return `Las franjas de ${label.toLowerCase()} no se pueden solapar entre sí.`
      }
    }
  }

  return null
}

const formatRangoFechas = (fechaInicio, fechaFin) => {
  const formatear = (valor) => {
    const [anio, mes, dia] = valor.split('-').map(Number)
    return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' }).format(
      new Date(anio, mes - 1, dia)
    )
  }

  return fechaInicio === fechaFin ? formatear(fechaInicio) : `${formatear(fechaInicio)} — ${formatear(fechaFin)}`
}

const hoyLocal = () => {
  const ahora = new Date()
  return `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-${String(
    ahora.getDate()
  ).padStart(2, '0')}`
}

function HorarioSemanal({ horario, setHorario, onGuardar, guardando }) {
  const actualizarDia = (clave, franjas) =>
    setHorario((current) => ({ ...current, [clave]: franjas }))

  const alternarDia = (clave) =>
    actualizarDia(clave, horario[clave]?.length ? [] : [{ ...FRANJA_POR_DEFECTO }])

  const actualizarFranja = (clave, indice, cambios) =>
    actualizarDia(
      clave,
      horario[clave].map((franja, i) => (i === indice ? { ...franja, ...cambios } : franja))
    )

  const agregarFranja = (clave) =>
    actualizarDia(clave, [...horario[clave], { inicio: '14:00', fin: '18:00' }])

  const eliminarFranja = (clave, indice) =>
    actualizarDia(
      clave,
      horario[clave].filter((_, i) => i !== indice)
    )

  // Copiar el primer dia abierto al resto ahorra configurar siete veces lo mismo.
  const copiarATodaLaSemana = () => {
    const origen = DIAS_SEMANA.find(({ clave }) => horario[clave]?.length)

    if (!origen) {
      toast.error('Configura primero un día para poder copiarlo.')
      return
    }

    const franjas = horario[origen.clave].map((franja) => ({ ...franja }))

    setHorario((current) =>
      Object.fromEntries(
        Object.keys(current).map((clave) => [
          clave,
          // El domingo suele ser cerrado: no se sobreescribe si ya lo esta.
          clave === '0' && !current['0'].length ? [] : franjas.map((franja) => ({ ...franja })),
        ])
      )
    )
  }

  return (
    <DashboardPanel
      title="Horario de atención"
      subtitle="Define en qué días y franjas atiende la clínica. La agenda solo permitirá programar citas dentro de este horario."
      action={<Clock className="h-4 w-4 text-primary" />}
    >
      <div className="grid gap-3">
        {DIAS_SEMANA.map(({ clave, label }) => {
          const franjas = horario[clave] || []
          const abierto = franjas.length > 0

          return (
            <div
              key={clave}
              className={`border px-4 py-3 ${abierto ? 'border-border bg-card' : 'border-border bg-muted'}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="flex items-center gap-3 text-sm font-semibold text-foreground">
                  <input
                    type="checkbox"
                    checked={abierto}
                    onChange={() => alternarDia(clave)}
                    className="h-4 w-4 border-border text-primary focus:ring-primary"
                  />
                  {label}
                </label>

                {abierto ? (
                  <button
                    type="button"
                    onClick={() => agregarFranja(clave)}
                    className="inline-flex items-center gap-1.5 border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-muted"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Agregar franja
                  </button>
                ) : (
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Cerrado
                  </span>
                )}
              </div>

              {abierto ? (
                <div className="mt-3 grid gap-2">
                  {franjas.map((franja, indice) => (
                    <div key={indice} className="flex flex-wrap items-center gap-2">
                      <HoraPicker
                        aria-label={`${label}, apertura`}
                        value={franja.inicio}
                        onChange={(valor) => actualizarFranja(clave, indice, { inicio: valor })}
                      />
                      <span className="text-sm text-muted-foreground">a</span>
                      <HoraPicker
                        aria-label={`${label}, cierre`}
                        value={franja.fin}
                        onChange={(valor) => actualizarFranja(clave, indice, { fin: valor })}
                      />
                      {franjas.length > 1 ? (
                        <button
                          type="button"
                          aria-label={`Eliminar franja de ${label.toLowerCase()}`}
                          onClick={() => eliminarFranja(clave, indice)}
                          className="border border-border bg-card p-2 text-muted-foreground transition hover:bg-muted hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          )
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-4">
        <button
          type="button"
          onClick={onGuardar}
          disabled={guardando}
          className="border border-border bg-foreground px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {guardando ? 'Guardando...' : 'Guardar horario'}
        </button>
        <button
          type="button"
          onClick={copiarATodaLaSemana}
          className="border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-muted"
        >
          Copiar a toda la semana
        </button>
      </div>
    </DashboardPanel>
  )
}

function ImpactoBloqueoDialog({ impacto, onCancelar, onConfirmar, guardando }) {
  const citas = impacto?.citas || []

  return (
    <DialogRoot open={Boolean(impacto)} onOpenChange={(abierto) => (abierto ? null : onCancelar())}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Este bloqueo afecta {citas.length} {citas.length === 1 ? 'cita' : 'citas'}
          </DialogTitle>
          <DialogDescription>
            Decide si quieres cancelar las citas ya programadas o solo impedir que se agenden nuevas.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-64 divide-y divide-border overflow-y-auto border border-border">
          {citas.map((cita) => (
            <div key={cita.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <div>
                <p className="font-semibold text-foreground">
                  {formatHora12(cita.horaInicio)} · {cita.mascota?.nombre || 'Paciente sin nombre'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatRangoFechas(cita.fecha, cita.fecha)}
                  {cita.veterinario?.nombre ? ` · ${cita.veterinario.nombre}` : ''}
                </p>
              </div>
              {cita.cancelable ? null : (
                <StatusPill tone="border-amber-200 bg-amber-50 text-amber-700">
                  No cancelable
                </StatusPill>
              )}
            </div>
          ))}
        </div>

        {citas.some((cita) => !cita.cancelable) ? (
          <p className="text-xs leading-6 text-muted-foreground">
            Las citas completadas o en atención no se cancelan automáticamente: resuélvelas desde la
            agenda.
          </p>
        ) : null}

        <DialogFooter className="mt-4">
          <Button variant="outline" size="sm" disabled={guardando} onClick={() => onConfirmar(false)}>
            Bloquear sin cancelar
          </Button>
          <Button variant="destructive" size="sm" disabled={guardando} onClick={() => onConfirmar(true)}>
            Cancelar esas citas y bloquear
          </Button>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  )
}

function HorariosSection({ horarioAtencion }) {
  const queryClient = useQueryClient()
  const [horario, setHorario] = useState(() => buildHorarioForm(horarioAtencion))
  const [bloqueoForm, setBloqueoForm] = useState({
    fechaInicio: hoyLocal(),
    fechaFin: '',
    diaCompleto: true,
    horaInicio: '08:00',
    horaFin: '12:00',
    motivo: '',
  })
  const [impacto, setImpacto] = useState(null)

  useEffect(() => {
    setHorario(buildHorarioForm(horarioAtencion))
  }, [horarioAtencion])

  const bloqueosQuery = useQuery({
    queryKey: ['configuracion-bloqueos'],
    queryFn: () => configuracionApi.obtenerBloqueos({ desde: hoyLocal() }),
  })

  const guardarHorarioMutation = useMutation({
    mutationFn: configuracionApi.actualizarHorarioAtencion,
    onSuccess: (data) => {
      toast.success(data?.message || 'Horario de atención actualizado')
      // La pagina re-sincroniza el store con la ficha al refrescar esta query.
      queryClient.invalidateQueries({ queryKey: ['configuracion-clinica'] })
      queryClient.invalidateQueries({ queryKey: ['agenda-horario'] })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'No fue posible guardar el horario de atención.'))
    },
  })

  const crearBloqueoMutation = useMutation({
    mutationFn: configuracionApi.crearBloqueo,
    onSuccess: (data) => {
      const canceladas = data?.citasCanceladas?.length || 0
      toast.success(
        canceladas
          ? `Bloqueo creado y ${canceladas} ${canceladas === 1 ? 'cita cancelada' : 'citas canceladas'}`
          : data?.message || 'Bloqueo creado'
      )
      setImpacto(null)
      setBloqueoForm((current) => ({ ...current, motivo: '' }))
      queryClient.invalidateQueries({ queryKey: ['configuracion-bloqueos'] })
      queryClient.invalidateQueries({ queryKey: ['agenda-bloqueos'] })
      queryClient.invalidateQueries({ queryKey: ['citas'] })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'No fue posible crear el bloqueo.'))
    },
  })

  const eliminarBloqueoMutation = useMutation({
    mutationFn: configuracionApi.eliminarBloqueo,
    onSuccess: () => {
      toast.success('Bloqueo eliminado')
      queryClient.invalidateQueries({ queryKey: ['configuracion-bloqueos'] })
      queryClient.invalidateQueries({ queryKey: ['agenda-bloqueos'] })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'No fue posible eliminar el bloqueo.'))
    },
  })

  const impactoMutation = useMutation({
    mutationFn: configuracionApi.calcularImpactoBloqueo,
    onError: (error) => {
      toast.error(getErrorMessage(error, 'No fue posible revisar las citas afectadas.'))
    },
  })

  const handleGuardarHorario = () => {
    const error = validarHorarioForm(horario)
    if (error) {
      toast.error(error)
      return
    }

    guardarHorarioMutation.mutate(horario)
  }

  const construirPayloadBloqueo = () => ({
    fechaInicio: bloqueoForm.fechaInicio,
    fechaFin: bloqueoForm.fechaFin || bloqueoForm.fechaInicio,
    horaInicio: bloqueoForm.diaCompleto ? null : bloqueoForm.horaInicio,
    horaFin: bloqueoForm.diaCompleto ? null : bloqueoForm.horaFin,
    motivo: bloqueoForm.motivo.trim(),
  })

  // Antes de bloquear se consulta el impacto: si hay citas en conflicto el
  // administrador decide si las cancela, en vez de perderlas sin avisar.
  const handleSubmitBloqueo = async (event) => {
    event.preventDefault()

    const payload = construirPayloadBloqueo()

    if (!payload.motivo) {
      toast.error('Escribe el motivo del bloqueo.')
      return
    }

    if (payload.fechaFin < payload.fechaInicio) {
      toast.error('La fecha final no puede ser anterior a la inicial.')
      return
    }

    if (!bloqueoForm.diaCompleto && payload.horaFin <= payload.horaInicio) {
      toast.error('La hora de fin debe ser mayor a la hora de inicio.')
      return
    }

    const resultado = await impactoMutation.mutateAsync(payload).catch(() => null)
    if (!resultado) return

    if (resultado.total > 0) {
      setImpacto({ ...resultado, payload })
      return
    }

    crearBloqueoMutation.mutate(payload)
  }

  const bloqueos = bloqueosQuery.data?.bloqueos || []

  return (
    <div className="grid gap-5 2xl:grid-cols-[minmax(0,1.2fr)_400px]">
      <HorarioSemanal
        horario={horario}
        setHorario={setHorario}
        onGuardar={handleGuardarHorario}
        guardando={guardarHorarioMutation.isPending}
      />

      <div className="space-y-5">
        <DashboardPanel
          title="Días y franjas bloqueadas"
          subtitle="Cierres puntuales por imprevistos. La agenda no permitirá programar citas en estos rangos."
          action={<CalendarOff className="h-4 w-4 text-primary" />}
        >
          {bloqueosQuery.isLoading ? (
            <div className="grid gap-3">
              {[0, 1].map((item) => (
                <div key={item} className="h-14 animate-pulse border border-border bg-muted" />
              ))}
            </div>
          ) : bloqueos.length === 0 ? (
            <EmptyState
              icon={<CalendarOff />}
              title="Sin bloqueos"
              description="No hay cierres programados. Agrega uno cuando tengas un imprevisto."
              bordered
            />
          ) : (
            <div className="divide-y divide-border border border-border">
              {bloqueos.map((bloqueo) => (
                <div key={bloqueo.id} className="flex items-start justify-between gap-3 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {formatRangoFechas(bloqueo.fechaInicio, bloqueo.fechaFin)}
                    </p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {bloqueo.horaInicio && bloqueo.horaFin
                        ? formatFranja12(bloqueo.horaInicio, bloqueo.horaFin)
                        : 'Día completo'}
                      {' · '}
                      {bloqueo.motivo}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label="Eliminar bloqueo"
                    disabled={eliminarBloqueoMutation.isPending}
                    onClick={() => eliminarBloqueoMutation.mutate(bloqueo.id)}
                    className="shrink-0 border border-border bg-card p-2 text-muted-foreground transition hover:bg-muted hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </DashboardPanel>

        <DashboardPanel
          title="Nuevo bloqueo"
          subtitle="Antes de guardar te mostramos las citas que quedarían afectadas."
        >
          <form className="grid gap-4" onSubmit={handleSubmitBloqueo}>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Desde" required>
                <input
                  type="date"
                  value={bloqueoForm.fechaInicio}
                  onChange={(event) =>
                    setBloqueoForm((current) => ({ ...current, fechaInicio: event.target.value }))
                  }
                  className={INPUT_CLASS}
                />
              </FormField>
              <FormField label="Hasta" helper="Déjalo vacío para bloquear un solo día.">
                <input
                  type="date"
                  value={bloqueoForm.fechaFin}
                  min={bloqueoForm.fechaInicio}
                  onChange={(event) =>
                    setBloqueoForm((current) => ({ ...current, fechaFin: event.target.value }))
                  }
                  className={INPUT_CLASS}
                />
              </FormField>
            </div>

            <label className="flex items-center gap-3 border border-border bg-muted px-4 py-3 text-sm text-foreground">
              <input
                type="checkbox"
                checked={bloqueoForm.diaCompleto}
                onChange={(event) =>
                  setBloqueoForm((current) => ({ ...current, diaCompleto: event.target.checked }))
                }
                className="h-4 w-4 border-border text-primary focus:ring-primary"
              />
              Bloquear el día completo
            </label>

            {!bloqueoForm.diaCompleto ? (
              <div className="grid gap-3">
                <FormField label="Desde la hora">
                  <HoraPicker
                    aria-label="Inicio del bloqueo"
                    value={bloqueoForm.horaInicio}
                    onChange={(valor) =>
                      setBloqueoForm((current) => ({ ...current, horaInicio: valor }))
                    }
                  />
                </FormField>
                <FormField label="Hasta la hora">
                  <HoraPicker
                    aria-label="Fin del bloqueo"
                    value={bloqueoForm.horaFin}
                    onChange={(valor) => setBloqueoForm((current) => ({ ...current, horaFin: valor }))}
                  />
                </FormField>
              </div>
            ) : null}

            <FormField label="Motivo" required>
              <input
                type="text"
                value={bloqueoForm.motivo}
                onChange={(event) =>
                  setBloqueoForm((current) => ({ ...current, motivo: event.target.value }))
                }
                placeholder="Ej. Mantenimiento eléctrico"
                className={INPUT_CLASS}
              />
            </FormField>

            <button
              type="submit"
              disabled={impactoMutation.isPending || crearBloqueoMutation.isPending}
              className="border border-border bg-foreground px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {impactoMutation.isPending
                ? 'Revisando citas...'
                : crearBloqueoMutation.isPending
                  ? 'Guardando...'
                  : 'Bloquear'}
            </button>
          </form>
        </DashboardPanel>
      </div>

      <ImpactoBloqueoDialog
        impacto={impacto}
        guardando={crearBloqueoMutation.isPending}
        onCancelar={() => setImpacto(null)}
        onConfirmar={(cancelarCitas) =>
          crearBloqueoMutation.mutate({ ...impacto.payload, cancelarCitas })
        }
      />
    </div>
  )
}

function ConsultoriosSection() {
  const queryClient = useQueryClient()
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')

  const consultoriosQuery = useQuery({
    queryKey: ['recepcion-consultorios'],
    queryFn: () => recepcionApi.obtenerConsultorios({}),
  })

  const crearMutation = useMutation({
    mutationFn: recepcionApi.crearConsultorio,
    onSuccess: () => {
      toast.success('Consultorio creado')
      setNombre('')
      setDescripcion('')
      queryClient.invalidateQueries({ queryKey: ['recepcion-consultorios'] })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'No fue posible crear el consultorio.'))
    },
  })

  const actualizarMutation = useMutation({
    mutationFn: ({ id, payload }) => recepcionApi.actualizarConsultorio(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recepcion-consultorios'] })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'No fue posible actualizar el consultorio.'))
    },
  })

  const consultorios = consultoriosQuery.data?.consultorios || []

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!nombre.trim()) {
      toast.error('El nombre del consultorio es obligatorio.')
      return
    }
    crearMutation.mutate({ nombre: nombre.trim(), descripcion: descripcion.trim() || undefined })
  }

  return (
    <div className="grid gap-5 2xl:grid-cols-[minmax(0,1.2fr)_360px]">
      <DashboardPanel
        title="Consultorios registrados"
        subtitle="Salas usadas para validar choques de horario y en la disponibilidad de la sala de espera."
        action={<Building2 className="h-4 w-4 text-primary" />}
      >
        {consultoriosQuery.isLoading ? (
          <div className="grid gap-3">
            {[0, 1, 2].map((item) => (
              <div key={item} className="h-14 animate-pulse border border-border bg-muted" />
            ))}
          </div>
        ) : consultorios.length === 0 ? (
          <EmptyState
            icon={<Building2 />}
            title="Sin consultorios"
            description="Crea el primer consultorio para poder asignarlo a las citas y a la sala de espera."
            bordered
          />
        ) : (
          <div className="divide-y divide-border border border-border">
            {consultorios.map((consultorio) => (
              <div key={consultorio.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">{consultorio.nombre}</p>
                  {consultorio.descripcion ? (
                    <p className="mt-0.5 text-sm text-muted-foreground">{consultorio.descripcion}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  disabled={actualizarMutation.isPending}
                  onClick={() =>
                    actualizarMutation.mutate({
                      id: consultorio.id,
                      payload: { activo: !consultorio.activo },
                    })
                  }
                  className={`shrink-0 border px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    consultorio.activo
                      ? 'border-red-300 bg-red-50 text-red-700 hover:bg-red-100'
                      : 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  }`}
                >
                  {consultorio.activo ? 'Desactivar' : 'Activar'}
                </button>
              </div>
            ))}
          </div>
        )}
      </DashboardPanel>

      <DashboardPanel
        title="Nuevo consultorio"
        subtitle="Agrega una sala para asignarla en la programación de citas."
      >
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <input
            type="text"
            value={nombre}
            onChange={(event) => setNombre(event.target.value)}
            placeholder="Nombre, ej. Consultorio 1"
            className="h-11 border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary"
          />
          <textarea
            value={descripcion}
            onChange={(event) => setDescripcion(event.target.value)}
            placeholder="Descripción (opcional)"
            className="min-h-[90px] border border-border bg-card px-3 py-3 text-sm text-foreground outline-none transition focus:border-primary"
          />
          <button
            type="submit"
            disabled={crearMutation.isPending}
            className="border border-border bg-foreground px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {crearMutation.isPending ? 'Guardando...' : 'Crear consultorio'}
          </button>
        </form>
      </DashboardPanel>
    </div>
  )
}

export default function ConfiguracionPage() {
  const usuario = useAuthStore((state) => state.usuario)
  const clinicaPersistida = useAuthStore((state) => state.clinica)
  const suscripcion = useAuthStore((state) => state.suscripcion)
  const setClinica = useAuthStore((state) => state.setClinica)

  const rolPermitido = hasAnyRole(usuario, ['admin', 'superadmin'])
  const puedeVerFacturacionElectronica = tieneFuncionalidad(suscripcion, FUNCIONALIDAD_DIAN)
  const puedeEditarFacturacionElectronica = hasAnyRole(usuario, ['admin', 'superadmin'])

  useEffect(() => {
    document.title = 'Configuración | Bourgelat'
  }, [])

  const clinicaQuery = useQuery({
    queryKey: ['configuracion-clinica'],
    queryFn: configuracionApi.obtenerClinica,
    enabled: rolPermitido,
  })

  const factusQuery = useQuery({
    queryKey: ['configuracion-factus'],
    queryFn: configuracionApi.obtenerConfiguracionFacturacion,
    enabled: rolPermitido && puedeVerFacturacionElectronica,
    placeholderData: (previousData) => previousData,
  })

  useEffect(() => {
    if (clinicaQuery.data?.clinica) {
      setClinica(clinicaQuery.data.clinica)
    }
  }, [setClinica, clinicaQuery.data?.clinica])

  if (!rolPermitido) {
    return <RestrictedConfigPage />
  }

  const clinicaActual = clinicaQuery.data?.clinica || clinicaPersistida
  const perfilFiscal = clinicaQuery.data?.perfilFiscal || {
    listoParaFacturacion: false,
    camposFaltantes: [],
  }

  return (
    <AdminShell
      currentKey="configuracion"
      title="Configuración de clínica"
      description="Aquí mantienes al día la identidad de la clínica, su ficha fiscal y la salida de facturación electrónica."
      headerBadge={
        <StatusPill
          tone={
            perfilFiscal.listoParaFacturacion
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-amber-200 bg-amber-50 text-amber-700'
          }
        >
          {perfilFiscal.listoParaFacturacion ? 'Perfil fiscal listo' : 'Perfil fiscal en ajuste'}
        </StatusPill>
      }
      actions={
        <NavCta to="/usuarios" icon={Users}>
          Abrir usuarios
        </NavCta>
      }
      asideNote="Usa esta vista para ajustar nombre visible, datos institucionales, salida fiscal y facturación, sin mezclarlo con la operación diaria."
    >
      {clinicaQuery.isError || factusQuery.isError ? (
        <div className="grid gap-4">
          {clinicaQuery.isError ? (
            <div className="border border-red-200 bg-red-50 px-4 py-4 text-sm leading-7 text-red-700">
              {getErrorMessage(
                clinicaQuery.error,
                'No fue posible cargar la ficha institucional de la clínica.'
              )}
            </div>
          ) : null}
          {factusQuery.isError ? (
            <div className="border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-7 text-amber-800">
              {getErrorMessage(
                factusQuery.error,
                'No fue posible cargar el estado de la facturación electrónica.'
              )}
            </div>
          ) : null}
        </div>
      ) : null}

      {clinicaQuery.isLoading || !clinicaActual ? (
        <DashboardPanel
          title="Cargando configuración"
          subtitle="Estamos reuniendo la ficha institucional y el estado fiscal de la clínica."
        >
          <div className="grid gap-4 xl:grid-cols-4">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="h-40 animate-pulse border border-border bg-muted" />
            ))}
          </div>
        </DashboardPanel>
      ) : (
        <ConfiguracionContent
          initialClinica={clinicaActual}
          perfilFiscal={perfilFiscal}
          initialFactus={factusQuery.data}
          puedeVerFacturacionElectronica={puedeVerFacturacionElectronica}
          puedeEditarFacturacionElectronica={puedeEditarFacturacionElectronica}
          setClinica={setClinica}
        />
      )}
    </AdminShell>
  )
}
