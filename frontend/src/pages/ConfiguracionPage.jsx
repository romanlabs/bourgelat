import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Popover } from 'radix-ui'
import { toast } from 'sonner'
import {
  Building2,
  CalendarOff,
  ImageIcon,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  Upload,
  Users,
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
  StatusPill,
} from '@/features/dashboard/dashboardComponents'
import { configuracionApi } from '@/features/configuracion/configuracionApi'
import RecordatoriosCitaSection from '@/features/configuracion/RecordatoriosCitaSection'
import CuentasRecaudoSection from '@/features/configuracion/CuentasRecaudoSection'
import { recepcionApi } from '@/features/recepcion/recepcionApi'
import colombia from '@/data/colombia'
import { useAuthStore } from '@/store/authStore'
import { canAccessModule, hasAnyRole } from '@/lib/permissions'
import { invalidarDominios } from '@/lib/queryKeys'
import { tieneFuncionalidad, FUNCIONALIDAD_DIAN } from '@/lib/suscripcion'
import { Select } from '@/components/ui/select'
import CampoCelular from '@/components/shared/CampoCelular'
import { celularE164, esCelularValido, formatearCelular } from '@/lib/celular'

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
  'h-12 rounded-lg border border-input bg-card px-3 text-base text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring lg:h-11 lg:text-sm'
const LABEL_CLASS = 'text-sm font-medium text-foreground'

const normalizeEmail = (value) => value.trim().toLowerCase()
const normalizeNit = (value) => value.replace(/\D/g, '').slice(0, 15)

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.errores?.[0]?.mensaje || error?.response?.data?.message || fallback

