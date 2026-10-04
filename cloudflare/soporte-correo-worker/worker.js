// Email Worker de Cloudflare: respuestas del equipo a tickets de soporte.
//
// Cloudflare Email Routing entrega aqui lo que llega a SOPORTE_CORREO_RESPUESTAS
// (con subaddressing: respuestas+t42.<token>@bourgelat.co). El Worker no decide
// nada: firma el correo crudo y lo reenvia al backend, que valida token,
// remitente y DKIM (backend/src/services/soporteCorreoService.js). Si el
// backend lo rechaza, el correo rebota con el motivo y Gmail te lo muestra.
//
// Variables: BACKEND_URL (vars de wrangler.toml) y SOPORTE_CORREO_SECRETO
// (`npx wrangler secret put SOPORTE_CORREO_SECRETO`, el mismo del backend).

const hex = (buffer) => [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('')

const firmar = async (secreto, marcaTiempo, destinatario, crudo) => {
  const clave = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secreto),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const cabecera = new TextEncoder().encode(`${marcaTiempo}\n${destinatario.toLowerCase()}\n`)
  const contenido = new Uint8Array(cabecera.length + crudo.length)
  contenido.set(cabecera)
  contenido.set(crudo, cabecera.length)
  return hex(await crypto.subtle.sign('HMAC', clave, contenido))
}

export default {
  async email(message, env) {
    const crudo = new Uint8Array(await new Response(message.raw).arrayBuffer())
    const marcaTiempo = String(Date.now())
    const firma = await firmar(env.SOPORTE_CORREO_SECRETO, marcaTiempo, message.to, crudo)

    let respuesta
    try {
      respuesta = await fetch(`${env.BACKEND_URL}/api/soporte-equipo/correo`, {
        method: 'POST',
        headers: {
          'content-type': 'message/rfc822',
          'x-bourgelat-firma': firma,
          'x-bourgelat-marca-tiempo': marcaTiempo,
          'x-bourgelat-destinatario': message.to,
        },
        body: crudo,
      })
    } catch {
      message.setReject('Bourgelat no respondió. Intenta de nuevo en unos minutos o usa npm run soporte:responder.')
      return
    }

    if (respuesta.ok) return

    const { message: motivo } = await respuesta.json().catch(() => ({}))
    message.setReject(
      respuesta.status === 422 && motivo
        ? `No se aplicó la respuesta al ticket: ${motivo}`
        : `No se aplicó la respuesta al ticket (error ${respuesta.status}). Usa npm run soporte:responder.`
    )
  },
}
