export const PRODUCT_CATEGORIES = [
  { value: 'medicamento', label: 'Medicamento' },
  { value: 'vacuna', label: 'Vacuna' },
  { value: 'insumo', label: 'Insumo' },
  { value: 'alimento', label: 'Alimento' },
  { value: 'accesorio', label: 'Accesorio' },
  { value: 'antiparasitario', label: 'Antiparasitario' },
  { value: 'suplemento', label: 'Suplemento' },
]

import { Banknote, CreditCard, Landmark, MoreHorizontal, Smartphone } from 'lucide-react'

export const PAYMENT_METHOD_ICONS = {
  efectivo: Banknote,
  tarjeta_debito: CreditCard,
  tarjeta_credito: CreditCard,
  transferencia: Landmark,
  nequi: Smartphone,
  daviplata: Smartphone,
  otro: MoreHorizontal,
}

export const PAYMENT_METHOD_SHORT = {
  efectivo: 'Efectivo',
  tarjeta_debito: 'Débito',
  tarjeta_credito: 'Crédito',
  transferencia: 'Transfer.',
  nequi: 'Nequi',
  daviplata: 'Daviplata',
  otro: 'Otro',
}
