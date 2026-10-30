import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Dialog } from 'radix-ui'
import { Activity, Bell, MessageSquare, Package, Receipt, X } from 'lucide-react'
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

/**
 * Campanita del encabezado y su panel. Recibe lo que devuelve
 * `useNotificaciones` desde AdminShell, que la pinta en la barra superior o
 * junto al título según la pantalla: con una sola llamada al hook, las dos
 * comparten lo leído.
 */
export default function CampanitaNotificaciones({ notificaciones, className }) {
  const { avisos, sinLeer, cargando, marcarLeida, marcarTodas } = notificaciones
  const navigate = useNavigate()
  const [abierto, setAbierto] = useState(false)
  const [filtro, setFiltro] = useState('todas')

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
    <Dialog.Root open={abierto} onOpenChange={setAbierto}>
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
              <Dialog.Title className="text-2xl font-semibold tracking-[-0.03em]">Notificaciones</Dialog.Title>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={marcarTodas}
                  disabled={sinLeer === 0}
                  className="h-9 rounded-lg bg-muted px-3 text-sm font-semibold text-foreground transition hover:brightness-95 disabled:opacity-50"
                >
                  Marcar leídas
                </button>
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
          </div>

          <div className="flex-1 overflow-y-auto px-3 pb-3">
            {cargando && avisos.length === 0 ? (
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
            Lo de «Para revisar ahora» se quita solo cuando se resuelve.
          </p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
