// Datos de identificación y versiones de los documentos legales. Los usan las
// páginas /privacidad, /terminos y /cookies (que muestran el PDF) y el script
// `npm run legal:pdf`, que genera los PDF en public/legal/. El art. 13 del
// Decreto 1377 de 2013 exige nombre, domicilio, dirección, correo y teléfono
// del responsable: el script no genera la versión final si falta alguno.
//
// Archivo plano (sin alias `@/`) porque también lo importa Node.

export const RESPONSABLES = [
  { nombre: 'Sergio Alexander Majé Montoya', documento: 'C.C. 1.118.364.898' },
  { nombre: 'Roman Alberto Bolaños', documento: 'C.C. 1.110.449.828' },
]

export const NOMBRES_RESPONSABLES = RESPONSABLES.map((r) => r.nombre).join(' y ')

// Pendientes de Roman y Sergio (2026-10-31): ciudad de domicilio y dirección
// de correspondencia. Mientras sean null, solo sale el borrador.
export const CIUDAD_DOMICILIO = null
export const DIRECCION_CORRESPONDENCIA = null

export const CORREO_LEGAL = 'soporte@bourgelat.co'
export const TELEFONO_LEGAL = '+57 310 204 7057'
export const SITIO_WEB = 'bourgelat.co'

// Al cambiar un documento de forma sustancial se sube su versión (aquí y en
// backend/src/config/legal.js) y se genera un PDF nuevo: los anteriores se
// conservan en public/legal/ porque son los que aceptaron las clínicas.
// `vigencia` es la fecha de publicación (AAAA-MM-DD).
export const VERSIONES_LEGALES = {
  privacidad: {
    titulo: 'Política de tratamiento de datos personales',
    version: '1.0',
    vigencia: null,
    archivo: 'politica-tratamiento-datos-v1.0.pdf',
  },
  terminos: {
    titulo: 'Términos y condiciones de uso',
    version: '1.0',
    vigencia: null,
    archivo: 'terminos-y-condiciones-v1.0.pdf',
  },
  cookies: {
    titulo: 'Política de cookies',
    version: '1.0',
    vigencia: null,
    archivo: 'politica-de-cookies-v1.0.pdf',
  },
}

export const urlDocumentoLegal = (clave) => `/legal/${VERSIONES_LEGALES[clave].archivo}`

export const formatearVigencia = (vigencia) => {
  const [anio, mes, dia] = vigencia.split('-').map(Number)
  return new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(Date.UTC(anio, mes - 1, dia))
  )
}
