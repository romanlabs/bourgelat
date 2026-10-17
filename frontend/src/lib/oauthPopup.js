// El login social se abre en un popup que termina en app.bourgelat.co
// (FRONTEND_URL del backend), pero la pestaña que lo abrió puede estar en
// bourgelat.co. Son orígenes distintos: el aviso del popup se manda a cada
// origen propio (postMessage descarta en silencio los que no coinciden con la
// pestaña real) y la pestaña acepta avisos de cualquiera de ellos.
export const ORIGENES_BOURGELAT = [
  'https://bourgelat.co',
  'https://www.bourgelat.co',
  'https://app.bourgelat.co',
  'https://staging.bourgelat.co',
]

export const origenesDestinoOauth = (origenPropio = window.location.origin) => [
  ...new Set([origenPropio, ...ORIGENES_BOURGELAT]),
]

export const esOrigenOauthValido = (origen, origenPropio = window.location.origin) =>
  origen === origenPropio || ORIGENES_BOURGELAT.includes(origen)
