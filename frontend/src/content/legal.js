// Datos de identificación compartidos por las páginas legales (privacidad,
// términos y cookies). Completar los marcados entre corchetes antes de
// publicar la versión final; el art. 13 del Decreto 1377 de 2013 los exige.
export const RESPONSABLES = [
  { nombre: 'Sergio Alexander Majé Montoya', documento: 'C.C. [número]' },
  { nombre: 'Roman Alberto Bolaños', documento: 'C.C. [número]' },
]

export const NOMBRES_RESPONSABLES = RESPONSABLES.map((r) => r.nombre).join(' y ')

export const DOMICILIO = '[Ciudad de domicilio], Colombia'
export const CIUDAD_JURISDICCION = '[Ciudad de domicilio]'
export const CORREO_LEGAL = 'hola@bourgelat.co'
export const TELEFONO_LEGAL = '[Número de contacto]'

export const VERSIONES_LEGALES = {
  privacidad: { version: '1.0', vigencia: '[fecha de publicación]' },
  terminos: { version: '1.0', vigencia: '[fecha de publicación]' },
  cookies: { version: '1.0', vigencia: '[fecha de publicación]' },
}
