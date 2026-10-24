const logger = require('../utils/logger')

// SMTP genérico via nodemailer. Si SMTP_HOST no está configurado (dev local),
// el correo no se envía y el contenido se registra en el log para poder
// probar el flujo sin una cuenta de correo real.
const smtpConfigurado = () => Boolean(process.env.SMTP_HOST)

let transporterCache = null

const obtenerTransporter = () => {
  if (transporterCache) return transporterCache
  // Require perezoso: nodemailer solo se carga si hay SMTP configurado
  const nodemailer = require('nodemailer')
  transporterCache = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  })
  return transporterCache
}

const enviarEmail = async ({ para, asunto, html, texto, responderA = null }) => {
  if (!smtpConfigurado()) {
    // En local el contenido sirve para abrir los enlaces sin SMTP. En
    // producción esos enlaces (invitación, restablecer clave) siguen vigentes:
    // dejarlos en los logs equivale a entregarlos a quien lea los logs.
    const contenido = process.env.NODE_ENV === 'production' ? '' : ` | Contenido: ${texto}`
    logger.warn({
      contexto: 'email',
      mensaje: `SMTP no configurado; email no enviado. Para: ${para} | Asunto: ${asunto}${contenido}`,
    })
    return { enviado: false }
  }

  const from = process.env.EMAIL_FROM || process.env.SMTP_USER
  await obtenerTransporter().sendMail({
    from,
    to: para,
    subject: asunto,
    html,
    text: texto,
    ...(responderA ? { replyTo: responderA } : {}),
  })
  return { enviado: true }
}

// Escapa texto que escribio un usuario antes de meterlo en una plantilla HTML.
const escaparHtml = (valor) =>
  String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const enviarEmailRecuperacionPassword = async ({ para, nombre, urlReset }) => {
  const asunto = 'Restablece tu contraseña de Bourgelat'
  const texto = `Hola ${nombre},\n\nRecibimos una solicitud para restablecer tu contraseña. Abre este enlace (válido por 30 minutos):\n\n${urlReset}\n\nSi no fuiste tú, ignora este correo; tu contraseña no cambiará.`
  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; max-width: 520px; margin: 0 auto; color: #112739;">
      <h2 style="color: #112739;">Restablece tu contraseña</h2>
      <p>Hola ${escaparHtml(nombre)},</p>
      <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta en Bourgelat.</p>
      <p style="margin: 24px 0;">
        <a href="${urlReset}"
           style="background: #10b981; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          Crear nueva contraseña
        </a>
      </p>
      <p style="font-size: 13px; color: #51697d;">El enlace es válido por 30 minutos y solo puede usarse una vez.</p>
      <p style="font-size: 13px; color: #51697d;">Si no solicitaste este cambio, ignora este correo; tu contraseña no cambiará.</p>
    </div>
  `
  return enviarEmail({ para, asunto, html, texto })
}

// Enlaces a los documentos que el usuario aceptó al registrarse, para que
// conserve una copia de dónde consultarlos.
const pieLegal = (urlFrontend) => {
  if (!urlFrontend) return { html: '', texto: '' }
  const terminos = `${urlFrontend}/terminos`
  const privacidad = `${urlFrontend}/privacidad`
  return {
    html: `
      <p style="font-size: 12px; color: #51697d; border-top: 1px solid #d7e4ee; padding-top: 16px; margin-top: 24px;">
        Al crear tu cuenta aceptaste los <a href="${terminos}" style="color: #3a6d87;">Términos y condiciones</a>
        y autorizaste el tratamiento de tus datos según nuestra
        <a href="${privacidad}" style="color: #3a6d87;">Política de tratamiento de datos</a>.
        Puedes consultarlos en cualquier momento.
      </p>`,
    texto: `\n\nAl crear tu cuenta aceptaste los Términos y condiciones (${terminos}) y autorizaste el tratamiento de tus datos según la Política de tratamiento de datos (${privacidad}).`,
  }
}

const enviarEmailBienvenida = async ({ para, nombre, urlFrontend }) => {
  const asunto = 'Bienvenido a Bourgelat'
  const pie = pieLegal(urlFrontend)
  const nombreSeguro = escaparHtml(nombre)
  const texto = `Hola ${nombre},\n\nTu clínica ya está registrada en Bourgelat. Tienes 30 días de prueba con acceso completo para conocer la plataforma.\n\nEntra en: ${urlFrontend}/login${pie.texto}`
  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; max-width: 520px; margin: 0 auto; color: #112739;">
      <h2 style="color: #112739;">Bienvenido a Bourgelat</h2>
      <p>Hola ${nombreSeguro},</p>
      <p>Tu clínica ya está registrada. Tienes 30 días de prueba con acceso completo para conocer la plataforma.</p>
      <p style="margin: 24px 0;">
        <a href="${urlFrontend}/login"
           style="background: #10b981; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          Entrar a Bourgelat
        </a>
      </p>
      ${pie.html}
    </div>
  `
  return enviarEmail({ para, asunto, html, texto })
}

