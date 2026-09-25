import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ArrowLeft, CircleCheck, Inbox, LifeBuoy, Plus } from 'lucide-react'
import AdminShell from '@/components/layout/AdminShell'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { ConfirmDialog, EmptyState } from '@/components/shared'
import Paginacion from '@/components/shared/Paginacion'
import { useAuthStore } from '@/store/authStore'
import { hasAnyRole } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import EstadoTicketBadge from '@/features/soporte/EstadoTicketBadge'
import NuevoTicketDialog from '@/features/soporte/NuevoTicketDialog'
import ResponderTicketForm from '@/features/soporte/ResponderTicketForm'
import TicketHilo from '@/features/soporte/TicketHilo'
import TicketResumen from '@/features/soporte/TicketResumen'
import {
  useSoporteMutaciones,
  useTicketSoporte,
  useTicketsSoporte,
} from '@/features/soporte/useSoporte'
import {
  FILTROS_ESTADO,
  etiquetaCategoria,
  etiquetaModulo,
  formatearFechaTicket,
  prioridadTicket,
} from '@/features/soporte/soporteConstants'

const AVISOS_ESTADO = {
  esperando_usuario: {
    texto: 'El equipo de Bourgelat te respondió y espera tu respuesta.',
    tone: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-700/50 dark:bg-amber-900/20 dark:text-amber-200',
  },
  resuelto: {
    texto: 'El equipo lo marcó como resuelto. Si todo quedó bien, ciérralo; si no, respóndenos y lo reabrimos.',
    tone: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-700/50 dark:bg-emerald-900/20 dark:text-emerald-200',
  },
  cerrado: {
    texto: 'Este ticket está cerrado. Si el problema vuelve, abre un ticket nuevo.',
    tone: 'border-border bg-muted text-muted-foreground',
  },
}

const PASOS = [
  'Cuéntanos qué pasó y, si puedes, adjunta una captura.',
  'El equipo de Bourgelat lo revisa y te responde aquí. También te avisamos por correo.',
  'Cuando quede resuelto, cierra el ticket.',
]

