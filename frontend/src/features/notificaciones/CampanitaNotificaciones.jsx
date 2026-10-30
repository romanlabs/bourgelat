import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Dialog } from 'radix-ui'
import { Activity, ArrowLeft, Bell, MessageSquare, Package, Receipt, Settings, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FILTROS, agruparAvisos } from './notificacionesDerivadas'

const ICONO_CATEGORIA = {
  clinica: { icon: Activity, tono: 'bg-info-soft text-info' },
  inventario: { icon: Package, tono: 'bg-danger-soft text-danger' },
  caja: { icon: Receipt, tono: 'bg-warning-soft text-warning' },
  sistema: { icon: MessageSquare, tono: 'bg-muted text-muted-foreground' },
}

function FilaAviso({ aviso, onAbrir }) {
  const { icon: Icono, tono } = ICONO_CATEGORIA[aviso.categoria] ?? ICONO_CATEGORIA.sistema
  return (
    <button
      type="button"
      onClick={() => onAbrir(aviso)}
      className={cn(
        'flex w-full items-start gap-3.5 rounded-xl p-3 text-left transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        aviso.nueva && 'bg-muted/60'
      )}
    >
      <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', tono)}>
        <Icono className="h-5 w-5" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[15px] font-semibold text-foreground">{aviso.titulo}</span>
        {aviso.texto ? <span className="text-sm leading-5 text-muted-foreground">{aviso.texto}</span> : null}
        {aviso.cuando ? <span className="text-xs text-muted-foreground">{aviso.cuando}</span> : null}
      </span>
      {aviso.nueva ? (
        <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-brand">
          <span className="sr-only">Sin leer</span>
        </span>
      ) : null}
    </button>
  )
}

function Interruptor({ titulo, detalle, activo, onCambiar, deshabilitado = false }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={activo}
      disabled={deshabilitado}
      onClick={() => onCambiar(!activo)}
      className="flex w-full items-center gap-4 rounded-xl p-3 text-left transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[15px] font-semibold text-foreground">{titulo}</span>
        {detalle ? <span className="text-sm leading-5 text-muted-foreground">{detalle}</span> : null}
      </span>
      <span
        aria-hidden="true"
        className={cn('relative h-6 w-11 shrink-0 rounded-full transition-colors', activo ? 'bg-primary' : 'bg-input')}
      >
        <span
          className={cn(
            'absolute top-0.5 h-5 w-5 rounded-full bg-card shadow-sm transition-transform',
            activo ? 'translate-x-[22px]' : 'translate-x-0.5'
          )}
        />
      </span>
    </button>
  )
}

const CATEGORIAS_AJUSTES = [
  { id: 'clinica', titulo: 'Clínica', detalle: 'Llegadas, citas, historias, exámenes y vacunas por vencer.' },
  { id: 'inventario', titulo: 'Inventario', detalle: 'Agotados, bajo el mínimo y vencimientos.' },
  { id: 'caja', titulo: 'Caja y facturación', detalle: 'Cierres de turno, créditos vencidos, pagos a proveedores y DIAN.' },
  { id: 'sistema', titulo: 'Soporte y plan', detalle: 'Respuestas de soporte y vencimiento del plan.' },
]

function AjustesAvisos({ ajustes, guardarAjustes, navegador }) {
  const apagadas = ajustes.categoriasApagadas || []
  const cambiarCategoria = (id, recibir) =>
    guardarAjustes({
      categoriasApagadas: recibir ? apagadas.filter((item) => item !== id) : [...apagadas, id],
    })

  return (
    <div className="flex flex-col gap-4 px-1 pt-1">
      <section aria-label="Qué avisos recibir">
        <h3 className="px-3 pb-1.5 pt-2.5 text-[13px] font-semibold text-muted-foreground">Qué avisos recibir</h3>
        {CATEGORIAS_AJUSTES.map((categoria) => (
          <Interruptor
            key={categoria.id}
            titulo={categoria.titulo}
            detalle={categoria.detalle}
            activo={!apagadas.includes(categoria.id)}
            onCambiar={(recibir) => cambiarCategoria(categoria.id, recibir)}
          />
        ))}
      </section>
      <section aria-label="Cómo avisarte">
        <h3 className="px-3 pb-1.5 pt-2.5 text-[13px] font-semibold text-muted-foreground">Cómo avisarte</h3>
        <Interruptor
          titulo="Correo para lo urgente"
          detalle="Descuadres al cerrar caja y cajas que quedaron abiertas de un día anterior."
          activo={Boolean(ajustes.correoUrgente)}
          onCambiar={(activo) => guardarAjustes({ correoUrgente: activo })}
        />
        {navegador.disponible ? (
          <Interruptor
            titulo="Avisos en este equipo"
            detalle={
              navegador.bloqueado
                ? 'El navegador los tiene bloqueados. Permítelos desde el candado de la barra de direcciones.'
                : 'Te avisa aunque estés en otra pestaña o ventana.'
            }
            activo={navegador.activo}
            deshabilitado={navegador.bloqueado}
            onCambiar={navegador.cambiar}
          />
        ) : null}
      </section>
    </div>
  )
}

/**
 * Campanita del encabezado y su panel. Recibe lo que devuelve
 * `useNotificaciones` desde AdminShell, que la pinta en la barra superior o
 * junto al título según la pantalla: con una sola llamada al hook, las dos
 * comparten lo leído.
 */