const enviarEmailVerificacion = async ({ para, nombre, urlVerificacion, urlFrontend }) => {
  const asunto = 'Verifica tu correo en Bourgelat'
  const pie = pieLegal(urlFrontend)
  const texto = `Hola ${nombre},\n\nConfirma que este correo es tuyo abriendo este enlace (válido por 24 horas):\n\n${urlVerificacion}\n\nSi no creaste una cuenta en Bourgelat, ignora este correo.${pie.texto}`
  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; max-width: 520px; margin: 0 auto; color: #112739;">
      <h2 style="color: #112739;">Verifica tu correo</h2>
      <p>Hola ${escaparHtml(nombre)},</p>
      <p>Confirma que este correo es tuyo para terminar de asegurar tu cuenta en Bourgelat.</p>
      <p style="margin: 24px 0;">
        <a href="${urlVerificacion}"
           style="background: #10b981; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          Verificar mi correo
        </a>
      </p>
      <p style="font-size: 13px; color: #51697d;">El enlace es válido por 24 horas y solo puede usarse una vez.</p>
      <p style="font-size: 13px; color: #51697d;">Si no creaste una cuenta en Bourgelat, ignora este correo.</p>
      ${pie.html}
    </div>
  `
  return enviarEmail({ para, asunto, html, texto })
}

const enviarEmailCodigoVerificacion = async ({ para, nombre, codigo, urlFrontend }) => {
  const asunto = 'Tu código de verificación de Bourgelat'
  const pie = pieLegal(urlFrontend)
  const nombreSeguro = escaparHtml(nombre)
  const texto = `Hola ${nombre},

Tu código de verificación es: ${codigo}

Vence en 10 minutos. Si no fuiste tú, ignora este correo.${pie.texto}`
  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; max-width: 520px; margin: 0 auto; color: #112739;">
      <h2 style="color: #112739;">Confirma tu correo</h2>
      <p>Hola ${nombreSeguro},</p>
      <p>Escribe este código en Bourgelat para terminar de crear tu cuenta:</p>
      <p style="margin: 24px 0; font-size: 36px; letter-spacing: 8px; font-weight: bold; text-align: center; color: #112739;">${codigo}</p>
      <p style="font-size: 13px; color: #51697d;">El código vence en 10 minutos.</p>
      <p style="font-size: 13px; color: #51697d;">Si no fuiste tú, ignora este correo.</p>
      ${pie.html}
    </div>
  `
  return enviarEmail({ para, asunto, html, texto })
}

// Invitación a unirse al equipo de una clínica. El nombre de la clínica y del
// administrador los escribe el cliente: van escapados, recortados y nunca en el
// asunto ni como enlace, para que una cuenta maliciosa no pueda usar este
// correo como phishing con la marca de Bourgelat.
const recortar = (valor, maximo) => {
  const texto = String(valor ?? '').replace(/\s+/g, ' ').trim()
  return texto.length > maximo ? `${texto.slice(0, maximo - 1)}…` : texto
}

