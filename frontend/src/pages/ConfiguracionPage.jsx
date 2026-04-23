import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ArrowRight,
  Building2,
  Mail,
  Phone,
  ShieldCheck,
} from 'lucide-react'
import AdminShell from '@/components/layout/AdminShell'
import {
  DashboardPanel,
  EmptyModuleState,
  KpiCard,
  StatusPill,
} from '@/features/dashboard/dashboardComponents'
import { formatNumber } from '@/features/dashboard/dashboardUtils'
import { configuracionApi } from '@/features/configuracion/configuracionApi'
import colombia from '@/data/colombia'
import { useAuthStore } from '@/store/authStore'
import { hasAnyRole } from '@/lib/permissions'

const PERSON_TYPE_OPTIONS = [
  { value: 'persona_juridica', label: 'Persona juridica' },
  { value: 'persona_natural', label: 'Persona natural' },
]

const FISCAL_DOCUMENT_OPTIONS = [
  { value: '3', label: 'Cedula de ciudadania' },
  { value: '5', label: 'Cedula de extranjeria' },
  { value: '6', label: 'NIT' },
  { value: '7', label: 'Pasaporte' },
]

const LEGAL_ORGANIZATION_OPTIONS = [
  { value: '1', label: 'Persona juridica' },
  { value: '2', label: 'Persona natural' },
]

const FACTUS_ENV_OPTIONS = [
  { value: 'sandbox', label: 'Sandbox' },
  { value: 'production', label: 'Produccion' },
]

const FISCAL_FIELD_LABELS = {
  nit: 'NIT',
  razonSocial: 'Razon social',
  direccion: 'Direccion principal',
  telefono: 'Celular principal',
  email: 'Email institucional',
  municipioId: 'Municipio DIAN',
  tipoDocumentoFacturacionId: 'Documento fiscal',
  organizacionJuridicaId: 'Organizacion juridica',
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
  if (!value) return 'Sin chequeo reciente'

  try {
    return new Intl.DateTimeFormat('es-CO', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value))
  } catch {
    return 'Sin chequeo reciente'
  }
}

