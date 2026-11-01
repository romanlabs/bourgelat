import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CircleCheck, Plus, X } from 'lucide-react'
import AdminShell from '@/components/layout/AdminShell'
import { Select } from '@/components/ui/select'
import { ConfirmDialog } from '@/components/shared'
import Paginacion from '@/components/shared/Paginacion'
import { useAuthStore } from '@/store/authStore'
import { hasAnyRole } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import EstadoTicketBadge from '@/features/soporte/EstadoTicketBadge'
import NuevaSolicitudForm from '@/features/soporte/NuevaSolicitudForm'
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
  resuelto: {
    texto: 'Lo marcamos como resuelto. Si todo quedó bien, ciérralo; si no, respóndenos y lo reabrimos.',
    tone: 'bg-success-soft text-success',
  },
  cerrado: {
    texto: 'Esta solicitud está cerrada. Si el problema vuelve, escribe una nueva.',
    tone: 'bg-muted text-muted-foreground',
  },
}

export default function SoportePage() {
  const usuario = useAuthStore((state) => state.usuario)
  const esAdmin = hasAnyRole(usuario, ['admin'])
  const [searchParams, setSearchParams] = useSearchParams()
  const [filtro, setFiltro] = useState('activos')
  const [pagina, setPagina] = useState(1)
  // Cambia para remontar el formulario limpio (tras enviar o al llegar desde el menú).
  const [formKey, setFormKey] = useState(0)
  const [moduloInicial, setModuloInicial] = useState('')
  const [asuntoInicial, setAsuntoInicial] = useState('')
  const [categoriaInicial, setCategoriaInicial] = useState('error')
  const [enfocarForm, setEnfocarForm] = useState(false)
  const [confirmarCierre, setConfirmarCierre] = useState(false)
  const [solicitudAtendida, setSolicitudAtendida] = useState(null)
  // En celular el formulario se abre bajo demanda; en escritorio siempre está visible.
  const [formAbierto, setFormAbierto] = useState(false)
  const esEscritorio = useMediaQuery('(min-width: 1024px)')
  const detalleRef = useRef(null)

  const ticketId = searchParams.get('ticket')

  // Llegada desde "Ayuda y soporte" del menú de usuario (?nuevo=1&desde=/ruta):
  // enfoca el formulario con el módulo donde estaba la persona. Se ajusta el
  // estado durante el render y se recuerda la solicitud para no repetirlo.
  const solicitudNueva = searchParams.get('nuevo') === '1' ? searchParams.toString() : null

  if (solicitudNueva && solicitudNueva !== solicitudAtendida) {
    setSolicitudAtendida(solicitudNueva)
    setModuloInicial(searchParams.get('desde') || '')
    setAsuntoInicial(searchParams.get('asunto') || '')
    setCategoriaInicial(searchParams.get('categoria') || 'error')
    setEnfocarForm(true)
    setFormAbierto(true)
    setFormKey((key) => key + 1)
  } else if (!solicitudNueva && solicitudAtendida) {
    setSolicitudAtendida(null)
  }

  useEffect(() => {
    document.title = 'Soporte | Bourgelat'
  }, [])

  // Quita ?nuevo y ?desde de la URL para que recargar no lo repita.
  useEffect(() => {
    if (!solicitudNueva) return
    const siguientes = new URLSearchParams(searchParams)
    for (const clave of ['nuevo', 'desde', 'asunto', 'categoria']) siguientes.delete(clave)
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

  // En celular el hilo queda debajo de la lista: al elegir una solicitud se lleva a la vista.
  useEffect(() => {
    if (!ticketId || esEscritorio) return
    detalleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [ticketId, esEscritorio])

  const seleccionarTicket = (id) => {
    const siguientes = new URLSearchParams(searchParams)
    if (id) siguientes.set('ticket', id)
    else siguientes.delete('ticket')
    setSearchParams(siguientes)
  }

  const crearTicket = async (datos) => {
    const data = await crearMutation.mutateAsync(datos)
    setModuloInicial('')
    setAsuntoInicial('')
    setCategoriaInicial('error')
    setEnfocarForm(false)
    setFormAbierto(false)
    setFormKey((key) => key + 1)
    setFiltro('activos')
    setPagina(1)
    seleccionarTicket(data.ticket.id)
  }

  return (
    <AdminShell
      currentKey="soporte"
      title="¿En qué te ayudamos?"
      description="Te respondemos aquí y a tu correo, normalmente el mismo día hábil"
    >
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(340px,400px)] lg:gap-6">
        {!esEscritorio && !formAbierto ? (
          <button
            type="button"
            onClick={() => {
              setEnfocarForm(false)
              setFormAbierto(true)
            }}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-semibold text-primary-foreground transition active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Plus className="h-5 w-5" aria-hidden />
            Nueva solicitud
          </button>
        ) : null}

        {!esEscritorio && formAbierto ? (
          <div className="relative">
            <button
              type="button"
              onClick={() => setFormAbierto(false)}
              aria-label="Cerrar formulario"
              className="absolute right-2 top-2 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full text-primary-foreground transition hover:bg-primary-foreground/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
            <NuevaSolicitudForm
              key={formKey}
              moduloInicial={moduloInicial}
              asuntoInicial={asuntoInicial}
              categoriaInicial={categoriaInicial}
              enfocar={enfocarForm}
              onSubmit={crearTicket}
              isPending={crearMutation.isPending}
            />
          </div>
        ) : null}

        <div className="flex min-w-0 flex-col gap-4 lg:gap-5">
          <section aria-labelledby="s-mis" className="rounded-2xl bg-card p-2">
            <div className="flex items-center justify-between gap-3 px-3 pb-2 pt-3 lg:px-4 lg:pt-4">
              <h2 id="s-mis" className="text-lg font-semibold text-foreground">
                {esAdmin ? 'Solicitudes de la clínica' : 'Tus solicitudes'}
              </h2>
              <Select
                value={filtro}
                onValueChange={(valor) => {
                  setFiltro(valor)
                  setPagina(1)
                }}
                options={FILTROS_ESTADO}
                aria-label="Filtrar por estado"
                className="h-11 border-0 bg-muted pl-3.5 pr-3 lg:h-9"
              />
            </div>

            {listaQuery.isLoading ? (
              <div className="space-y-2 p-2" aria-busy="true">
                {[0, 1, 2].map((fila) => (
                  <div key={fila} className="h-14 animate-pulse rounded-xl bg-muted" />
                ))}
              </div>
            ) : listaQuery.isError ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                No pudimos cargar tus solicitudes. Intenta de nuevo en un momento.
              </p>
            ) : tickets.length === 0 ? (
              <p className="px-4 pb-6 pt-2 text-sm text-muted-foreground">
                {filtro === 'activos'
                  ? 'No tienes solicitudes abiertas. Si algo no funciona o tienes una duda, escríbenos en el formulario.'
                  : 'No hay solicitudes con este filtro.'}
              </p>
            ) : (
              <ul>
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

            <div className="px-3 pb-2 empty:hidden">
              <Paginacion
                pagina={listaQuery.data?.pagina || 1}
                paginas={listaQuery.data?.paginas || 1}
                onChange={setPagina}
              />
            </div>
          </section>

          {ticketId ? (
            <div ref={detalleRef} className="scroll-mt-20">
            <DetalleTicket
              query={detalleQuery}
              esAdmin={esAdmin}
              onResponder={(mensaje) => responderMutation.mutateAsync({ ticketId, mensaje })}
              respondiendo={responderMutation.isPending}
              onCerrar={() => setConfirmarCierre(true)}
            />
            </div>
          ) : null}
        </div>

        {esEscritorio ? (
          <NuevaSolicitudForm
            key={formKey}
            moduloInicial={moduloInicial}
            asuntoInicial={asuntoInicial}
            categoriaInicial={categoriaInicial}
            enfocar={enfocarForm}
            onSubmit={crearTicket}
            isPending={crearMutation.isPending}
          />
        ) : null}
      </div>

      <ConfirmDialog
        open={confirmarCierre}
        onOpenChange={setConfirmarCierre}
        title="¿Ya quedó resuelto?"
        description="Cerramos la solicitud y ya no admite mensajes. Si el problema vuelve, escribe una nueva."
        confirmLabel="Sí, cerrar"
        variant="default"
        loading={cerrarMutation.isPending}
        onConfirm={() =>
          cerrarMutation.mutate(ticketId, { onSettled: () => setConfirmarCierre(false) })
        }
      />
    </AdminShell>
  )
}

function DetalleTicket({ query, esAdmin, onResponder, respondiendo, onCerrar }) {
  const ticket = query.data?.ticket

  if (query.isLoading) {
    return (
      <section className="space-y-3 rounded-2xl bg-card p-6" aria-busy="true">
        <div className="h-6 w-2/3 animate-pulse rounded bg-muted" />
        <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
        <div className="h-24 animate-pulse rounded-xl bg-muted" />
      </section>
    )
  }

  if (query.isError || !ticket) {
    return (
      <section className="rounded-2xl bg-card px-6 py-8 text-center">
        <p className="font-semibold text-foreground">No encontramos esta solicitud</p>
        <p className="mt-1 text-sm text-muted-foreground">Puede que no exista o que no tengas acceso a ella.</p>
      </section>
    )
  }

  const prioridad = prioridadTicket(ticket.prioridad)
  const aviso = AVISOS_ESTADO[ticket.estado]
  const admiteMensajes = ticket.estado !== 'cerrado'
  const detalle = [
    ticket.codigo,
    etiquetaCategoria(ticket.categoria),
    ticket.modulo ? etiquetaModulo(ticket.modulo) : null,
    prioridad.label.toLowerCase(),
    `abierta el ${formatearFechaTicket(ticket.createdAt)}${esAdmin && ticket.creadoPor ? ` por ${ticket.creadoPor.nombre}` : ''}`,
  ].filter(Boolean)

  return (
    <section aria-labelledby="s-hilo" className="flex flex-col gap-4 rounded-2xl bg-card p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 id="s-hilo" className="break-words text-xl font-semibold tracking-[-0.02em] text-foreground">
            {ticket.asunto}
          </h2>
          <span className="text-[13px] text-muted-foreground">{detalle.join(' · ')}</span>
        </div>
        <EstadoTicketBadge estado={ticket.estado} />
      </div>

      {aviso ? <p className={cn('rounded-xl px-4 py-3 text-sm leading-6', aviso.tone)}>{aviso.texto}</p> : null}

      {ticket.capturaUrl ? (
        <a
          href={ticket.capturaUrl}
          target="_blank"
          rel="noreferrer"
          title="Abrir la captura en otra pestaña"
          className="block w-fit overflow-hidden rounded-xl bg-muted outline-none transition hover:brightness-95 focus-visible:ring-2 focus-visible:ring-ring"
        >
          <img src={ticket.capturaUrl} alt="Captura adjunta" loading="lazy" className="max-h-44 w-auto object-contain" />
        </a>
      ) : null}

      <TicketHilo mensajes={ticket.mensajes} />

      {admiteMensajes ? (
        <ResponderTicketForm
          onSubmit={onResponder}
          isPending={respondiendo}
          submitLabel="Responder"
          placeholder="Escribe tu respuesta"
          accionSecundaria={
            <button
              type="button"
              onClick={onCerrar}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-success-soft px-4 lg:h-10 text-sm font-semibold text-success transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <CircleCheck className="h-4 w-4" />
              Ya quedó resuelto
            </button>
          }
        />
      ) : null}
    </section>
  )
}
