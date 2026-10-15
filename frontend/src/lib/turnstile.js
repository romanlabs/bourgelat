export const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY

// Sin clave de sitio no se muestra el widget y los formularios no exigen token.
export const turnstileHabilitado = Boolean(turnstileSiteKey)
