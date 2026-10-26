export const brandProfile = {
  name: 'Bourgelat',
  shortTagline: 'El sistema operativo digital de la veterinaria colombiana.',
  oneLiner:
    'Software SaaS para clínicas veterinarias en Colombia que centraliza la operación clínica, administrativa y fiscal en una sola plataforma.',
  mission:
    'Ayudar a las clínicas veterinarias a atender mejor, registrar mejor y cobrar mejor desde un solo sistema.',
  vision:
    'Convertirse en la plataforma de referencia para la operación veterinaria en Latinoamérica, empezando por Colombia.',
  promise:
    'Citas, historia clínica, inventario, facturación y cumplimiento electrónico sin depender de cuatro herramientas distintas.',
  audience: [
    'Clínicas veterinarias pequeñas y medianas.',
    'Consultorios con uno a diez veterinarios.',
    'Centros con recepción, farmacia e inventario.',
    'Equipos que necesitan historia clínica, agenda y facturación en un mismo flujo.',
  ],
  problems: [
    'WhatsApp para citas y recordatorios.',
    'Excel para inventario y caja.',
    'Papel, Word o archivos dispersos para historias clínicas.',
    'Otro sistema o portal aparte para la facturación electrónica.',
  ],
  v1Modules: [
    'Usuarios y roles por clínica.',
    'Propietarios y mascotas.',
    'Citas.',
    'Antecedentes e historia clínica básica.',
    'Inventario.',
    'Facturación interna.',
    'Facturación electrónica con proveedor autorizado.',
    'Auditoría.',
    'Reportes básicos.',
  ],
  notYet: [
    'Hospitalización avanzada.',
    'Laboratorio integrado.',
    'Imagenes diagnosticas avanzadas.',
    'Scanner por camara.',
    'App móvil nativa.',
    'Automatizaciones complejas de marketing.',
  ],
  differentiators: [
    'Pensado para veterinaria, no para medicina humana adaptada a la fuerza.',
    'Enfocado en Colombia y su realidad fiscal.',
    'Preparado para trabajo multi-clinica.',
    'Orientado a operación diaria real, no solo a una agenda bonita.',
  ],
}

export const legalDraftNotice =
  'Este contenido es un borrador operativo para el sitio mientras se completa la revisión legal final en Colombia.'

// Cobro manual (sin pasarela): QR Bre-B de Bancolombia + comprobante + activación
// manual con `npm run suscripcion:asignar`.
// Precios de los planes pagos para las páginas públicas (landing, /planes, /pagar).
// Deben coincidir con backend/src/config/planes.js; precioAnual es el valor por mes
// pagando el año.
export const PRECIOS_PLANES = {
  esencial: { nombre: 'Esencial', precioMensual: 89000, precioAnual: 75000 },
  activo: { nombre: 'Clínica', precioMensual: 120000, precioAnual: 100000 },
}

export const pagoManual = {
  llaveBreB: '0093458902',
  destinatario: 'bourgelat',
  // Número de WhatsApp de Bourgelat (formato internacional sin +). También lo usa
  // el botón flotante de la landing.
  whatsapp: '573102047057',
  correo: 'soporte@bourgelat.co',
}
