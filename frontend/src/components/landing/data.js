import { Calendar, HeartPulse, Package } from "lucide-react"

export const NAV_ITEMS = [
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
    price: 'Sin cargo mensual',
    note: 'Agenda, pacientes e historia clínica para arrancar con una base clara.',
  },
  {
    name: 'Clínica',
    subtitle: 'Para operar el día completo',
    price: 'COP 99.000/mes',
    note: 'Inventario, caja y reportes para una clínica que ya necesita control operativo.',
  },
  {
    name: 'Profesional',
    subtitle: 'El plan principal',
    price: 'COP 189.000/mes',
    note: 'Incluye facturación electrónica DIAN y una operación más completa.',
    featured: true,
  },
  {
    name: 'Personalizado',
    subtitle: 'Para migración y acompañamiento',
    price: 'Cotización guiada',
    note: 'Cuando la clínica necesita una implementación más acompasada con el equipo.',
  },
]

export const footerLinks = [
  { label: 'Planes', to: '/planes' },
  { label: 'Nosotros', to: '/nosotros' },
  { label: 'Privacidad', to: '/privacidad' },
  { label: 'Terminos', to: '/terminos' },
  { label: 'Cookies', to: '/cookies' },
]

// Las alturas están afinadas por PESO ÓPTICO, no por píxeles iguales: los
// wordmarks anchos (DIAN, Cloudflare) pesan de más, así que van más bajos; el
// escudo es detallado y se lee pequeño, así que va más alto.
export const TRUST_LOGOS = [
  { src: '/logos/dian.svg', alt: 'DIAN', h: 23, caption: 'Habilitado ante la DIAN' },
  { src: '/logos/factus.png', alt: 'Factus', h: 24, caption: 'Conectado con Factus', invert: true },
  { src: '/logos/cloudflare.svg', alt: 'Cloudflare', h: 23, caption: 'Tus datos siempre seguros', outline: true },
  { src: '/logos/escudo-colombia.svg', alt: 'Escudo de Colombia', h: 42, caption: 'Hecho en Colombia', outline: true },
]

export const WARM_BAND_BACKGROUND = '#f8f4ee'

export const PLATFORM_FEATURES = [
  { icon: Calendar, label: 'Agenda con contexto del paciente' },
  { icon: HeartPulse, label: 'Historia que acompaña cada visita' },
  { icon: Package, label: 'Inventario que se descuenta solo' },
]
