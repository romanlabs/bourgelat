const { verificarTurnstile } = require('../services/turnstileService')

const exigirTurnstile = async (req, res, next) => {
  const resultado = await verificarTurnstile({
    token: req.body?.turnstileToken,
    ip: req.ip,
  })
  if (!resultado.ok) {
    return res.status(400).json({
      message: 'Confirma que no eres un robot e inténtalo de nuevo.',
    })
  }
  return next()
}

module.exports = { exigirTurnstile }
