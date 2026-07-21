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

const enviarEmail = async ({ para, asunto, html, texto }) => {
  if (!smtpConfigurado()) {
    logger.warn({
      contexto: 'email',
      mensaje: `SMTP no configurado; email no enviado. Para: ${para} | Asunto: ${asunto} | Contenido: ${texto}`,
    })
    return { enviado: false }
  }

  const from = process.env.EMAIL_FROM || process.env.SMTP_USER
  await obtenerTransporter().sendMail({ from, to: para, subject: asunto, html, text: texto })
  return { enviado: true }
}

const enviarEmailRecuperacionPassword = async ({ para, nombre, urlReset }) => {
  const asunto = 'Restablece tu contraseña de Bourgelat'
  const texto = `Hola ${nombre},\n\nRecibimos una solicitud para restablecer tu contraseña. Abre este enlace (válido por 30 minutos):\n\n${urlReset}\n\nSi no fuiste tú, ignora este correo; tu contraseña no cambiará.`
  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; max-width: 520px; margin: 0 auto; color: #112739;">
      <h2 style="color: #112739;">Restablece tu contraseña</h2>
      <p>Hola ${nombre},</p>
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

const enviarEmailVerificacion = async ({ para, nombre, urlVerificacion }) => {
  const asunto = 'Verifica tu correo en Bourgelat'
  const texto = `Hola ${nombre},\n\nConfirma que este correo es tuyo abriendo este enlace (valido por 24 horas):\n\n${urlVerificacion}\n\nSi no creaste una cuenta en Bourgelat, ignora este correo.`
  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; max-width: 520px; margin: 0 auto; color: #112739;">
      <h2 style="color: #112739;">Verifica tu correo</h2>
      <p>Hola ${nombre},</p>
      <p>Confirma que este correo es tuyo para terminar de asegurar tu cuenta en Bourgelat.</p>
      <p style="margin: 24px 0;">
        <a href="${urlVerificacion}"
           style="background: #10b981; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          Verificar mi correo
        </a>
      </p>
      <p style="font-size: 13px; color: #51697d;">El enlace es valido por 24 horas y solo puede usarse una vez.</p>
      <p style="font-size: 13px; color: #51697d;">Si no creaste una cuenta en Bourgelat, ignora este correo.</p>
    </div>
  `
  return enviarEmail({ para, asunto, html, texto })
}

module.exports = {
  enviarEmail,
  enviarEmailRecuperacionPassword,
  enviarEmailVerificacion,
  smtpConfigurado,
}
