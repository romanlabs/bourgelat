import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import AdminShell from '@/components/layout/AdminShell'
import { Select } from '@/components/ui/select'
import { auditoriaApi } from '@/features/auditoria/auditoriaApi'
import { useAuthStore } from '@/store/authStore'
import { canAccessModule } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import { useMediaQuery } from '@/hooks/useMediaQuery'

const FOCO = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
const LIMITE = 30

const MODULOS = {
  Factura: 'Ventas',
  AbonoFactura: 'Abonos',
  CajaTurno: 'Turnos de caja',
  MovimientoCaja: 'Movimientos de caja',
  Gasto: 'Gastos',
  Cita: 'Agenda',
  BloqueoAgenda: 'Bloqueos de agenda',
  HistoriaClinica: 'Historias',
  ExamenLaboratorio: 'Exámenes',
  RegistroEstilo: 'Estilos',
  Mascota: 'Pacientes',
  Propietario: 'Tutores',
  Producto: 'Inventario',
  InsumoClinico: 'Insumos clínicos',
  Usuario: 'Usuarios',
  Clinica: 'Clínica',
  IntegracionFacturacion: 'Facturación electrónica',
  TicketSoporte: 'Soporte',
  Auth: 'Inicio de sesión',
}

const VERBOS = {
  CREAR_FACTURA: 'registró una venta',
  ANULAR_FACTURA: 'anuló una venta',
  REGISTRAR_PAGO_FACTURA: 'registró un pago',
  REGISTRAR_ABONO_FACTURA: 'registró un abono',
  ABRIR_TURNO_CAJA: 'abrió el turno de caja',
  CERRAR_TURNO_CAJA: 'cerró el turno de caja',
  CERRAR_TURNO_CAJA_ADMIN: 'cerró el turno de caja de otra persona',
  REGISTRAR_MOVIMIENTO_CAJA: 'registró un movimiento de caja',
  CREAR_GASTO: 'registró un gasto',
  ANULAR_GASTO: 'anuló un gasto',
  CREAR_HISTORIA_CLINICA: 'creó una historia clínica',
  EDITAR_HISTORIA_CLINICA: 'editó una historia clínica',
  BLOQUEAR_HISTORIA_CLINICA: 'cerró una historia clínica',
  INTENTO_EDITAR_HISTORIA_BLOQUEADA: 'intentó editar una historia cerrada',
  CREAR_EXAMEN_LABORATORIO: 'registró un examen',
  EDITAR_EXAMEN_LABORATORIO: 'editó un examen',
  ELIMINAR_EXAMEN_LABORATORIO: 'eliminó un examen',
  CREAR_REGISTRO_ESTILO: 'registró un servicio de estilos',
  EDITAR_REGISTRO_ESTILO: 'editó un servicio de estilos',
  INTENTO_EDITAR_ESTILO_BLOQUEADO: 'intentó editar un servicio de estilos cerrado',
  CREAR_MASCOTA: 'registró un paciente',
  EDITAR_MASCOTA: 'editó un paciente',
  DESACTIVAR_MASCOTA: 'desactivó un paciente',
  ACTIVAR_MASCOTA: 'reactivó un paciente',
  CREAR_PROPIETARIO: 'registró un tutor',
  EDITAR_PROPIETARIO: 'editó un tutor',
  CREAR_USUARIO: 'creó un usuario',
  EDITAR_USUARIO: 'editó un usuario',
  CANCELAR_CITA: 'canceló una cita',
  CITA_FUERA_DE_HORARIO: 'agendó una cita fuera del horario',
  CREAR_BLOQUEO_AGENDA: 'bloqueó días en la agenda',
  ELIMINAR_BLOQUEO_AGENDA: 'quitó un bloqueo de la agenda',
  ACTUALIZAR_CLINICA: 'cambió los datos de la clínica',
  ACTUALIZAR_LOGO_CLINICA: 'cambió el logo de la clínica',
  ACTUALIZAR_HORARIO_ATENCION: 'cambió el horario de atención',
  ACTUALIZAR_RECORDATORIOS_CITA: 'cambió los recordatorios de citas',
  ACTUALIZAR_PERFIL: 'actualizó su perfil',
  RELEVAR_VENCIMIENTO_PRODUCTO: 'actualizó el vencimiento de un producto',
  RELEVAR_VENCIMIENTO_INSUMO: 'actualizó el vencimiento de un insumo',
  CREAR_TICKET_SOPORTE: 'escribió a soporte',
  RESPONDER_TICKET_SOPORTE: 'respondió un caso de soporte',
  CAMBIAR_ESTADO_TICKET_SOPORTE: 'cambió el estado de un caso de soporte',
  GUARDAR_CONFIG_FACTUS: 'guardó la configuración de facturación electrónica',
  PROBAR_CONFIG_FACTUS: 'probó la conexión de facturación electrónica',
  SINCRONIZAR_FACTUS: 'sincronizó la facturación electrónica',
  EMITIR_FACTURA_ELECTRONICA: 'emitió una factura electrónica',
  DESCARGAR_FACTURA_ELECTRONICA: 'descargó una factura electrónica',
  REGISTRO_CLINICA: 'registró la clínica',
  COMPLETAR_ONBOARDING: 'terminó la configuración inicial',
  LOGIN: 'entró al sistema',
  LOGIN_FALLIDO: 'no pudo entrar al sistema',
  LOGOUT_ALL: 'cerró todas sus sesiones',
  PASSWORD_CAMBIADO: 'cambió su contraseña',
  PASSWORD_RESET_SOLICITADO: 'pidió recuperar la contraseña',
  PASSWORD_RESET_COMPLETADO: 'recuperó la contraseña',
  EMAIL_VERIFICADO: 'verificó su correo',
  REFRESH_TOKEN_REUSE: 'tuvo la sesión bloqueada por seguridad',
}

