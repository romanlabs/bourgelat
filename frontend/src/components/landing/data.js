import { Calendar, HeartPulse, Package } from "lucide-react"

export const NAV_ITEMS = [
  { label: 'Plataforma', href: '#plataforma' },
  { label: 'Flujo', href: '#flujo' },
  { label: 'Planes', href: '#planes' },
  { label: 'Contacto', href: '#contacto' },
]

export const FLOW_STEPS = [
  {
    step: '01',
    title: 'Llaman, agendan y llegan',
    body:
      'La recepción ve qué paciente viene, por qué viene y qué debe pasar antes de entrar a consulta.',
    image: '/images/flujo/slide-1.webp',
  },
  {
    step: '02',
    title: 'El caso se atiende con memoria',
    body:
      'El veterinario registra la evolucion sobre el historial real del paciente, no sobre una nota aislada.',
    image: '/images/flujo/slide-2.webp',
  },
  {
    step: '03',
    title: 'Caja, stock y proximo paso',
    body:
      'El cierre queda amarrado al caso: cobro, consumo, alerta de reposicion y siguiente contacto con el tutor.',
    image: '/images/flujo/slide-3.webp',
  },
]


export const PLAN_PREVIEW = [
  {
    name: 'Esencial',
    subtitle: 'Para empezar con orden',
    price: 'Gratis',
    note: 'Agenda, pacientes e historia clínica para poner la consulta en orden desde el primer día.',
  },
  {
    name: 'Clínica',
    subtitle: 'Para el día completo',
    price: 'COP 99.000/mes',
    note: 'Suma inventario, caja y reportes cuando la clínica necesita control sobre cada turno.',
    featured: true,
  },
  {
    name: 'Profesional',
    subtitle: 'Próximamente',
    price: null,
    note: 'Reportes avanzados y facturación electrónica DIAN. En desarrollo para la v2.',
    comingSoon: true,
  },
]

export const footerLinks = [
  { label: 'Planes', to: '/planes' },
  { label: 'Nosotros', to: '/nosotros' },
  { label: 'Privacidad', to: '/privacidad' },
  { label: 'Terminos', to: '/terminos' },
  { label: 'Cookies', to: '/cookies' },
]

export const TRUST_LOGOS = [
  { src: '/logos/cloudflare.svg', alt: 'Cloudflare', h: 23, caption: 'Tus datos siempre seguros', outline: true },
  { src: '/logos/escudo-colombia.svg', alt: 'Escudo de Colombia', h: 42, caption: 'Hecho en Colombia', outline: true },
]

export const TRUST_CHIPS = [
  '100% en la nube — sin instalaciones',
  'Acceso desde cualquier dispositivo',
]

export const WARM_BAND_BACKGROUND = '#f8f4ee'

// `screen` es la captura que se muestra en la tablet al activar cada módulo.
// Agenda e Inventario aún no tienen captura propia: el <img> cae de vuelta a
// bourgelat-pacientes.webp hasta que se agreguen esos archivos a public/images.
export const PLATFORM_FEATURES = [
  { icon: Calendar, label: 'Agenda con contexto del paciente', screen: '/images/bourgelat-agenda.webp' },
  { icon: HeartPulse, label: 'Historia que acompaña cada visita', screen: '/images/bourgelat-pacientes.webp' },
  { icon: Package, label: 'Inventario que se descuenta solo', screen: '/images/bourgelat-inventario.webp' },
]