const armarEmailInvitacion = ({ nombre, nombreClinica, nombreAdmin, urlAceptar }) => {
  const asunto = 'Te invitaron a unirte a un equipo en Bourgelat'
  const clinica = recortar(nombreClinica, 80)
  const admin = recortar(nombreAdmin, 80)
  const persona = recortar(nombre, 80)
  const quienInvita = admin ? `${admin}, de ${clinica},` : clinica
  const urlRechazar = `${urlAceptar}&rechazar=1`
  const texto = `Hola ${persona},

${quienInvita} te invitó a unirte a su equipo en Bourgelat.

Crea tu contraseña desde este enlace (válido por 72 horas y de un solo uso):
${urlAceptar}

Nadie más conoce tu contraseña: la defines tú.

Si no reconoces esta invitación, ábrela aquí para rechazarla y borrar la cuenta:
${urlRechazar}`
  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; max-width: 520px; margin: 0 auto; color: #112739;">
      <h2 style="color: #112739;">Te invitaron a Bourgelat</h2>
      <p>Hola ${escaparHtml(persona)},</p>
      <p>${escaparHtml(quienInvita)} te invitó a unirte a su equipo en Bourgelat.</p>
      <p style="margin: 24px 0;">
        <a href="${escaparHtml(urlAceptar)}"
           style="background: #10b981; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          Crear mi contraseña
        </a>
      </p>
      <p style="font-size: 13px; color: #51697d;">El enlace es válido por 72 horas y solo puede usarse una vez. Nadie más conoce tu contraseña: la defines tú.</p>
      <p style="font-size: 13px; color: #51697d;">
        ¿No reconoces esta invitación?
        <a href="${escaparHtml(urlRechazar)}" style="color: #3a6d87;">Recházala aquí</a>
        y borraremos la cuenta creada con tu correo.
      </p>
    </div>
  `
  return { asunto, html, texto }
}

const enviarEmailInvitacion = ({ para, ...datos }) =>
  enviarEmail({ para, ...armarEmailInvitacion(datos) })

// Aviso al profesional asignado antes de su cita (job recordatoriosCita).
// Solo datos de agenda: nada de la historia clínica.
const armarEmailRecordatorioCita = ({ nombreProfesional, datos }) => {
  const e = escaparHtml
  const filas = [
    ['Hora', datos.hora],
    ['Paciente', `${datos.paciente}${datos.especie ? ` (${datos.especie})` : ''}`],
    ['Tutor', datos.tutor],
    ['Celular', datos.celularTutor],
    ['Motivo', datos.motivo],
    ['Tipo', datos.tipo],
    ['Consultorio', datos.consultorio],
  ].filter(([, valor]) => valor)

  const texto = `Hola ${nombreProfesional},

Tienes una cita:
${filas.map(([etiqueta, valor]) => `${etiqueta}: ${valor}`).join('\n')}

Ver en la agenda: ${datos.urlAgenda}`

  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; max-width: 520px; margin: 0 auto; color: #112739;">
      <h2 style="color: #112739;">Tienes una cita a las ${e(datos.hora)}</h2>
      <p>Hola ${e(nombreProfesional)},</p>
      <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
        ${filas.map(([etiqueta, valor]) => `
        <tr>
          <td style="padding: 6px 12px 6px 0; font-size: 13px; color: #51697d; white-space: nowrap;">${etiqueta}</td>
          <td style="padding: 6px 0; font-size: 15px;">${e(valor)}</td>
        </tr>`).join('')}
      </table>
      <p style="margin: 24px 0;">
        <a href="${e(datos.urlAgenda)}" style="background: #112739; color: #ffffff; padding: 12px 20px; text-decoration: none; display: inline-block;">Ver en la agenda</a>
      </p>
      <p style="font-size: 12px; color: #51697d;">Recibes este aviso porque tu clínica tiene activos los recordatorios de citas en Configuración.</p>
    </div>
  `
  return { asunto: datos.asunto, html, texto }
}

const enviarEmailRecordatorioCita = ({ para, nombreProfesional, datos }) =>
  enviarEmail({ para, ...armarEmailRecordatorioCita({ nombreProfesional, datos }) })

module.exports = {
  enviarEmail,
  enviarEmailCodigoVerificacion,
  armarEmailRecordatorioCita,
  enviarEmailRecordatorioCita,
  escaparHtml,
  enviarEmailRecuperacionPassword,
  enviarEmailVerificacion,
  enviarEmailBienvenida,
  armarEmailInvitacion,
  enviarEmailInvitacion,
  smtpConfigurado,
}