const TIPOS = {
  crear: { label: 'Nuevo', clase: 'bg-success-soft text-success' },
  editar: { label: 'Cambio', clase: 'bg-primary/10 text-primary' },
  anular: { label: 'Anulado', clase: 'bg-danger-soft text-danger' },
  sesion: { label: 'Sesión', clase: 'bg-muted text-muted-foreground' },
  fallido: { label: 'Fallido', clase: 'bg-warning-soft text-warning' },
  otro: { label: 'Sistema', clase: 'bg-muted text-muted-foreground' },
}

const AVATARES = [
  'bg-primary/10 text-primary',
  'bg-brand/20 text-foreground',
  'bg-info-soft text-info',
  'bg-success-soft text-success',
  'bg-warning-soft text-warning',
]

const RANGOS = [
  { value: 'hoy', label: 'Hoy' },
  { value: '7dias', label: 'Últimos 7 días' },
  { value: 'mes', label: 'Este mes' },
  { value: 'mesPasado', label: 'Mes pasado' },
]

const CAMPOS_OCULTOS = new Set(['id', 'clinicaId', 'createdAt', 'updatedAt', 'password', 'passwordHash'])

const isoLocal = (fecha) => {
  const y = fecha.getFullYear()
  const m = String(fecha.getMonth() + 1).padStart(2, '0')
  const d = String(fecha.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const rangoFechas = (rango) => {
  const hoy = new Date()
  if (rango === 'hoy') return { desde: isoLocal(hoy), hasta: isoLocal(hoy) }
  if (rango === 'mes') return { desde: isoLocal(new Date(hoy.getFullYear(), hoy.getMonth(), 1)), hasta: isoLocal(hoy) }
  if (rango === 'mesPasado') {
    return {
      desde: isoLocal(new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1)),
      hasta: isoLocal(new Date(hoy.getFullYear(), hoy.getMonth(), 0)),
    }
  }
  const hace7 = new Date(hoy)
  hace7.setDate(hoy.getDate() - 6)
  return { desde: isoLocal(hace7), hasta: isoLocal(hoy) }
}

const formatoPesos = (texto) =>
  String(texto || '').replace(/\$\s?(\d{4,})(?![\d.,])/g, (_, n) => `$${Number(n).toLocaleString('es-CO')}`)

const humanizarAccion = (accion) => String(accion || 'acción').toLowerCase().replaceAll('_', ' ')

const verbo = (log) => VERBOS[log.accion] || humanizarAccion(log.accion)

const iniciales = (nombre) =>
  String(nombre || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase())
    .join('') || '?'

const colorAvatar = (id) => {
  if (!id) return 'bg-muted text-muted-foreground'
  const suma = [...id].reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return AVATARES[suma % AVATARES.length]
}

const hora = (valor) =>
  new Intl.DateTimeFormat('es-CO', { hour: 'numeric', minute: '2-digit' }).format(new Date(valor))

const diaLargo = (valor) =>
  new Intl.DateTimeFormat('es-CO', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(valor))

const tituloDia = (valor) => {
  const fecha = new Date(valor)
  const hoy = new Date()
  const ayer = new Date()
  ayer.setDate(hoy.getDate() - 1)
  if (isoLocal(fecha) === isoLocal(hoy)) return `Hoy, ${diaLargo(fecha)}`
  if (isoLocal(fecha) === isoLocal(ayer)) return `Ayer, ${diaLargo(fecha)}`
  const texto = diaLargo(fecha)
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

const cuandoLargo = (valor) => {
  const fecha = new Date(valor)
  const dia = isoLocal(fecha) === isoLocal(new Date())
    ? 'Hoy'
    : new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }).format(fecha)
  return `${dia}, ${hora(fecha)}`
}