export default function CampanitaNotificaciones({ notificaciones, className }) {
  const { avisos, sinLeer, cargando, marcarLeida, marcarTodas, ajustes, guardarAjustes, navegador } = notificaciones
  const navigate = useNavigate()
  const [abierto, setAbierto] = useState(false)
  const [filtro, setFiltro] = useState('todas')
  const [verAjustes, setVerAjustes] = useState(false)

  const cambiarAbierto = (siguiente) => {
    setAbierto(siguiente)
    if (!siguiente) setVerAjustes(false)
  }

  const filtroActivo = FILTROS.find((item) => item.id === filtro) ?? FILTROS[0]
  const visibles = avisos.filter(filtroActivo.incluye)
  const grupos = agruparAvisos(visibles)

  const abrirAviso = (aviso) => {
    marcarLeida(aviso)
    if (!aviso.to) return
    setAbierto(false)
    navigate(aviso.to, aviso.state ? { state: aviso.state } : undefined)
  }

  return (
    <Dialog.Root open={abierto} onOpenChange={cambiarAbierto}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          aria-label={sinLeer > 0 ? `Notificaciones, ${sinLeer} sin leer` : 'Notificaciones'}
          title="Notificaciones"
          className={cn(
            'relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-card text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            className
          )}
        >
          <Bell className="h-[18px] w-[18px]" />
          {sinLeer > 0 ? (
            <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1.5 text-[11px] font-bold text-foreground ring-2 ring-background">
              {sinLeer > 99 ? '99+' : sinLeer}
            </span>
          ) : null}
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-foreground/40 data-[state=open]:[animation:admin-drawer-overlay-in_250ms_ease-out] data-[state=closed]:[animation:admin-drawer-overlay-out_200ms_ease-in]" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-y-0 right-0 z-50 flex w-[440px] max-w-full flex-col bg-card text-foreground shadow-modal data-[state=open]:[animation:admin-panel-in_300ms_ease-out] data-[state=closed]:[animation:admin-panel-out_200ms_ease-in]"
        >
          <div className="flex flex-col gap-3.5 px-5 pb-3.5 pt-5 sm:px-6 sm:pt-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-1.5">
                {verAjustes ? (
                  <button
                    type="button"
                    aria-label="Volver a las notificaciones"
                    onClick={() => setVerAjustes(false)}
                    className="-ml-2 inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  >
                    <ArrowLeft className="h-[18px] w-[18px]" />
                  </button>
                ) : null}
                <Dialog.Title className="text-2xl font-semibold tracking-[-0.03em]">
                  {verAjustes ? 'Ajustes de avisos' : 'Notificaciones'}
                </Dialog.Title>
              </div>
              <div className="flex items-center gap-1.5">
                {verAjustes ? null : (
                  <>
                    <button
                      type="button"
                      onClick={marcarTodas}
                      disabled={sinLeer === 0}
                      className="h-9 rounded-lg bg-muted px-3 text-sm font-semibold text-foreground transition hover:brightness-95 disabled:opacity-50"
                    >
                      Marcar leídas
                    </button>
                    <button
                      type="button"
                      aria-label="Ajustes de avisos"
                      title="Ajustes de avisos"
                      onClick={() => setVerAjustes(true)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
                    >
                      <Settings className="h-[18px] w-[18px]" />
                    </button>
                  </>
                )}
                <Dialog.Close asChild>
                  <button
                    type="button"
                    aria-label="Cerrar"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  >
                    <X className="h-[18px] w-[18px]" />
                  </button>
                </Dialog.Close>
              </div>
            </div>

            {verAjustes ? null : (
            <div role="tablist" aria-label="Filtrar notificaciones" className="flex gap-1 rounded-xl bg-muted p-1">
              {FILTROS.map((item) => {
                const activa = item.id === filtro
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    aria-selected={activa}
                    onClick={() => setFiltro(item.id)}
                    className={cn(
                      'h-9 flex-1 whitespace-nowrap rounded-lg px-2 text-[13px] transition',
                      activa ? 'bg-card font-semibold text-foreground shadow-sm' : 'font-medium text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {item.label}
                  </button>
                )
              })}
            </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-3 pb-3">
            {verAjustes ? (
              <AjustesAvisos ajustes={ajustes} guardarAjustes={guardarAjustes} navegador={navegador} />
            ) : cargando && avisos.length === 0 ? (
              <div className="space-y-2 px-1 pt-1">
                {[0, 1, 2].map((item) => (
                  <div key={item} className="h-16 animate-pulse rounded-xl bg-muted" />
                ))}
              </div>
            ) : visibles.length === 0 ? (
              <div className="flex flex-col items-center gap-1.5 px-5 py-12 text-center">
                <span className="text-base font-semibold">Estás al día</span>
                <span className="text-sm text-muted-foreground">
                  {filtro === 'todas' ? 'No hay nada pendiente por revisar.' : 'No hay avisos en esta categoría.'}
                </span>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {grupos.map((grupo) => (
                  <section key={grupo.id} aria-label={grupo.titulo}>
                    <h3 className="px-3 pb-1.5 pt-2.5 text-[13px] font-semibold text-muted-foreground">{grupo.titulo}</h3>
                    <ul className="flex flex-col gap-0.5">
                      {grupo.items.map((aviso) => (
                        <li key={aviso.id}>
                          <FilaAviso aviso={aviso} onAbrir={abrirAviso} />
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            )}
          </div>

          <p className="bg-muted/60 px-5 py-3.5 text-sm text-muted-foreground sm:px-6">
            {verAjustes
              ? 'Los ajustes son tuyos: no cambian lo que recibe el resto del equipo.'
              : 'Lo de «Para revisar ahora» se quita solo cuando se resuelve.'}
          </p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
