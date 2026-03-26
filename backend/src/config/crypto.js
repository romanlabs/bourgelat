const crypto = require('crypto')

const resolverClave = () => {
  const secret = process.env.INTEGRACIONES_SECRET || process.env.JWT_SECRET || 'bourgelat-dev-secret'
  return crypto.createHash('sha256').update(secret).digest()
}

const cifrarTexto = (valor) => {
  if (!valor) return null

  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', resolverClave(), iv)
  const contenido = Buffer.concat([cipher.update(String(valor), 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()

  return `${iv.toString('base64')}:${tag.toString('base64')}:${contenido.toString('base64')}`
}

const descifrarTexto = (valorCifrado) => {
  if (!valorCifrado) return null

  const [iv, tag, contenido] = String(valorCifrado).split(':')

  if (!iv || !tag || !contenido) {
    throw new Error('Valor cifrado invÃ¡lido')
  }

  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    resolverClave(),
    Buffer.from(iv, 'base64')
  )

  decipher.setAuthTag(Buffer.from(tag, 'base64'))

  const texto = Buffer.concat([
    decipher.update(Buffer.from(contenido, 'base64')),
    decipher.final(),
  ])

  return texto.toString('utf8')
}

module.exports = {
  cifrarTexto,
  descifrarTexto,
}
