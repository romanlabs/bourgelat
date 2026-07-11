export const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback

export function invalidateInventarioQueries(queryClient) {
  queryClient.invalidateQueries({ queryKey: ['inventario-productos'] })
  queryClient.invalidateQueries({ queryKey: ['inventario-productos-selector'] })
  queryClient.invalidateQueries({ queryKey: ['inventario-producto-detalle'] })
  queryClient.invalidateQueries({ queryKey: ['inventario-reporte-completo'] })
  queryClient.invalidateQueries({ queryKey: ['inventario-alertas'] })
  queryClient.invalidateQueries({ queryKey: ['inventario-movimientos'] })
  queryClient.invalidateQueries({ queryKey: ['dashboard-inventario'] })
}