const navegador = (ua = '') => {
  if (/Edg\//.test(ua)) return 'Edge'
  if (/OPR\//.test(ua)) return 'Opera'
  if (/Chrome\//.test(ua)) return 'Chrome'
  if (/Firefox\//.test(ua)) return 'Firefox'
  if (/Safari\//.test(ua)) return 'Safari'
  return ''
}

const etiquetaCampo = (clave) => {
  const texto = clave.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase()
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

const formatoValor = (valor) => {
  if (valor === null || valor === undefined || valor === '') return '—'
  if (typeof valor === 'boolean') return valor ? 'Sí' : 'No'
  if (typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(valor)) return cuandoLargo(valor)
  return formatoPesos(String(valor))
}

const esObjeto = (valor) => valor && typeof valor === 'object' && !Array.isArray(valor)

const cambiosDe = (log) => {
  const antes = esObjeto(log?.datosAnteriores) ? log.datosAnteriores : null
  const despues = esObjeto(log?.datosNuevos) ? log.datosNuevos : null
  if (!antes && !despues) return null
  const claves = [...new Set([...Object.keys(antes || {}), ...Object.keys(despues || {})])]
    .filter((clave) => !CAMPOS_OCULTOS.has(clave) && !/Id$/.test(clave))
    // Horarios y listas no se leen bien en una celda: el detalle ya los resume.
    .filter((clave) => ![antes?.[clave], despues?.[clave]].some((v) => v && typeof v === 'object'))
    .filter((clave) => !antes || !despues || JSON.stringify(antes[clave]) !== JSON.stringify(despues[clave]))
    .slice(0, 12)
  if (!claves.length) return null
  return {
    conAntes: Boolean(antes),
    conDespues: Boolean(despues),
    filas: claves.map((clave) => ({
      clave,
      campo: etiquetaCampo(clave),
      antes: antes ? formatoValor(antes[clave]) : null,
      despues: despues ? formatoValor(despues[clave]) : null,
    })),
  }
}

function Filtro({ label, children }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span className="text-[13px] text-muted-foreground">{label}</span>
      {children}
    </div>
  )
}

function Chip({ tipo }) {
  const t = TIPOS[tipo] || TIPOS.otro
  return <span className={cn('whitespace-nowrap rounded-[5px] px-2 py-1 text-[13px] font-semibold', t.clase)}>{t.label}</span>
}

function Detalle({ log, enLinea = false }) {
  if (!log) return null
  const quien = log.responsable?.nombre || 'Alguien'
  const cambios = cambiosDe(log)
  const desde = [log.ip, navegador(log.userAgent)].filter(Boolean).join(' · ') || '—'
  const fallido = log.resultado === 'fallido'

  return (
    <section
      aria-labelledby={enLinea ? undefined : 'au-det'}
      aria-label={enLinea ? 'Detalle del cambio' : undefined}
      className={cn(
        'flex-col gap-4',
        enLinea ? 'mt-3 flex border-t border-border pt-3 lg:hidden' : 'hidden rounded-2xl bg-card p-6 lg:sticky lg:top-6 lg:mt-8 lg:flex'
      )}
    >
      {enLinea ? null : (
        <>
          <span className="self-start"><Chip tipo={log.tipo} /></span>
          <h2 id="au-det" className="text-2xl font-semibold leading-tight tracking-[-0.02em] text-foreground">
            {quien} {verbo(log)}
          </h2>
        </>
      )}
      <dl className="grid grid-cols-2 gap-x-5 gap-y-3.5 text-sm">
        <div><dt className="text-[13px] text-muted-foreground">Cuándo</dt><dd className="mt-1 font-medium">{cuandoLargo(log.createdAt)}</dd></div>
        <div><dt className="text-[13px] text-muted-foreground">Desde</dt><dd className="mt-1 break-words font-medium">{desde}</dd></div>
        <div><dt className="text-[13px] text-muted-foreground">Módulo</dt><dd className="mt-1 font-medium">{MODULOS[log.entidad] || log.entidad || '—'}</dd></div>
        <div>
          <dt className="text-[13px] text-muted-foreground">Resultado</dt>
          <dd className={cn('mt-1 font-medium', fallido ? 'text-danger' : 'text-success')}>{fallido ? 'Fallido' : 'Exitoso'}</dd>
        </div>
      </dl>

      {log.descripcion ? (
        <div className="flex flex-col gap-1 rounded-xl bg-muted px-4 py-3.5">
          <span className="text-[13px] text-muted-foreground">Detalle</span>
          <span className="text-[15px] leading-normal text-foreground">{formatoPesos(log.descripcion)}</span>
        </div>
      ) : null}

      {cambios ? (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold">Qué cambió</span>
          <div className="overflow-hidden rounded-xl border border-border text-sm">
            <table className="w-full border-collapse">
              <thead className="bg-muted/60 text-left text-[13px] text-muted-foreground">
                <tr>
                  <th scope="col" className="px-3 py-2.5 font-normal">Campo</th>
                  {cambios.conAntes ? <th scope="col" className="px-3 py-2.5 font-normal">Antes</th> : null}
                  {cambios.conDespues ? <th scope="col" className="px-3 py-2.5 font-normal">{cambios.conAntes ? 'Después' : 'Valor'}</th> : null}
                </tr>
              </thead>
              <tbody>
                {cambios.filas.map((fila) => (
                  <tr key={fila.clave} className="border-t border-border align-top">
                    <td className="px-3 py-2.5 font-medium">{fila.campo}</td>
                    {cambios.conAntes ? <td className="break-words px-3 py-2.5">{fila.antes}</td> : null}
                    {cambios.conDespues ? (
                      <td className={cn('break-words px-3 py-2.5', cambios.conAntes && 'bg-primary/5 font-semibold')}>{fila.despues}</td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </section>
  )
}

export default function AuditoriaPage() {
  const usuario = useAuthStore((state) => state.usuario)
  const [persona, setPersona] = useState('todas')
  const [modulo, setModulo] = useState('todos')
  const [tipo, setTipo] = useState('todas')
  const [rango, setRango] = useState('7dias')
  const [pagina, setPagina] = useState(1)
  const [seleccionId, setSeleccionId] = useState(null)
  const esEscritorio = useMediaQuery('(min-width: 1024px)')

  const rolPermitido = canAccessModule(usuario, 'auditoria')
  const { desde, hasta } = useMemo(() => rangoFechas(rango), [rango])

  useEffect(() => {
    document.title = 'Auditoría | Bourgelat'
  }, [])

  const auditoriaQuery = useQuery({
    queryKey: ['auditoria', pagina, persona, modulo, tipo, desde, hasta],
    queryFn: () =>
      auditoriaApi.obtenerLogs({
        pagina,
        limite: LIMITE,
        usuarioId: persona !== 'todas' ? persona : undefined,
        entidad: modulo !== 'todos' ? modulo : undefined,
        tipo: tipo !== 'todas' ? tipo : undefined,
        desde,
        hasta,
      }),
    enabled: rolPermitido,
    placeholderData: (previo) => previo,
  })

  const logs = useMemo(() => auditoriaQuery.data?.logs || [], [auditoriaQuery.data?.logs])
  const seleccionado = logs.find((log) => log.id === seleccionId) || logs[0] || null

  const grupos = useMemo(() => {
    const porDia = new Map()
    for (const log of logs) {
      const clave = isoLocal(new Date(log.createdAt))
      if (!porDia.has(clave)) porDia.set(clave, { clave, titulo: tituloDia(log.createdAt), eventos: [] })
      porDia.get(clave).eventos.push(log)
    }
    return [...porDia.values()]
  }, [logs])

  const cambiarFiltro = (setter) => (valor) => {
    setter(valor)
    setPagina(1)
    setSeleccionId(null)
  }

  const irAPagina = (siguiente) => {
    setPagina(siguiente)
    setSeleccionId(null)
  }

  const personas = auditoriaQuery.data?.personas || []
  const total = auditoriaQuery.data?.total || 0
  const paginaActual = auditoriaQuery.data?.paginaActual || 1
  const paginas = auditoriaQuery.data?.paginas || 1

  if (!rolPermitido) {
    return (
      <AdminShell currentKey="auditoria" title="Quién cambió qué">
        <p className="rounded-2xl bg-card px-6 py-5 text-sm text-muted-foreground">
          Solo la administración de la clínica puede ver el registro de cambios.
        </p>
      </AdminShell>
    )
  }

  return (
    <AdminShell
      currentKey="auditoria"
      title="Quién cambió qué"
      description="Cada cambio en la clínica queda registrado con la persona, la hora y lo que había antes"
    >
      <div className="grid grid-cols-2 gap-2.5 sm:flex sm:flex-wrap">
        <Filtro label="Persona">
          <Select
            variant="field"
            className="border-0 sm:min-w-[180px]"
            aria-label="Persona"
            value={persona}
            onValueChange={cambiarFiltro(setPersona)}
            options={[{ value: 'todas', label: 'Todo el equipo' }, ...personas.map((p) => ({ value: p.id, label: p.nombre }))]}
          />
        </Filtro>
        <Filtro label="Módulo">
          <Select
            variant="field"
            className="border-0 sm:min-w-[180px]"
            aria-label="Módulo"
            value={modulo}
            onValueChange={cambiarFiltro(setModulo)}
            options={[{ value: 'todos', label: 'Todos' }, ...Object.entries(MODULOS).map(([value, label]) => ({ value, label }))]}
          />
        </Filtro>
        <Filtro label="Acción">
          <Select
            variant="field"
            className="border-0 sm:min-w-[160px]"
            aria-label="Acción"
            value={tipo}
            onValueChange={cambiarFiltro(setTipo)}
            options={[
              { value: 'todas', label: 'Todas' },
              { value: 'crear', label: 'Nuevos' },
              { value: 'editar', label: 'Cambios' },
              { value: 'anular', label: 'Anulados o borrados' },
              { value: 'sesion', label: 'Inicio de sesión' },
              { value: 'fallido', label: 'Fallidos' },
            ]}
          />
        </Filtro>
        <Filtro label="Fechas">
          <Select
            variant="field"
            className="border-0 sm:min-w-[160px]"
            aria-label="Fechas"
            value={rango}
            onValueChange={cambiarFiltro(setRango)}
            options={RANGOS}
          />
        </Filtro>
      </div>

      {auditoriaQuery.isError ? (
        <p className="rounded-xl bg-danger-soft px-4 py-3.5 text-sm text-danger">
          No fue posible cargar el registro de cambios. Intenta de nuevo en un momento.
        </p>
      ) : null}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,400px)]">
        <section aria-label="Registro" className="flex min-w-0 flex-col gap-5">
          {auditoriaQuery.isPending ? (
            <div className="h-64 animate-pulse rounded-2xl bg-card" />
          ) : grupos.length === 0 ? (
            <div className="rounded-2xl bg-card px-6 py-10 text-center">
              <p className="font-semibold text-foreground">No hay cambios con estos filtros</p>
              <p className="mt-1 text-sm text-muted-foreground">Prueba con otras fechas o con todo el equipo.</p>
            </div>
          ) : (
            grupos.map((grupo) => (
              <div key={grupo.clave} className="flex flex-col gap-2">
                <h2 className="px-1.5 text-sm font-semibold text-muted-foreground lg:px-0 lg:text-base">{grupo.titulo}</h2>
                <div className="flex flex-col gap-2 lg:block lg:rounded-2xl lg:bg-card lg:p-1.5">
                  {grupo.eventos.map((log) => {
                    const activo = seleccionado?.id === log.id
                    const nombre = log.responsable?.nombre || 'Alguien'
                    const abierto = !esEscritorio && seleccionId === log.id
                    return (
                      <div key={log.id} className="rounded-xl bg-card p-3 lg:rounded-none lg:bg-transparent lg:p-0">
                        <button
                          type="button"
                          onClick={() => setSeleccionId(!esEscritorio && seleccionId === log.id ? null : log.id)}
                          aria-pressed={esEscritorio ? activo : undefined}
                          aria-expanded={esEscritorio ? undefined : abierto}
                          className={cn(
                            'grid min-h-[44px] w-full grid-cols-[66px_36px_minmax(0,1fr)] items-start gap-2.5 rounded-xl text-left transition-colors lg:grid-cols-[76px_36px_minmax(0,1fr)_auto] lg:items-center lg:gap-3.5 lg:px-3.5 lg:py-3',
                            activo ? 'lg:bg-primary/10' : 'lg:hover:bg-muted/60',
                            FOCO
                          )}
                        >
                          <span className="whitespace-nowrap pt-2 text-sm font-semibold text-muted-foreground lg:pt-0">{hora(log.createdAt)}</span>
                          <span className={cn('flex h-9 w-9 items-center justify-center rounded-[11px] text-[13px] font-bold', colorAvatar(log.usuarioId))}>
                            {log.responsable ? iniciales(nombre) : '?'}
                          </span>
                          <span className="flex min-w-0 flex-col gap-1.5 lg:gap-0.5">
                            <span className="text-[15px] leading-snug text-foreground">
                              <span className="font-semibold">{nombre}</span> {verbo(log)}
                            </span>
                            <span className="flex flex-wrap items-center gap-1.5 lg:hidden">
                              <Chip tipo={log.tipo} />
                              <span className="text-[13px] text-muted-foreground">{MODULOS[log.entidad] || log.entidad}</span>
                            </span>
                            <span className="hidden truncate text-[13px] text-muted-foreground lg:block">
                              {[MODULOS[log.entidad] || log.entidad, formatoPesos(log.descripcion)].filter(Boolean).join(' · ')}
                            </span>
                          </span>
                          <span className="hidden lg:block"><Chip tipo={log.tipo} /></span>
                        </button>
                        {abierto ? <Detalle log={log} enLinea /> : null}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))
          )}

          {paginas > 1 ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">
                {(paginaActual - 1) * LIMITE + 1} a {Math.min(paginaActual * LIMITE, total)} de {total.toLocaleString('es-CO')}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => irAPagina(Math.max(paginaActual - 1, 1))}
                  disabled={paginaActual <= 1}
                  className={cn('h-11 rounded-lg bg-card px-4 text-sm font-semibold text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50', FOCO)}
                >
                  Anterior
                </button>
                <button
                  type="button"
                  onClick={() => irAPagina(Math.min(paginaActual + 1, paginas))}
                  disabled={paginaActual >= paginas}
                  className={cn('h-11 rounded-lg bg-card px-4 text-sm font-semibold text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50', FOCO)}
                >
                  Siguiente
                </button>
              </div>
            </div>
          ) : null}
        </section>

        <Detalle log={seleccionado} />
      </div>
    </AdminShell>
  )
}