export default function SoportePage() {
  const usuario = useAuthStore((state) => state.usuario)
  const esAdmin = hasAnyRole(usuario, ['admin'])
  const [searchParams, setSearchParams] = useSearchParams()
  const [filtro, setFiltro] = useState('activos')
  const [pagina, setPagina] = useState(1)
  const [dialogoAbierto, setDialogoAbierto] = useState(false)
  // Cambia en cada apertura para remontar el dialogo con el formulario limpio.
  const [dialogoKey, setDialogoKey] = useState(0)
  const [moduloInicial, setModuloInicial] = useState('')
  const [confirmarCierre, setConfirmarCierre] = useState(false)
  const [solicitudAtendida, setSolicitudAtendida] = useState(null)

  const ticketId = searchParams.get('ticket')

  const abrirDialogo = (modulo = '') => {
    setModuloInicial(modulo)
    setDialogoKey((key) => key + 1)
    setDialogoAbierto(true)
  }

  // Llegada desde "Ayuda y soporte" del menu de usuario (?nuevo=1&desde=/ruta):
  // abre el formulario con el modulo donde estaba la persona. Se ajusta el
  // estado durante el render (no en un efecto) y se recuerda la solicitud para
  // no reabrir en cada render; al limpiar la URL se olvida, asi un segundo
  // clic en el menu desde esta misma pagina vuelve a abrirlo.
  const solicitudNueva = searchParams.get('nuevo') === '1' ? searchParams.toString() : null

  if (solicitudNueva && solicitudNueva !== solicitudAtendida) {
    setSolicitudAtendida(solicitudNueva)
    abrirDialogo(searchParams.get('desde') || '')
  } else if (!solicitudNueva && solicitudAtendida) {
    setSolicitudAtendida(null)
  }

  useEffect(() => {
    document.title = 'Soporte | Bourgelat'
  }, [])

  // Quita ?nuevo y ?desde de la URL para que recargar no reabra el formulario.
  useEffect(() => {
    if (!solicitudNueva) return

    const siguientes = new URLSearchParams(searchParams)
    siguientes.delete('nuevo')
    siguientes.delete('desde')
    setSearchParams(siguientes, { replace: true })
  }, [solicitudNueva, searchParams, setSearchParams])

  const listaQuery = useTicketsSoporte({
    estado: filtro === 'todos' ? undefined : filtro,
    pagina,
    limite: 15,
  })
  const detalleQuery = useTicketSoporte(ticketId)
  const { crearMutation, responderMutation, cerrarMutation } = useSoporteMutaciones()

  const tickets = listaQuery.data?.tickets || []

  const seleccionarTicket = (id) => {
    const siguientes = new URLSearchParams(searchParams)
    if (id) {
      siguientes.set('ticket', id)
    } else {
      siguientes.delete('ticket')
    }
    setSearchParams(siguientes)
  }

  const abrirNuevo = () => abrirDialogo('')

  const crearTicket = async (datos) => {
    const data = await crearMutation.mutateAsync(datos)
    setDialogoAbierto(false)
    setFiltro('activos')
    setPagina(1)
    seleccionarTicket(data.ticket.id)
  }

  return (
    <AdminShell
      currentKey="soporte"
      title="Soporte"
      description={
        esAdmin
          ? 'Reporta problemas de uso y sigue las respuestas del equipo de Bourgelat. Como administrador ves los tickets de toda la clínica.'
          : 'Reporta problemas de uso y sigue las respuestas del equipo de Bourgelat.'
      }
      actions={
        <Button onClick={abrirNuevo}>
          <Plus />
          Nuevo ticket
        </Button>
      }
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        <section
          aria-label="Tickets"
          className={cn(
            'min-w-0 self-start overflow-hidden rounded-xl border border-border bg-card',
            ticketId && 'hidden lg:block'
          )}
        >
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold text-foreground">
              {esAdmin ? 'Tickets de la clínica' : 'Tus tickets'}
            </h2>
            <Select
              value={filtro}
              onValueChange={(valor) => {
                setFiltro(valor)
                setPagina(1)
              }}
              options={FILTROS_ESTADO}
              aria-label="Filtrar por estado"
              className="h-9 pl-4 pr-3"
            />
          </div>

          {listaQuery.isLoading ? (
            <ul className="divide-y divide-border" aria-busy="true">
              {[0, 1, 2].map((fila) => (
                <li key={fila} className="space-y-2 px-4 py-4">
                  <div className="h-3 w-20 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
                </li>
              ))}
            </ul>
          ) : listaQuery.isError ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
              No pudimos cargar los tickets. Intenta de nuevo en un momento.
            </p>
          ) : tickets.length === 0 ? (
            <EmptyState
              size="sm"
              icon={<Inbox />}
              title={filtro === 'activos' ? 'No tienes tickets activos' : 'No hay tickets en este filtro'}
              description="Si algo no funciona o tienes una duda, abre un ticket y te ayudamos."
              action={
                <Button size="sm" variant="outline" onClick={abrirNuevo}>
                  <Plus />
                  Abrir un ticket
                </Button>
              }
            />
          ) : (
            <ul className="divide-y divide-border">
              {tickets.map((item) => (
                <li key={item.id}>
                  <TicketResumen
                    ticket={item}
                    activo={item.id === ticketId}
                    mostrarAutor={esAdmin && item.creadoPor?.id !== usuario?.id}
                    onSelect={seleccionarTicket}
                  />
                </li>
              ))}
            </ul>
          )}

          <div className="px-4 pb-4 empty:hidden">
            <Paginacion
              pagina={listaQuery.data?.pagina || 1}
              paginas={listaQuery.data?.paginas || 1}
              onChange={setPagina}
            />
          </div>
        </section>

        <section
          aria-label="Detalle del ticket"
          className={cn(
            'min-h-[480px] min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card',
            ticketId ? 'flex' : 'hidden lg:flex'
          )}
        >
          {ticketId ? (
            <DetalleTicket
              query={detalleQuery}
              esAdmin={esAdmin}
              onVolver={() => seleccionarTicket(null)}
              onResponder={(mensaje) => responderMutation.mutateAsync({ ticketId, mensaje })}
              respondiendo={responderMutation.isPending}
              onCerrar={() => setConfirmarCierre(true)}
            />
          ) : (
            <PanelInicio onNuevo={abrirNuevo} />
          )}
        </section>
      </div>

      <NuevoTicketDialog
        key={dialogoKey}
        open={dialogoAbierto}
        onOpenChange={setDialogoAbierto}
        moduloInicial={moduloInicial}
        onSubmit={crearTicket}
        isPending={crearMutation.isPending}
      />

      <ConfirmDialog
        open={confirmarCierre}
        onOpenChange={setConfirmarCierre}
        title="¿Cerrar este ticket?"
        description="Hazlo cuando el problema esté resuelto. Un ticket cerrado ya no admite mensajes; si el problema vuelve, abre uno nuevo."
        confirmLabel="Cerrar ticket"
        variant="default"
        loading={cerrarMutation.isPending}
        onConfirm={() =>
          cerrarMutation.mutate(ticketId, { onSettled: () => setConfirmarCierre(false) })
        }
      />
    </AdminShell>
  )
}