const formatCredentialSource = (value) => {
  const sourceMap = {
    integracion: 'Credenciales propias',
    env: 'Variables del entorno',
    mixta: 'Mixta',
    ninguna: 'Sin credenciales',
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
          title="Configuracion de clinica"
          subtitle="Este modulo se reserva para administracion principal."
        >
          <div className="border border-border bg-muted px-4 py-5 text-sm leading-7 text-muted-foreground">
            Tu acceso actual no tiene permisos para editar la configuracion institucional o fiscal
            de la clinica.
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
      toast.success(data?.message || 'Configuracion actualizada exitosamente')
      if (data?.clinica) {
        setClinica(data.clinica)
        setClinicForm(buildClinicForm(data.clinica))
      }
      queryClient.invalidateQueries({ queryKey: ['configuracion-clinica'] })
      queryClient.invalidateQueries({ queryKey: ['suscripcion-activa'] })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'No fue posible actualizar la configuracion de la clinica.'))
    },
  })

  const guardarFactusMutation = useMutation({
    mutationFn: configuracionApi.guardarConfiguracionFactus,
    onSuccess: (data) => {
      toast.success(data?.message || 'Configuracion de Factus guardada exitosamente')
      queryClient.invalidateQueries({ queryKey: ['configuracion-factus'] })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'No fue posible guardar la configuracion de Factus.'))
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
      toast.success(data?.message || 'Sincronizacion con Factus exitosa')
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
      toast.error('Ingresa un email institucional valido.')
      return
    }

    if (payload.telefono && !/^3\d{9}$/.test(payload.telefono)) {
      toast.error('El telefono debe ser un celular colombiano valido de 10 digitos.')
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
      toast.error('El rango de numeracion debe ser numerico.')
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
    ...(puedeVerFacturacionElectronica
      ? [{ id: 'facturacion', label: 'Facturacion electronica', helper: 'Estado e integracion' }]
      : []),
  ]

  return (
    <div className="space-y-5">
      <DashboardPanel
        title="Organiza esta configuracion por bloques"
        subtitle="Primero revisa el resumen, luego edita la ficha institucional y deja la integracion electronica en una vista separada."
        action={
          <StatusPill tone="border-border bg-muted text-foreground">
            Configuracion guiada
          </StatusPill>
        }
      >
        <div className="grid gap-3 lg:grid-cols-3">
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
          helper="Nombre, correo, celular, direccion, departamento y ciudad listos para operacion."
          tone="text-primary"
        />
        <KpiCard
          icon={Mail}
          label="Contacto principal"
          value={clinicForm.email ? 'Listo' : 'Pendiente'}
          helper={clinicForm.email || 'Define un correo institucional para respuestas y documentos.'}
          tone={clinicForm.email ? 'text-emerald-700' : 'text-amber-700'}
        />
        <KpiCard
          icon={Phone}
          label="Linea administrativa"
          value={clinicForm.telefono ? 'Activa' : 'Pendiente'}
          helper={clinicForm.telefono || 'Agrega un celular colombiano valido para contacto principal.'}
          tone={clinicForm.telefono ? 'text-emerald-700' : 'text-amber-700'}
        />
        <KpiCard
          icon={ShieldCheck}
          label="Perfil fiscal"
          value={perfilFiscal?.listoParaFacturacion ? 'Listo' : `${formatNumber(camposPendientes.length)} pendientes`}
          helper={
            perfilFiscal?.listoParaFacturacion
              ? 'La clinica ya tiene base institucional y fiscal para una operacion mas formal.'
              : 'Completa la ficha para habilitar una salida tributaria mas ordenada.'
          }
          tone={perfilFiscal?.listoParaFacturacion ? 'text-emerald-700' : 'text-amber-700'}
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
                    'Ubicacion pendiente'}
                </p>
                <p>{clinicForm.email || 'Email pendiente'}</p>
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
              title="Criterio de administracion"
              subtitle="La clinica mantiene sus datos base; la configuracion sensible con DIAN y Factus se controla aparte."
            >
              <div className="space-y-3">
                <div className="border border-border bg-muted px-4 py-4 text-sm leading-7 text-muted-foreground">
                  Esta separacion reduce errores y evita que el cliente mezcle configuracion visible
                  con credenciales tecnicas o cambios delicados de integracion.
                </div>
                <Link
                  to="/finanzas"
                  className="inline-flex w-full items-center justify-center gap-2 border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-muted"
                >
                  Ir a finanzas
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </DashboardPanel>
          </div>
        </div>
      ) : null}

      {activeSection === 'ficha' ? (
      <div className="grid gap-5 2xl:grid-cols-[minmax(0,1.2fr)_400px]">
        <DashboardPanel
          title="Ficha institucional editable"
          subtitle="Aqui conviene editar nombre visible, contacto, direccion y datos fiscales base sin mezclarlo con la integracion electronica."
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
                <select
                  value={clinicForm.tipoPersona}
                  onChange={(event) =>
                    setClinicForm((current) => ({ ...current, tipoPersona: event.target.value }))
                  }
                  className={INPUT_CLASS}
                >
                  {PERSON_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <FormField label="Correo institucional" required>
                <input
                  type="email"
                  value={clinicForm.email}
                  onChange={(event) => setClinicForm((current) => ({ ...current, email: event.target.value }))}
                  placeholder="administracion@bourgelat.co"
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

            <FormField label="Direccion principal">
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
                <select
                  value={clinicForm.departamento}
                  onChange={(event) =>
                    setClinicForm((current) => ({
                      ...current,
                      departamento: event.target.value,
                      ciudad: '',
                    }))
                  }
                  className={INPUT_CLASS}
                >
                  <option value="">Selecciona departamento</option>
                  {colombia.map((item) => (
                    <option key={item.id} value={item.departamento}>
                      {item.departamento}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Ciudad o municipio">
                <select
                  value={clinicForm.ciudad}
                  onChange={(event) => setClinicForm((current) => ({ ...current, ciudad: event.target.value }))}
                  className={INPUT_CLASS}
                >
                  <option value="">Selecciona ciudad</option>
                  {ciudadesDisponibles.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
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
              <FormField label="URL del logo" helper="Usa una URL publica valida para el logo institucional.">
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
              <FormField label="Digito de verificacion">
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
              <FormField label="Municipio ID DIAN">
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
                <select
                  value={clinicForm.tipoDocumentoFacturacionId}
                  onChange={(event) =>
                    setClinicForm((current) => ({
                      ...current,
                      tipoDocumentoFacturacionId: event.target.value,
                    }))
                  }
                  className={INPUT_CLASS}
                >
                  <option value="">Selecciona documento</option>
                  {FISCAL_DOCUMENT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Organizacion juridica">
                <select
                  value={clinicForm.organizacionJuridicaId}
                  onChange={(event) =>
                    setClinicForm((current) => ({
                      ...current,
                      organizacionJuridicaId: event.target.value,
                    }))
                  }
                  className={INPUT_CLASS}
                >
                  <option value="">Selecciona organizacion</option>
                  {LEGAL_ORGANIZATION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
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
                {actualizarClinicaMutation.isPending ? 'Guardando...' : 'Guardar configuracion'}
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
            subtitle="Lectura corta para validar si lo visible al cliente y al equipo ya esta listo."
          >
            <div className="space-y-4">
              <div className="border border-border bg-muted px-4 py-4 text-sm leading-7 text-muted-foreground">
                <p className="font-semibold text-foreground">
                  {clinicForm.nombreComercial || clinicForm.nombre || 'Clinica sin nombre visible'}
                </p>
                <p>{clinicForm.razonSocial || 'Razon social pendiente'}</p>
                <p>
                  {[clinicForm.ciudad, clinicForm.departamento].filter(Boolean).join(', ') ||
                    'Ubicacion pendiente'}
                </p>
                <p>{clinicForm.email || 'Email pendiente'}</p>
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

      {activeSection === 'facturacion' ? (
        !puedeVerFacturacionElectronica ? (
        <EmptyModuleState
          title="Facturacion electronica no incluida en el plan actual"
          body="La integracion con Factus se habilita cuando la clinica sube a un plan con facturacion electronica. Mientras tanto, puedes dejar lista la ficha institucional y fiscal."
          ctaLabel="Revisar planes"
        />
      ) : (
        <div className="grid gap-5 2xl:grid-cols-[minmax(0,1.2fr)_400px]">
          {puedeEditarFacturacionElectronica ? (
            <DashboardPanel
              title="Facturacion electronica"
              subtitle="Configura la integracion de Factus, guarda credenciales propias y valida el estado tecnico sin salir del backoffice."
              action={
                <div className="flex flex-wrap gap-2">
                  <StatusPill
                    tone={
                      factusForm.activa
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-border bg-muted text-foreground'
                    }
                  >
                    {factusForm.activa ? 'Integracion activa' : 'Integracion inactiva'}
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
                    <select
                      value={factusForm.ambiente}
                      onChange={(event) =>
                        setFactusForm((current) => ({ ...current, ambiente: event.target.value }))
                      }
                      className={INPUT_CLASS}
                    >
                      {FACTUS_ENV_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
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
                    Activar integracion para la clinica
                  </label>
                </div>

                <FormField label="URL base">
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
                  <FormField label="Client ID">
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
                  <FormField label="Client secret">
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
                  <FormField label="Usuario o email">
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
                  <FormField label="Password">
                    <input
                      type="password"
                      value={factusForm.password}
                      onChange={(event) =>
                        setFactusForm((current) => ({ ...current, password: event.target.value }))
                      }
                      placeholder="Ingresa la password"
                      className={INPUT_CLASS}
                    />
                  </FormField>
                </div>

                <div className="grid gap-4 sm:grid-cols-4">
                  <FormField label="Rango de numeracion">
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
                  <FormField label="Documento codigo">
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
                  Enviar email al emitir documentos desde la integracion
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
                    {sincronizarFactusMutation.isPending ? 'Sincronizando...' : 'Sincronizar catalogos'}
                  </button>
                </div>
              </form>
            </DashboardPanel>
          ) : (
            <DashboardPanel
              title="Facturacion electronica"
              subtitle="La configuracion de DIAN y Factus se administra desde Bourgelat para evitar cambios sensibles por parte de la clinica."
              action={
                <StatusPill tone="border-border bg-muted text-foreground">
                  Solo lectura para la clinica
                </StatusPill>
              }
            >
              <div className="grid gap-4">
                <div className="border border-primary/30 bg-primary/10 px-4 py-4 text-sm leading-7 text-primary">
                  Tu equipo puede usar la facturacion electronica dentro del modulo financiero, pero
                  la configuracion tecnica con DIAN y Factus solo la modifica soporte central o un
                  perfil `superadmin`.
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
                    <p className={LABEL_CLASS}>Estado de la integracion</p>
                    <p className="mt-3 font-semibold text-slate-950">
                      {factusForm.activa ? 'Activa para emitir' : 'Pendiente de activacion'}
                    </p>
                  </div>
                </div>
                <div className="grid gap-4 2xl:grid-cols-3">
                  <div className="border border-border bg-card px-4 py-4 text-sm text-foreground">
                    <p className={LABEL_CLASS}>Fuente de credenciales</p>
                    <p className="mt-3 font-semibold text-slate-950">
                      {formatCredentialSource(configuracionEfectiva?.fuenteCredenciales)}
                    </p>
                  </div>
                  <div className="border border-border bg-card px-4 py-4 text-sm text-foreground">
                    <p className={LABEL_CLASS}>Rango de numeracion</p>
                    <p className="mt-3 font-semibold text-slate-950">
                      {integracionFactus?.rangoNumeracionId || 'Pendiente'}
                    </p>
                  </div>
                  <div className="border border-border bg-card px-4 py-4 text-sm text-foreground">
                    <p className={LABEL_CLASS}>Ultimo chequeo</p>
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
              title="Estado de integracion"
              subtitle="Lectura tecnica corta para soporte, gerencia o cierre operativo."
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
                    Base URL:{' '}
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

export default function ConfiguracionPage() {
  const usuario = useAuthStore((state) => state.usuario)
  const clinicaPersistida = useAuthStore((state) => state.clinica)
  const suscripcion = useAuthStore((state) => state.suscripcion)
  const setClinica = useAuthStore((state) => state.setClinica)

  const rolPermitido = hasAnyRole(usuario, ['admin', 'superadmin'])
  const funcionalidades = Array.isArray(suscripcion?.funcionalidades) ? suscripcion.funcionalidades : []
  const puedeVerFacturacionElectronica = funcionalidades.includes('facturacion_electronica')
  const puedeEditarFacturacionElectronica = hasAnyRole(usuario, ['admin', 'superadmin'])

  useEffect(() => {
    document.title = 'Configuracion | Bourgelat'
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
      title="Configuracion de clinica"
      description="Centro institucional para mantener al dia la identidad de la clinica, su ficha fiscal y la salida de facturacion electronica."
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
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 border border-border bg-foreground px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Volver al dashboard
        </Link>
      }
      asideNote="Usa esta vista para ajustar nombre visible, datos institucionales, salida fiscal e integracion de facturacion sin mezclarlo con operacion diaria."
    >
      {clinicaQuery.isError || factusQuery.isError ? (
        <div className="grid gap-4">
          {clinicaQuery.isError ? (
            <div className="border border-red-200 bg-red-50 px-4 py-4 text-sm leading-7 text-red-700">
              {getErrorMessage(
                clinicaQuery.error,
                'No fue posible cargar la ficha institucional de la clinica.'
              )}
            </div>
          ) : null}
          {factusQuery.isError ? (
            <div className="border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-7 text-amber-800">
              {getErrorMessage(
                factusQuery.error,
                'No fue posible cargar el estado de la facturacion electronica.'
              )}
            </div>
          ) : null}
        </div>
      ) : null}

      {clinicaQuery.isLoading || !clinicaActual ? (
        <DashboardPanel
          title="Cargando configuracion"
          subtitle="Estamos reuniendo la ficha institucional y el estado fiscal de la clinica."
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