const buildClinicForm = (clinica) => ({
  nombre: clinica?.nombre || '',
  nombreComercial: clinica?.nombreComercial || '',
  razonSocial: clinica?.razonSocial || '',
  tipoPersona: clinica?.tipoPersona || 'persona_juridica',
  email: clinica?.email || '',
  telefono: celularE164(clinica?.telefono),
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
    <label className="grid content-start gap-2">
      {/* Altura fija: con o sin «Requerido», los campos vecinos quedan alineados */}
      <div className="flex h-6 items-center gap-2">
        <span className={LABEL_CLASS}>{label}</span>
        {required ? (
          <span className="rounded bg-warning-soft px-1.5 text-[12px] font-semibold leading-5 text-warning">
            Requerido
          </span>
        ) : null}
      </div>
      {children}
      {helper ? <p className="text-[13px] leading-6 text-muted-foreground">{helper}</p> : null}
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
          <div className="rounded-xl bg-muted px-4 py-3.5 text-sm leading-6 text-muted-foreground">
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
  const [activeSection, setActiveSection] = useState('ficha')
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
      invalidarDominios(queryClient, 'configuracion')
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'No fue posible actualizar la configuración de la clínica.'))
    },
  })

  const logoInputRef = useRef(null)

  // El logo se persiste en su propio endpoint, no con el formulario: asi el
  // archivo y la fila quedan sincronizados en una sola operacion.
  const subirLogoMutation = useMutation({
    mutationFn: configuracionApi.subirLogoClinica,
    onSuccess: (data) => {
      toast.success(data?.message || 'Logo actualizado correctamente')
      if (data?.clinica) {
        setClinica(data.clinica)
        setClinicForm(buildClinicForm(data.clinica))
      }
      queryClient.invalidateQueries({ queryKey: ['configuracion-clinica'] })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'No fue posible actualizar el logo de la clínica.'))
    },
  })

  const quitarLogo = () => {
    actualizarClinicaMutation.mutate({ logo: '' })
  }

  const onSeleccionarLogo = (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    subirLogoMutation.mutate(file)
  }

  const guardarFactusMutation = useMutation({
    mutationFn: configuracionApi.guardarConfiguracionFactus,
    onSuccess: (data) => {
      toast.success(data?.message || 'Configuración de facturación electrónica guardada correctamente')
      queryClient.invalidateQueries({ queryKey: ['configuracion-factus'] })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'No fue posible guardar la configuración de facturación electrónica.'))
    },
  })

  const probarFactusMutation = useMutation({
    mutationFn: configuracionApi.probarFactus,
    onSuccess: (data) => {
      toast.success(data?.message || 'Conexión con facturación electrónica exitosa')
      queryClient.invalidateQueries({ queryKey: ['configuracion-factus'] })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'No fue posible probar la conexión con facturación electrónica.'))
    },
  })

  const sincronizarFactusMutation = useMutation({
    mutationFn: configuracionApi.sincronizarFactus,
    onSuccess: (data) => {
      toast.success(data?.message || 'Sincronización de facturación electrónica exitosa')
      invalidarDominios(queryClient, 'configuracion')
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'No fue posible sincronizar los catálogos de facturación electrónica.'))
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
      telefono: clinicForm.telefono,
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
    }

    if (payload.nombre.length < 3) {
      toast.error('El nombre institucional debe tener al menos 3 caracteres.')
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
      toast.error('Ingresa un correo institucional válido.')
      return
    }

    if (payload.telefono && !esCelularValido(payload.telefono)) {
      toast.error('El celular no es válido para el país elegido.')
      return
    }

    if ((payload.departamento && !payload.ciudad) || (!payload.departamento && payload.ciudad)) {
      toast.error('Completa departamento y ciudad juntos para mantener la ficha institucional consistente.')
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
    })
  }

  const handleSaveFactus = (event) => {
    event.preventDefault()

    if (factusForm.baseUrl && !/^https?:\/\/.+/i.test(factusForm.baseUrl.trim())) {
      toast.error('La URL base de facturación electrónica debe iniciar con http:// o https://.')
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

  // La facturación electrónica (DIAN) llega después: sin el plan que la incluye
  // se muestra como «Próximamente» y no se abre.
  const sectionOptions = [
    { id: 'ficha', label: 'Ficha de la clínica', helper: 'Identidad, contacto y datos fiscales' },
    { id: 'consultorios', label: 'Consultorios', helper: 'Salas que usan agenda y recepción' },
    { id: 'horarios', label: 'Horarios y cierres', helper: 'Atención y días bloqueados' },
    { id: 'recordatorios', label: 'Recordatorios', helper: 'Aviso por correo antes de cada cita' },
    { id: 'cuentas', label: 'Cuentas de pago', helper: 'Dónde recibes las transferencias' },
    {
      id: 'facturacion',
      label: 'Facturación electrónica',
      helper: 'Integración con la DIAN',
      proximamente: !puedeVerFacturacionElectronica,
    },
  ]

  return (
    <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start">
      <nav aria-label="Secciones de la configuración" className="flex gap-1.5 overflow-x-auto rounded-2xl bg-card p-1.5 [scrollbar-width:none] lg:sticky lg:top-6 lg:flex-col lg:gap-1 lg:overflow-visible lg:p-2 [&::-webkit-scrollbar]:hidden">
        {sectionOptions.map((section) => {
          const activa = activeSection === section.id
          return (
            <button
              key={section.id}
              type="button"
              disabled={section.proximamente}
              onClick={() => setActiveSection(section.id)}
              aria-current={activa ? 'page' : undefined}
              className={`min-h-11 shrink-0 whitespace-nowrap rounded-xl px-3.5 py-2 text-left outline-none transition focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default lg:shrink lg:whitespace-normal lg:py-3 ${
                activa ? 'bg-accent' : section.proximamente ? '' : 'hover:bg-muted'
              }`}
            >
              <span className="flex items-center justify-between gap-2">
                <span className={`text-[15px] font-semibold ${activa ? 'text-primary' : section.proximamente ? 'text-muted-foreground' : 'text-foreground'}`}>
                  {section.label}
                </span>
                {section.proximamente ? (
                  <span className="shrink-0 rounded-md bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">Próximamente</span>
                ) : null}
              </span>
              <span className="mt-0.5 hidden text-[13px] text-muted-foreground lg:block">{section.helper}</span>
            </button>
          )
        })}
      </nav>

      <div className="min-w-0 space-y-5">
      {activeSection === 'ficha' ? (
        <DashboardPanel
          title="Ficha de la clínica"
          subtitle="Nombre, NIT, contacto, dirección y logo: salen en el encabezado de los comprobantes y fórmulas que imprimas."
        >
          <form className="grid gap-4" onSubmit={handleSaveClinica}>
            <div className="grid gap-4 xl:grid-cols-2">
              <FormField label="Nombre institucional" required>
                <input
                  type="text"
                  value={clinicForm.nombre}
                  onChange={(event) => setClinicForm((current) => ({ ...current, nombre: event.target.value }))}
                  placeholder="Clínica Veterinaria Bourgelat"
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
              <FormField label="Razón social">
                <input
                  type="text"
                  value={clinicForm.razonSocial}
                  onChange={(event) =>
                    setClinicForm((current) => ({ ...current, razonSocial: event.target.value }))
                  }
                  placeholder="Clínica Veterinaria Bourgelat SAS"
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
                helper="Elige el país en la bandera y escribe el número."
              >
                <CampoCelular
                  value={clinicForm.telefono}
                  onChange={(valor) => setClinicForm((current) => ({ ...current, telefono: valor }))}
                  aria-label="Celular principal"
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
              <FormField label="Código postal">
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
              <FormField
                label="Logo"
                helper="Aparecerá en el encabezado de los comprobantes que descargues o imprimas. JPG, PNG o WEBP, máximo 4 MB."
              >
                <div className="flex items-center gap-4">
                  {clinicForm.logo ? (
                    <img
                      src={clinicForm.logo}
                      alt="Logo de la clínica"
                      className="h-16 w-16 rounded-xl bg-muted object-contain p-1"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-dashed border-input bg-muted text-muted-foreground">
                      <ImageIcon className="h-6 w-6" />
                    </div>
                  )}
                  <div className="flex flex-col items-start gap-1.5">
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      disabled={subirLogoMutation.isPending}
                      className="inline-flex h-11 items-center gap-2 rounded-lg bg-secondary px-4 text-sm font-semibold text-secondary-foreground outline-none transition hover:brightness-95 active:translate-y-px focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60 lg:h-10"
                    >
                      {subirLogoMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                      {clinicForm.logo ? 'Cambiar logo' : 'Subir logo'}
                    </button>
                    {clinicForm.logo ? (
                      <button
                        type="button"
                        onClick={quitarLogo}
                        disabled={actualizarClinicaMutation.isPending}
                        className="inline-flex min-h-11 items-center gap-1 text-[13px] text-muted-foreground transition hover:text-destructive disabled:opacity-60 lg:min-h-0"
                      >
                        <Trash2 className="h-3 w-3" /> Quitar logo
                      </button>
                    ) : null}
                  </div>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={onSeleccionarLogo}
                  />
                </div>
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

            {/* Códigos que solo pide la facturación electrónica: no salen en ningún impreso. */}
            {puedeVerFacturacionElectronica ? (
              <>
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
              </>
            ) : null}

            <div className="sticky bottom-[calc(5rem+env(safe-area-inset-bottom))] z-10 -mx-1 flex flex-wrap items-center gap-3 bg-card px-1 pb-1 pt-2 lg:static lg:mx-0 lg:bg-transparent lg:p-0 lg:pt-2">
              <button
                type="submit"
                disabled={actualizarClinicaMutation.isPending}
                className="inline-flex h-12 w-full items-center lg:w-auto lg:h-11 justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground outline-none transition hover:brightness-110 active:translate-y-px focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actualizarClinicaMutation.isPending ? 'Guardando...' : 'Guardar configuración'}
              </button>
            </div>
          </form>
        </DashboardPanel>
      ) : null}

      {activeSection === 'consultorios' ? <ConsultoriosSection /> : null}

      {activeSection === 'horarios' ? (
        <HorariosSection horarioAtencion={initialClinica?.horarioAtencion} />
      ) : null}

      {activeSection === 'recordatorios' ? <RecordatoriosCitaSection clinica={initialClinica} /> : null}
      {activeSection === 'cuentas' ? <CuentasRecaudoSection /> : null}

      {activeSection === 'facturacion' ? (
        !puedeVerFacturacionElectronica ? (
        <EmptyState
          icon={<Sparkles />}
          title="Facturación electrónica no incluida en el plan actual"
          description="La conexión de facturación electrónica se habilita cuando la clínica sube a un plan con facturación electrónica. Las ventas se imprimen como comprobante de venta, sin valor fiscal."
          action={<NavCta to="/planes" icon={Sparkles}>Revisar planes</NavCta>}
        />
      ) : (
        <div className="grid gap-5 2xl:grid-cols-[minmax(0,1.2fr)_400px]">
          {puedeEditarFacturacionElectronica ? (
            <DashboardPanel
              title="Facturación electrónica"
              subtitle="Configura la conexión de facturación electrónica, guarda tus claves de acceso y revisa que todo esté funcionando sin salir de esta pantalla."
              action={
                <div className="flex flex-wrap gap-2">
                  <StatusPill
                    tone={
                      factusForm.activa
                        ? 'bg-success-soft text-success'
                        : 'bg-secondary text-secondary-foreground'
                    }
                  >
                    {factusForm.activa ? 'Integración activa' : 'Integración inactiva'}
                  </StatusPill>
                  <StatusPill
                    tone={
                      credencialesCompletas
                        ? 'bg-accent text-primary'
                        : 'bg-warning-soft text-warning'
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
                  <label className="flex items-center gap-3 rounded-xl bg-muted px-4 py-3 text-sm text-foreground">
                    <input
                      type="checkbox"
                      checked={factusForm.activa}
                      onChange={(event) =>
                        setFactusForm((current) => ({ ...current, activa: event.target.checked }))
                      }
                      className="h-4 w-4 rounded border-input accent-primary text-primary focus:ring-ring"
                    />
                    Activar la conexión para la clínica
                  </label>
                </div>

                <FormField label="URL base" helper="Dirección del servicio de facturación electrónica. Si no estás seguro, déjala como viene.">
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
                  <FormField label="Client ID" helper="Lo encuentras en tu cuenta del proveedor de facturación, en la sección de integraciones.">
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
                  <FormField label="Client secret" helper="Clave privada que entrega tu proveedor de facturación. No la compartas con nadie.">
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
                  <FormField label="Usuario o correo" helper="El mismo con el que ingresas al portal de tu proveedor de facturación.">
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
                  <FormField label="Contraseña" helper="La contraseña de tu cuenta del proveedor de facturación, no la de Bourgelat.">
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
                  <FormField label="Método de pago">
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

                <label className="flex items-center gap-3 rounded-xl bg-muted px-4 py-3 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={factusForm.enviarEmail}
                    onChange={(event) =>
                      setFactusForm((current) => ({ ...current, enviarEmail: event.target.checked }))
                    }
                    className="h-4 w-4 rounded border-input accent-primary text-primary focus:ring-ring"
                  />
                  Enviar correo al emitir documentos desde la integración
                </label>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={guardarFactusMutation.isPending}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-primary px-4 lg:h-11 text-sm font-semibold text-primary-foreground outline-none transition hover:brightness-110 active:translate-y-px focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {guardarFactusMutation.isPending ? 'Guardando...' : 'Guardar configuración'}
                  </button>
                  <button
                    type="button"
                    onClick={() => probarFactusMutation.mutate()}
                    disabled={probarFactusMutation.isPending}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-secondary px-4 lg:h-11 text-sm font-semibold text-secondary-foreground outline-none transition hover:brightness-95 active:translate-y-px focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {probarFactusMutation.isPending ? 'Probando...' : 'Probar conexión'}
                  </button>
                  <button
                    type="button"
                    onClick={() => sincronizarFactusMutation.mutate()}
                    disabled={sincronizarFactusMutation.isPending}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-secondary px-4 lg:h-11 text-sm font-semibold text-secondary-foreground outline-none transition hover:brightness-95 active:translate-y-px focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {sincronizarFactusMutation.isPending ? 'Sincronizando...' : 'Sincronizar catálogos'}
                  </button>
                </div>
              </form>
            </DashboardPanel>
          ) : (
            <DashboardPanel
              title="Facturación electrónica"
              subtitle="La conexión con la DIAN se administra desde Bourgelat para evitar cambios delicados por parte de la clínica."
              action={
                <StatusPill tone="bg-secondary text-secondary-foreground">
                  Solo lectura para la clínica
                </StatusPill>
              }
            >
              <div className="grid gap-4">
                <div className="rounded-xl bg-accent px-4 py-3.5 text-sm leading-6 text-primary">
                  Tu equipo puede usar la facturación electrónica desde la sección de caja, pero
                  la conexión con la DIAN solo la puede cambiar el equipo de soporte o un
                  administrador de la plataforma.
                </div>
                <div className="grid gap-4 xl:grid-cols-2">
                  <div className="rounded-xl bg-muted px-4 py-3.5 text-sm text-foreground">
                    <p className={LABEL_CLASS}>Ambiente</p>
                    <p className="mt-3 font-semibold text-foreground">
                      {FACTUS_ENV_OPTIONS.find((option) => option.value === factusForm.ambiente)?.label ||
                        'Sin definir'}
                    </p>
                  </div>
                  <div className="rounded-xl bg-muted px-4 py-3.5 text-sm text-foreground">
                    <p className={LABEL_CLASS}>Estado de la conexión</p>
                    <p className="mt-3 font-semibold text-foreground">
                      {factusForm.activa ? 'Activa para emitir' : 'Pendiente de activación'}
                    </p>
                  </div>
                </div>
                <div className="grid gap-4 2xl:grid-cols-3">
                  <div className="rounded-xl bg-muted px-4 py-3.5 text-sm text-foreground">
                    <p className={LABEL_CLASS}>Origen de las claves</p>
                    <p className="mt-3 font-semibold text-foreground">
                      {formatCredentialSource(configuracionEfectiva?.fuenteCredenciales)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-muted px-4 py-3.5 text-sm text-foreground">
                    <p className={LABEL_CLASS}>Rango de numeración</p>
                    <p className="mt-3 font-semibold text-foreground">
                      {integracionFactus?.rangoNumeracionId || 'Pendiente'}
                    </p>
                  </div>
                  <div className="rounded-xl bg-muted px-4 py-3.5 text-sm text-foreground">
                    <p className={LABEL_CLASS}>Última revisión</p>
                    <p className="mt-3 font-semibold text-foreground">
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
                        ? 'bg-success-soft text-success'
                        : 'bg-warning-soft text-warning'
                    }
                  >
                    {credencialesCompletas ? 'Credenciales completas' : 'Credenciales incompletas'}
                  </StatusPill>
                  <StatusPill tone="bg-secondary text-secondary-foreground">
                    {formatCredentialSource(configuracionEfectiva?.fuenteCredenciales)}
                  </StatusPill>
                </div>

                <div className="grid gap-3">
                  <div className="rounded-xl bg-muted px-4 py-3 text-sm text-foreground">
                    Ambiente:{' '}
                    <span className="font-semibold text-foreground">
                      {FACTUS_ENV_OPTIONS.find((option) => option.value === factusForm.ambiente)?.label ||
                        'Sin definir'}
                    </span>
                  </div>
                  <div className="rounded-xl bg-muted px-4 py-3 text-sm text-foreground">
                    Ultimo chequeo:{' '}
                    <span className="font-semibold text-foreground">
                      {formatDateTime(integracionFactus?.ultimoChequeo)}
                    </span>
                  </div>
                  <div className="rounded-xl bg-muted px-4 py-3 text-sm text-foreground">
                    Rango activo:{' '}
                    <span className="font-semibold text-foreground">
                      {integracionFactus?.rangoNumeracionId || 'Pendiente'}
                    </span>
                  </div>
                  <div className="rounded-xl bg-muted px-4 py-3 text-sm text-foreground">
                    URL base:{' '}
                    <span className="font-semibold text-foreground">
                      {configuracionEfectiva?.baseUrl || 'Pendiente'}
                    </span>
                  </div>
                </div>

                {integracionFactus?.ultimoMensajeChequeo ? (
                  <div
                    className={`px-4 py-4 text-sm leading-7 ${
                      estadoFactus === 'exitoso'
                        ? 'rounded-xl bg-success-soft text-success'
                        : 'rounded-xl bg-warning-soft text-warning'
                    }`}
                  >
                    {integracionFactus.ultimoMensajeChequeo}
                  </div>
                ) : null}

                {configuracionLocal ? (
                  <div className="rounded-xl bg-muted px-4 py-3.5 text-sm leading-6 text-muted-foreground">
                    Hay configuración local disponible. Si no guardas credenciales propias, la
                    clínica puede apoyarse en las variables del entorno del despliegue.
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
                  <div className="rounded-xl bg-warning-soft px-4 py-3.5 text-sm leading-6 text-warning">
                    La facturación electrónica puede quedar configurada, pero la clínica aún necesita completar datos
                    para una salida fiscal más ordenada.
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {camposPendientes.map((item) => (
                      <StatusPill key={item} tone="bg-card text-warning">
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

// La vista es «abre, cierra y una pausa opcional»; lo que se guarda siguen
// siendo franjas (una, o dos si hay pausa), igual que espera el backend.
const PAUSA_POR_DEFECTO = { inicio: '13:00', fin: '14:00' }

const vistaDia = (franjas = []) => {
  if (!franjas.length) return null
  const ordenadas = [...franjas].sort((a, b) => a.inicio.localeCompare(b.inicio))
  return {
    abre: ordenadas[0].inicio,
    cierra: ordenadas[ordenadas.length - 1].fin,
    pausa: ordenadas.length > 1 ? { inicio: ordenadas[0].fin, fin: ordenadas[1].inicio } : null,
    variasFranjas: ordenadas.length > 2,
  }
}

const franjasDesdeVista = ({ abre, cierra, pausa }) =>
  pausa
    ? [
        { inicio: abre, fin: pausa.inicio },
        { inicio: pausa.fin, fin: cierra },
      ]
    : [{ inicio: abre, fin: cierra }]

// Hora en una sola caja («8:00 a. m.»), cada 15 minutos: el horario de la
// semana cabe en una fila por día. Una hora guardada fuera de la grilla se
// conserva como opción.
const OPCIONES_HORA = Array.from({ length: 96 }, (_, i) => {
  const valor = `${String(Math.floor(i / 4)).padStart(2, '0')}:${String((i % 4) * 15).padStart(2, '0')}`
  return { value: valor, label: formatHora12(valor) }
})

function HoraChip({ value, onChange, ...props }) {
  const opciones = OPCIONES_HORA.some((o) => o.value === value)
    ? OPCIONES_HORA
    : [...OPCIONES_HORA, { value, label: formatHora12(value) }].sort((x, y) => x.value.localeCompare(y.value))
  return (
    <Select variant="field" className="h-11 w-[112px] text-[13px] lg:h-9" value={value} onValueChange={onChange} options={opciones} {...props} />
  )
}

function Interruptor({ activo, onChange, etiqueta }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={activo}
      aria-label={etiqueta}
      onClick={onChange}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full outline-none transition before:absolute before:-inset-x-1 before:-inset-y-2.5 focus-visible:ring-2 focus-visible:ring-ring ${
        activo ? 'bg-primary' : 'bg-muted-foreground/25'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 rounded-full bg-card transition-transform ${activo ? 'translate-x-6' : 'translate-x-1'}`}
      />
    </button>
  )
}

// La pausa se lee como texto en la misma fila del día; al tocarla se editan
// sus dos horas en un globo. Así el horario de la semana va en una línea por día.
function PausaDia({ label, pausa, onCambiar }) {
  if (!pausa) {
    return (
      <span className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
        Sin pausa
        <button
          type="button"
          onClick={() => onCambiar({ ...PAUSA_POR_DEFECTO })}
          className="inline-flex min-h-11 items-center gap-0.5 rounded-md px-1 font-semibold text-primary outline-none transition hover:underline focus-visible:ring-2 focus-visible:ring-ring lg:min-h-0"
        >
          <Plus className="h-3.5 w-3.5" />
          Pausa
        </button>
      </span>
    )
  }

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={`Editar la pausa del ${label.toLowerCase()}`}
          className="min-h-11 rounded-md px-1 text-[13px] text-muted-foreground underline decoration-dotted lg:min-h-0 underline-offset-4 outline-none transition hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          Pausa de {formatFranja12(pausa.inicio, pausa.fin)}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          className="z-50 flex flex-col gap-3 rounded-xl bg-popover p-3 shadow-dropdown outline-none"
        >
          <p className="text-[13px] font-semibold text-foreground">Pausa del {label.toLowerCase()}</p>
          <span className="flex items-center gap-2 text-[13px] text-muted-foreground">
            <HoraChip aria-label={`${label}, pausa desde`} value={pausa.inicio} onChange={(valor) => onCambiar({ ...pausa, inicio: valor })} />
            a
            <HoraChip aria-label={`${label}, pausa hasta`} value={pausa.fin} onChange={(valor) => onCambiar({ ...pausa, fin: valor })} />
          </span>
          <Popover.Close asChild>
            <button
              type="button"
              onClick={() => onCambiar(null)}
              className="min-h-11 self-start rounded-md text-[13px] font-semibold text-danger outline-none hover:underline lg:min-h-0 focus-visible:ring-2 focus-visible:ring-ring"
            >
              Quitar pausa
            </button>
          </Popover.Close>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

function HorarioSemanal({ horario, setHorario, onGuardar, guardando, sinConfigurar = false }) {
  const actualizarDia = (clave, vista) =>
    setHorario((current) => ({ ...current, [clave]: vista ? franjasDesdeVista(vista) : [] }))

  const alternarDia = (clave) =>
    actualizarDia(clave, horario[clave]?.length ? null : { abre: '08:00', cierra: '18:00', pausa: null })

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
    <section aria-labelledby="horario-atencion" className="rounded-2xl bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 id="horario-atencion" className="text-lg font-semibold tracking-[-0.02em] text-foreground">Horario de atención</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">La agenda solo ofrece cupos dentro de este horario.</p>
        </div>
        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
          <button
            type="button"
            onClick={copiarATodaLaSemana}
            className="inline-flex h-11 items-center justify-center rounded-lg bg-secondary px-3.5 text-center text-[13px] leading-tight lg:h-9 font-semibold text-secondary-foreground outline-none transition hover:brightness-95 active:translate-y-px focus-visible:ring-2 focus-visible:ring-ring"
          >
            Copiar a toda la semana
          </button>
          <button
            type="button"
            onClick={onGuardar}
            disabled={guardando}
            className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-3.5 text-[13px] lg:h-9 font-semibold text-primary-foreground outline-none transition hover:brightness-110 active:translate-y-px focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
          >
            {guardando ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </div>

      {sinConfigurar ? (
        <p className="mt-3 rounded-xl bg-info-soft px-4 py-3 text-sm leading-6 text-info">
          Aún no has configurado el horario: la agenda acepta citas a cualquier hora, todos los días.
          Enciende los días en que atiendes y guarda.
        </p>
      ) : null}

      <ul className="mt-3 flex flex-col divide-y divide-border">
        {DIAS_SEMANA.map(({ clave, label }) => {
          const vista = vistaDia(horario[clave])
          const abierto = Boolean(vista)
          const cambiar = (cambios) => actualizarDia(clave, { ...vista, ...cambios })

          return (
            <li key={clave} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3 lg:gap-y-1 lg:py-2">
              <span className="w-[88px] shrink-0 text-sm font-semibold text-foreground">{label}</span>
              <Interruptor
                activo={abierto}
                onChange={() => alternarDia(clave)}
                etiqueta={`${label}: ${abierto ? 'abierto' : 'cerrado'}`}
              />
              {abierto ? (
                <>
                  <span className="flex items-center gap-2 text-sm text-muted-foreground">
                    <HoraChip aria-label={`${label}, abre`} value={vista.abre} onChange={(valor) => cambiar({ abre: valor })} />
                    a
                    <HoraChip aria-label={`${label}, cierra`} value={vista.cierra} onChange={(valor) => cambiar({ cierra: valor })} />
                  </span>
                  <PausaDia label={label} pausa={vista.pausa} onCambiar={(pausa) => cambiar({ pausa })} />
                  {vista.variasFranjas ? (
                    <span className="w-full text-[13px] text-warning">
                      Este día tiene más de dos franjas; al editarlo queda con una sola pausa.
                    </span>
                  ) : null}
                </>
              ) : (
                <span className="text-sm text-muted-foreground">Cerrado</span>
              )}
            </li>
          )
        })}
      </ul>
    </section>
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

        <div className="max-h-64 divide-y divide-border overflow-y-auto rounded-xl bg-muted">
          {citas.map((cita) => (
            <div key={cita.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <div>
                <p className="font-semibold text-foreground">
                  {formatHora12(cita.horaInicio)} · {cita.mascota?.nombre || 'Paciente sin nombre'}
                </p>
                <p className="text-[13px] text-muted-foreground">
                  {formatRangoFechas(cita.fecha, cita.fecha)}
                  {cita.veterinario?.nombre ? ` · ${cita.veterinario.nombre}` : ''}
                </p>
              </div>
              {cita.cancelable ? null : (
                <StatusPill tone="bg-warning-soft text-warning">
                  No cancelable
                </StatusPill>
              )}
            </div>
          ))}
        </div>

        {citas.some((cita) => !cita.cancelable) ? (
          <p className="text-[13px] leading-6 text-muted-foreground">
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
  // Guardar con los siete días apagados cierra la agenda: se confirma antes.
  const [confirmarTodoCerrado, setConfirmarTodoCerrado] = useState(false)

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
      invalidarDominios(queryClient, 'configuracion', 'agenda')
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
      // Crear un bloqueo puede cancelar citas: la agenda tiene que reflejarlo.
      // (Antes se invalidaba ['citas'], clave que ninguna query usa.)
      invalidarDominios(queryClient, 'configuracion', 'agenda')
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'No fue posible crear el bloqueo.'))
    },
  })

  const eliminarBloqueoMutation = useMutation({
    mutationFn: configuracionApi.eliminarBloqueo,
    onSuccess: () => {
      toast.success('Bloqueo eliminado')
      // Liberar el bloqueo devuelve horarios disponibles a la agenda.
      invalidarDominios(queryClient, 'configuracion', 'agenda')
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

    if (DIAS_SEMANA.every(({ clave }) => !horario[clave]?.length)) {
      setConfirmarTodoCerrado(true)
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
    <div className="grid gap-4 2xl:grid-cols-[minmax(0,1.2fr)_400px] lg:gap-5">
      <HorarioSemanal
        horario={horario}
        setHorario={setHorario}
        onGuardar={handleGuardarHorario}
        guardando={guardarHorarioMutation.isPending}
        sinConfigurar={!horarioAtencion}
      />

      <DialogRoot open={confirmarTodoCerrado} onOpenChange={setConfirmarTodoCerrado}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>¿Guardar con todos los días cerrados?</DialogTitle>
            <DialogDescription>
              Así la agenda no acepta ninguna cita programada (los ingresos directos sí, con aviso).
              Si lo que quieres es atender a cualquier hora, deja la clínica sin horario.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setConfirmarTodoCerrado(false)
                guardarHorarioMutation.mutate(null)
              }}
            >
              Dejar sin horario
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                setConfirmarTodoCerrado(false)
                guardarHorarioMutation.mutate(horario)
              }}
            >
              Cerrar todos los días
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogRoot>

      <div className="space-y-5">
        <DashboardPanel
          title="Días y franjas bloqueadas"
          subtitle="Cierres puntuales por imprevistos. La agenda no permitirá programar citas en estos rangos."
          action={<CalendarOff className="h-4 w-4 text-primary" />}
        >
          {bloqueosQuery.isLoading ? (
            <div className="grid gap-3">
              {[0, 1].map((item) => (
                <div key={item} className="h-14 animate-pulse rounded-xl bg-muted" />
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
            <div className="divide-y divide-border overflow-hidden rounded-xl bg-muted">
              {bloqueos.map((bloqueo) => (
                <div key={bloqueo.id} className="flex items-start justify-between gap-3 px-3 py-3 sm:px-4">
                  <div className="min-w-0">
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
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground lg:h-10 lg:w-10 outline-none transition hover:bg-danger-soft hover:text-danger active:translate-y-px focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
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

            <label className="flex items-center gap-3 rounded-xl bg-muted px-4 py-3 text-sm text-foreground">
              <input
                type="checkbox"
                checked={bloqueoForm.diaCompleto}
                onChange={(event) =>
                  setBloqueoForm((current) => ({ ...current, diaCompleto: event.target.checked }))
                }
                className="h-4 w-4 rounded border-input accent-primary text-primary focus:ring-ring"
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
              className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-primary px-4 lg:h-11 text-sm font-semibold text-primary-foreground outline-none transition hover:brightness-110 active:translate-y-px focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
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
      invalidarDominios(queryClient, 'configuracion', 'agenda')
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'No fue posible crear el consultorio.'))
    },
  })

  const actualizarMutation = useMutation({
    mutationFn: ({ id, payload }) => recepcionApi.actualizarConsultorio(id, payload),
    onSuccess: () => {
      invalidarDominios(queryClient, 'configuracion', 'agenda')
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
              <div key={item} className="h-14 animate-pulse rounded-xl bg-muted" />
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
          <div className="divide-y divide-border overflow-hidden rounded-xl bg-muted">
            {consultorios.map((consultorio) => (
              <div key={consultorio.id} className="flex items-center justify-between gap-3 px-3 py-3 sm:gap-4 sm:px-4">
                <div className="min-w-0">
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
                  className={`inline-flex h-11 shrink-0 items-center rounded-lg px-3 text-[13px] lg:h-9 font-semibold outline-none transition hover:brightness-95 active:translate-y-px focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${
                    consultorio.activo
                      ? 'bg-danger-soft text-danger'
                      : 'bg-success-soft text-success'
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
            className="h-12 rounded-lg border border-input bg-card px-3 text-base text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring lg:h-11 lg:text-sm"
          />
          <textarea
            value={descripcion}
            onChange={(event) => setDescripcion(event.target.value)}
            placeholder="Descripción (opcional)"
            className="min-h-[90px] rounded-lg border border-input bg-card px-3 py-3 text-base text-foreground lg:text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
          />
          <button
            type="submit"
            disabled={crearMutation.isPending}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-primary px-4 lg:h-11 text-sm font-semibold text-primary-foreground outline-none transition hover:brightness-110 active:translate-y-px focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
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

  const rolPermitido = canAccessModule(usuario, 'configuracion')
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

  // El encabezado es la clínica misma: logo (o iniciales), nombre y sus datos.
  const nombreClinica = clinicaActual?.nombreComercial || clinicaActual?.nombre || 'Tu clínica'
  const inicialesClinica = nombreClinica
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase() || '')
    .join('')
  const datosClinica = [
    clinicaActual?.nit ? `NIT ${clinicaActual.nit}${clinicaActual.digitoVerificacion ? `-${clinicaActual.digitoVerificacion}` : ''}` : null,
    [clinicaActual?.direccion, clinicaActual?.ciudad].filter(Boolean).join(', ') || null,
    formatearCelular(clinicaActual?.telefono) || null,
  ].filter(Boolean).join(' · ')

  return (
    <AdminShell
      currentKey="configuracion"
      title={
        <span className="flex items-center gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-accent text-xl font-bold text-primary">
            {clinicaActual?.logo ? (
              <img src={clinicaActual.logo} alt="" className="h-full w-full object-cover" />
            ) : (
              inicialesClinica
            )}
          </span>
          <span className="min-w-0">{nombreClinica}</span>
        </span>
      }
      description={datosClinica || 'Completa la ficha con la dirección y el teléfono de la clínica.'}
      actions={
        <NavCta to="/usuarios" icon={Users}>
          Equipo y roles
        </NavCta>
      }
      asideNote="Usa esta vista para ajustar nombre visible, datos institucionales, salida fiscal y facturación, sin mezclarlo con la operación diaria."
    >
      {clinicaQuery.isError || factusQuery.isError ? (
        <div className="grid gap-4">
          {clinicaQuery.isError ? (
            <div className="rounded-xl bg-danger-soft px-4 py-3.5 text-sm leading-6 text-danger">
              {getErrorMessage(
                clinicaQuery.error,
                'No fue posible cargar la ficha institucional de la clínica.'
              )}
            </div>
          ) : null}
          {factusQuery.isError ? (
            <div className="rounded-xl bg-warning-soft px-4 py-3.5 text-sm leading-6 text-warning">
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
              <div key={item} className="h-40 animate-pulse rounded-xl bg-muted" />
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
