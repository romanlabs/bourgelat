/**
 * El login social se abre en un popup (ver BotonesSociales.jsx en el frontend).
 * Al terminar, la pagina /oauth/popup-callback avisa a la pestana que lo abrio
 * con window.opener.postMessage y se cierra sola.
 *
 * helmet() aplica por defecto Cross-Origin-Opener-Policy: same-origin, que corta
 * el vinculo window.opener en cuanto el popup navega al backend (otro origen).
 * Sin ese vinculo el popup no puede avisarle a nadie y termina cargando el
 * dashboard dentro de la ventanita, dejando la pestana original en el login.
 *
 * Estas dos rutas son navegaciones del navegador dentro del flujo del popup, no
 * endpoints de datos, asi que relajamos COOP solo aqui.
 */
function permitirOpenerEnPopupOauth(req, res, next) {
  res.setHeader('Cross-Origin-Opener-Policy', 'unsafe-none')
  next()
}

module.exports = { permitirOpenerEnPopupOauth }
