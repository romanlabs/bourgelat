import { invalidarDominios } from '@/lib/queryKeys'

// Mantener en sync con backend/src/utils/vencimiento.js.
export const CATEGORIAS_CON_VENCIMIENTO = [
  'medicamento', 'vacuna', 'insumo', 'alimento', 'antiparasitario', 'suplemento',
]

export const requiereVencimiento = (categoria) => CATEGORIAS_CON_VENCIMIENTO.includes(categoria)

export const DESTINO_BADGE = {
  clinico: { label: 'Clínico', className: 'bg-info-soft text-info ' },
  ventas: { label: 'Ventas', className: 'bg-muted text-muted-foreground' },
}

export const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback

export function invalidateInventarioQueries(queryClient) {
  invalidarDominios(queryClient, 'productos')
}
