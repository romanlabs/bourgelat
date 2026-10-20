import { useState } from 'react'
import { Check, Copy, Download, Mail, MessageCircle } from 'lucide-react'
import PublicPageShell from '@/components/shared/PublicPageShell'
import { pagoManual } from '@/content/publicSiteContent'
import { useAuthStore } from '@/store/authStore'
import qrBourgelat from '@/assets/pagos/qr-bourgelat.svg'

const formatoPesos = (valor) => `$${valor.toLocaleString('es-CO')}`

// `fechaFin` llega como DATEONLY ('YYYY-MM-DD'); se arma la fecha local a mano
// para que no se corra un día por la zona horaria (ver lib/suscripcion.js).
const formatoFecha = (fechaIso) => {
  if (!fechaIso) return null
  const [year, month, day] = fechaIso.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

const describirSuscripcion = (suscripcion) => {
  const fecha = formatoFecha(suscripcion?.fechaFin)
  switch (suscripcion?.estado) {
    case 'prueba':
      return fecha ? `Tu prueba gratis termina el ${fecha}.` : 'Estás en la prueba gratis.'
    case 'solo_lectura':
    case 'vencida':
    case 'cancelada':
      return 'Tu suscripción no está vigente: la clínica queda en solo lectura hasta que registremos el pago.'
    case 'activa':
      return fecha ? `Tu plan está activo hasta el ${fecha}. Puedes renovarlo desde ya.` : 'Tu plan está activo.'
    default:
      return null
  }
}

const pasos = [
  {
    titulo: 'Abre la app de tu banco',
    texto: 'Bancolombia, Nequi, Daviplata o cualquier banco con pagos Bre-B. Busca la opción de pagar o transferir con QR o con llave.',
  },
  {
    titulo: 'Escanea el QR o usa la llave',
    texto: 'Verifica que el destino sea «bourgelat», escribe el valor de tu plan y confirma.',
  },
  {
    titulo: 'Envíanos el comprobante',
    texto: 'Mándanos la captura con el nombre de tu clínica usando el botón de abajo. Activamos o renovamos tu suscripción el mismo día hábil.',
  },
]

export default function PagarPage() {
  const [copiada, setCopiada] = useState(false)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const clinica = useAuthStore((state) => state.clinica)
  const suscripcion = useAuthStore((state) => state.suscripcion)

  // Con sesión abierta el comprobante ya sale con el nombre de la clínica, así
  // se sabe a quién activar sin tener que preguntar.
  const nombreClinica = isAuthenticated ? clinica?.nombre : null
  const estadoSuscripcion = nombreClinica ? describirSuscripcion(suscripcion) : null

  const mensaje = encodeURIComponent(
    nombreClinica
      ? `Hola, adjunto el comprobante de pago de Bourgelat. Mi clínica es: ${nombreClinica}`
      : 'Hola, adjunto el comprobante de pago de Bourgelat. Mi clínica es: '
  )
  const enlaceWhatsapp = pagoManual.whatsapp
    ? `https://wa.me/${pagoManual.whatsapp}?text=${mensaje}`
    : null
  const asuntoCorreo = nombreClinica
    ? `Comprobante de pago Bourgelat - ${nombreClinica}`
    : 'Comprobante de pago Bourgelat'
  const enlaceCorreo = `mailto:${pagoManual.correo}?subject=${encodeURIComponent(asuntoCorreo)}&body=${mensaje}`

  const copiarLlave = async () => {
    try {
      await navigator.clipboard.writeText(pagoManual.llaveBreB)
      setCopiada(true)
      setTimeout(() => setCopiada(false), 2000)
    } catch {
      // Sin permiso de portapapeles: la llave sigue visible para copiarla a mano.
    }
  }

  return (
    <PublicPageShell
      eyebrow="Pagos"
      title="Paga tu suscripción en pocos pasos."
      description="Escanea el QR desde la app de tu banco o paga con nuestra llave Bre-B. Sin tarjetas ni pasarelas."
    >
      {nombreClinica && (
        <div className="mb-8 rounded-3xl border border-clinical-200 bg-clinical-50 p-5 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-tinta-500">Pagando para</p>
          <p className="mt-1 text-xl font-semibold text-tinta-800">{nombreClinica}</p>
          {estadoSuscripcion && <p className="mt-1 text-sm leading-6 text-tinta-600">{estadoSuscripcion}</p>}
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-3xl border border-papel-300 bg-papel-50 p-6 sm:p-8">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-caramel-600">
            Escanea para pagar
          </p>
          <div className="mx-auto max-w-[320px] rounded-2xl border border-papel-300 bg-white p-4">
            <img
              src={qrBourgelat}
              alt="Código QR Bre-B para pagar a Bourgelat"
              className="aspect-square w-full"
              width={320}
              height={320}
            />
          </div>

          <div className="mx-auto mt-5 max-w-[320px] rounded-2xl border border-papel-300 bg-papel-100 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-tinta-500">Llave Bre-B</p>
            <div className="mt-1 flex items-center justify-between gap-3">
              <p className="font-mono text-xl font-semibold tracking-wider text-tinta-800">
                {pagoManual.llaveBreB}
              </p>
              <button
                type="button"
                onClick={copiarLlave}
                className="inline-flex items-center gap-1.5 rounded-xl border border-papel-300 bg-papel-50 px-3 py-1.5 text-sm font-medium text-tinta-700 transition hover:bg-papel-200"
              >
                {copiada ? <Check className="h-4 w-4 text-clinical-600" /> : <Copy className="h-4 w-4" />}
                {copiada ? 'Copiada' : 'Copiar'}
              </button>
            </div>
            <p className="mt-1 text-xs text-tinta-500">Destino: {pagoManual.destinatario} · Bre-B · Bancolombia</p>
          </div>

          <a
            href={qrBourgelat}
            download="qr-pago-bourgelat.svg"
            className="mx-auto mt-4 flex max-w-[320px] items-center justify-center gap-2 text-sm font-medium text-tinta-600 no-underline hover:text-tinta-800"
          >
            <Download className="h-4 w-4" />
            Descargar QR
          </a>
        </section>

        <div className="space-y-8">
          <section className="rounded-3xl border border-papel-300 bg-papel-50 p-6 sm:p-8">
            <h2 className="mb-5 text-2xl font-semibold tracking-tight text-tinta-800">Cuánto pagar</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-papel-300 bg-papel-100 p-5">
                <p className="text-sm font-semibold text-tinta-600">Mensual</p>
                <p className="mt-1 text-3xl font-semibold text-tinta-800">
                  {formatoPesos(pagoManual.precioMensual)}
                </p>
                <p className="mt-1 text-sm text-tinta-500">cada mes</p>
              </div>
              <div className="rounded-2xl border border-clinical-200 bg-clinical-50 p-5">
                <p className="text-sm font-semibold text-tinta-600">Anual</p>
                <p className="mt-1 text-3xl font-semibold text-tinta-800">
                  {formatoPesos(pagoManual.precioAnualPorMes * 12)}
                </p>
                <p className="mt-1 text-sm text-tinta-500">
                  un solo pago ({formatoPesos(pagoManual.precioAnualPorMes)} al mes)
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-papel-300 bg-papel-50 p-6 sm:p-8">
            <h2 className="mb-5 text-2xl font-semibold tracking-tight text-tinta-800">Cómo pagar</h2>
            <ol className="space-y-4">
              {pasos.map((paso, indice) => (
                <li key={paso.titulo} className="flex gap-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-tinta-800 text-sm font-semibold text-white">
                    {indice + 1}
                  </span>
                  <div>
                    <p className="font-semibold text-tinta-800">{paso.titulo}</p>
                    <p className="text-sm leading-7 text-tinta-500">{paso.texto}</p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              {enlaceWhatsapp && (
                <a
                  href={enlaceWhatsapp}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-clinical-600 px-5 py-3 text-sm font-semibold text-white no-underline transition hover:bg-clinical-700"
                >
                  <MessageCircle className="h-4 w-4" />
                  Enviar comprobante por WhatsApp
                </a>
              )}
              <a
                href={enlaceCorreo}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-papel-300 bg-papel-100 px-5 py-3 text-sm font-semibold text-tinta-700 no-underline transition hover:bg-papel-200"
              >
                <Mail className="h-4 w-4" />
                Enviar por correo a {pagoManual.correo}
              </a>
            </div>

            <p className="mt-5 text-xs leading-6 text-tinta-500">
              El pago se hace en la app de tu banco; esta página no confirma automáticamente la
              recepción del dinero. Guarda tu comprobante hasta ver tu suscripción activa.
            </p>
          </section>
        </div>
      </div>
    </PublicPageShell>
  )
}