function DetalleTicket({ query, esAdmin, onVolver, onResponder, respondiendo, onCerrar }) {
  const ticket = query.data?.ticket

  const volver = (
    <div className="border-b border-border px-3 py-2 lg:hidden">
      <Button variant="ghost" size="sm" onClick={onVolver}>
        <ArrowLeft />
        Todos los tickets
      </Button>
    </div>
  )

  if (query.isLoading) {
    return (
      <>
        {volver}
        <div className="space-y-3 p-6" aria-busy="true">
          <div className="h-3 w-24 animate-pulse rounded bg-muted" />
          <div className="h-6 w-2/3 animate-pulse rounded bg-muted" />
          <div className="h-24 animate-pulse rounded-xl bg-muted" />
        </div>
      </>
    )
  }

  if (query.isError || !ticket) {
    return (
      <>
        {volver}
        <EmptyState
          size="sm"
          icon={<Inbox />}
          title="No encontramos este ticket"
          description="Puede que no exista o que no tengas acceso a él."
          action={
            <Button size="sm" variant="outline" onClick={onVolver}>
              Ver los tickets
            </Button>
          }
          className="flex-1"
        />
      </>
    )
  }

  const prioridad = prioridadTicket(ticket.prioridad)
  const aviso = AVISOS_ESTADO[ticket.estado]
  const admiteMensajes = ticket.estado !== 'cerrado'

  return (
    <>
      {volver}

      <header className="border-b border-border px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <span className="font-mono">{ticket.codigo}</span>
          <span aria-hidden>·</span>
          <span>{etiquetaCategoria(ticket.categoria)}</span>
          {ticket.modulo ? (
            <>
              <span aria-hidden>·</span>
              <span>{etiquetaModulo(ticket.modulo)}</span>
            </>
          ) : null}
        </div>
        <div className="mt-1.5 flex flex-wrap items-start justify-between gap-3">
          <h2 className="min-w-0 break-words text-lg font-semibold leading-snug text-foreground">
            {ticket.asunto}
          </h2>
          <EstadoTicketBadge estado={ticket.estado} />
        </div>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span>
            Abierto el {formatearFechaTicket(ticket.createdAt)}
            {esAdmin && ticket.creadoPor ? ` por ${ticket.creadoPor.nombre}` : ''}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className={cn('h-2 w-2 rounded-full', prioridad.dot)} aria-hidden />
            {prioridad.label}
          </span>
        </p>
      </header>

      {aviso ? (
        <p className={cn('mx-5 mt-4 rounded-lg border px-4 py-2.5 text-sm sm:mx-6', aviso.tone)}>
          {aviso.texto}
        </p>
      ) : null}

      <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
        {ticket.capturaUrl ? (
          <a
            href={ticket.capturaUrl}
            target="_blank"
            rel="noreferrer"
            title="Abrir la captura en otra pestaña"
            className="mb-5 block w-fit overflow-hidden rounded-lg border border-border transition hover:border-primary/50"
          >
            <img
              src={ticket.capturaUrl}
              alt="Captura adjunta al ticket"
              loading="lazy"
              className="max-h-44 w-auto object-contain"
            />
          </a>
        ) : null}

        <TicketHilo mensajes={ticket.mensajes} />
      </div>

      {admiteMensajes ? (
        <footer className="border-t border-border px-5 py-4 sm:px-6">
          <ResponderTicketForm
            onSubmit={onResponder}
            isPending={respondiendo}
            placeholder={
              ticket.estado === 'esperando_usuario'
                ? 'Responde al equipo de Bourgelat…'
                : 'Agrega más detalles o responde…'
            }
          />
          <div className="mt-3 border-t border-border pt-3">
            <Button variant="ghost" size="sm" onClick={onCerrar}>
              <CircleCheck />
              Ya se solucionó, cerrar ticket
            </Button>
          </div>
        </footer>
      ) : null}
    </>
  )
}

function PanelInicio({ onNuevo }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-8 py-12 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 text-primary">
        <LifeBuoy className="h-7 w-7" />
      </span>
      <div className="max-w-sm space-y-1.5">
        <h2 className="text-lg font-semibold text-foreground">¿En qué te ayudamos?</h2>
        <p className="text-sm text-muted-foreground">
          Elige un ticket de la lista para ver la conversación, o abre uno nuevo.
        </p>
      </div>
      <ol className="grid max-w-md gap-3 text-left">
        {PASOS.map((paso, indice) => (
          <li key={paso} className="flex gap-3 text-sm text-muted-foreground">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">
              {indice + 1}
            </span>
            <span className="pt-0.5">{paso}</span>
          </li>
        ))}
      </ol>
      <Button onClick={onNuevo}>
        <Plus />
        Nuevo ticket
      </Button>
    </div>
  )
}
