// Recordatorio de vacuna o desparasitación al tutor: abre Gmail con el correo
// ya escrito para que la clínica lo revise y lo envíe desde su propia cuenta
// (no sale por el correo de Bourgelat ni gasta su cupo diario).
import { fechaCorta, soloDia } from './fichaSaludUtils'
import { hoyLocal } from '@/lib/fecha'
import { formatearCelular } from '@/lib/celular'

const primerNombre = (nombre) => String(nombre || '').trim().split(/\s+/)[0] || ''

export function textoRecordatorio({ tutorNombre, mascotaNombre, tratamiento, proxima, clinica }) {
  const nombreClinica = clinica?.nombreComercial || clinica?.nombre || 'la clínica'
  const vencida = proxima && soloDia(proxima) < hoyLocal()
  const cuando = !proxima
    ? 'ya le corresponde'
    : vencida
      ? `le correspondía el ${fechaCorta(proxima)}`
      : `le corresponde el ${fechaCorta(proxima)}`

  const asunto = `Recordatorio: ${tratamiento} de ${mascotaNombre}`
  const cuerpo = [
    `Hola${tutorNombre ? ` ${primerNombre(tutorNombre)}` : ''},`,
    '',
    `Te escribimos de ${nombreClinica} para recordarte que a ${mascotaNombre} ${cuando} su ${tratamiento.charAt(0).toLowerCase()}${tratamiento.slice(1)}.`,
    '',
    `Responde este correo${clinica?.telefono ? ` o llámanos al ${formatearCelular(clinica.telefono)}` : ''} para agendar la cita.`,
    '',
    'Un saludo,',
    nombreClinica,
  ].join('\n')

  return { asunto, cuerpo }
}

export function urlGmailRecordatorio({ tutorEmail, ...datos }) {
  const { asunto, cuerpo } = textoRecordatorio(datos)
  const params = new URLSearchParams({ view: 'cm', fs: '1', to: tutorEmail, su: asunto, body: cuerpo })
  return `https://mail.google.com/mail/?${params.toString()}`
}
