// Todo el texto de la landing vive aquí, para editarlo sin tocar el diseño.
// Regla: solo lo que es cierto hoy. La facturación DIAN va como «próximamente».
import { urlDocumentoLegal } from '@/content/legal'
import { pagoManual } from '@/content/publicSiteContent'

export const REGISTRO = '/registro'
export const LOGIN = '/login'
export const CORREO = pagoManual.correo
export const WHATSAPP = pagoManual.whatsapp

export const NAV = [
  { label: 'Producto', href: '#producto' },
  { label: 'Cómo funciona', href: '#como-funciona' },
  { label: 'Preguntas', href: '#preguntas' },
]

export const HERO = {
  titulo: ['Tu clínica,', 'en orden.'],
  frase:
    'Agenda, historias clínicas, caja e inventario de tu veterinaria en un solo programa.',
  nota: '30 días con todo abierto. Sin tarjeta.',
  imagen: '/images/landing/inicio.webp',
  alt: 'Pantalla de inicio de Bourgelat con el resumen del día de la clínica',
}

// Cada módulo es un capítulo con su propio color de fondo (`campo`).
export const MODULOS = [
  {
    id: 'agenda',
    nombre: 'Agenda',
    titulo: 'El día, de un vistazo.',
    frase:
      'Cada cita con el paciente, el motivo y el consultorio. Recepción sabe quién llega, el veterinario sabe a quién atiende y el tutor recibe el recordatorio por correo.',
    imagen: '/images/landing/agenda.webp',
    alt: 'Agenda del día en Bourgelat con citas por consultorio',
    campo: 'primary',
  },
  {
    id: 'historia',
    nombre: 'Historia clínica',
    titulo: 'Cada visita suma a la historia.',
    frase:
      'El veterinario escribe sobre el historial real del paciente: antecedentes, evolución, exámenes y la fórmula lista para imprimir.',
    imagen: '/images/landing/historia.webp',
    alt: 'Historia clínica de un paciente con sus evoluciones',
    campo: 'card',
  },
  {
    id: 'caja',
    nombre: 'Caja',
    titulo: 'Cobra y cierra sin cuaderno.',
    frase:
      'Ventas por medio de pago, abonos y cierre del turno con lo que debe haber en caja. Al final del día, las cuentas están hechas.',
    imagen: '/images/landing/caja.webp',
    alt: 'Turno de caja con ventas y medios de pago',
    campo: 'brand',
  },
  {
    id: 'inventario',
    nombre: 'Inventario',
    titulo: 'El stock se descuenta solo.',
    frase:
      'Lo que se vende o se usa en consulta sale del inventario, hasta por mililitros, y Bourgelat avisa cuando algo está por acabarse.',
    imagen: '/images/landing/inventario.webp',
    alt: 'Inventario con alertas de productos por acabarse',
    campo: 'sidebar',
  },
]

export const HECHOS = {
  titulo: 'Abre el navegador y trabaja.',
  items: [
    { titulo: 'Nada que instalar', texto: 'Funciona en la nube, protegido por Cloudflare.' },
    { titulo: 'En cualquier pantalla', texto: 'Celular, tablet o computador, desde el navegador.' },
    { titulo: 'Hecho en Colombia', texto: 'Pensado para clínicas de aquí, con soporte en español.' },
  ],
  proximamente: 'Facturación electrónica DIAN: próximamente.',
}

export const FAQS = [
  {
    pregunta: '¿Cómo empiezo?',
    respuesta:
      'Creas la cuenta con tu correo o con Google, configuras la clínica en unos pasos y tienes 30 días con todo abierto, sin poner tarjeta.',
  },
  {
    pregunta: '¿Qué pasa cuando terminan los 30 días?',
    respuesta:
      'Eliges un plan desde «Mi plan», dentro del programa. Ahí están los precios y la forma de pago.',
  },
  {
    pregunta: '¿Mis datos están seguros?',
    respuesta:
      'Cada clínica solo ve su propia información, los datos sensibles se guardan cifrados y el sitio está protegido por Cloudflare.',
  },
  {
    pregunta: '¿Funciona en el celular?',
    respuesta:
      'Sí. Bourgelat se abre desde el navegador del celular, la tablet o el computador. No hay que descargar nada.',
  },
  {
    pregunta: '¿Puede usarlo todo mi equipo?',
    respuesta:
      'Sí. Invitas a recepción y a los veterinarios, y cada uno entra con su usuario y los permisos de su rol.',
  },
  {
    pregunta: '¿Tiene facturación electrónica DIAN?',
    respuesta:
      'Todavía no: la DIAN llega próximamente. Hoy Bourgelat registra tus ventas y tu caja; si necesitas la factura electrónica, escríbenos y te avisamos cuando esté lista.',
  },
  {
    pregunta: '¿Cómo hablo con ustedes?',
    respuesta: `Por WhatsApp, al correo ${pagoManual.correo} o, si ya tienes cuenta, desde «Soporte» dentro del programa.`,
  },
]

export const CIERRE = {
  titulo: ['Empieza hoy.', 'Tu clínica lo nota mañana.'],
  nota: '30 días con todo abierto. Sin tarjeta.',
}

export const LEGAL = [
  { label: 'Privacidad', href: urlDocumentoLegal('privacidad') },
  { label: 'Términos', href: urlDocumentoLegal('terminos') },
]
