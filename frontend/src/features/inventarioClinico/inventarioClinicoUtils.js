export const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback

export function invalidateInventarioClinicoQueries(queryClient) {
  queryClient.invalidateQueries({ queryKey: ['inventario-clinico-insumos'] })
  queryClient.invalidateQueries({ queryKey: ['inventario-clinico-insumos-selector'] })
  queryClient.invalidateQueries({ queryKey: ['inventario-clinico-insumo-detalle'] })
  queryClient.invalidateQueries({ queryKey: ['inventario-clinico-alertas'] })
  queryClient.invalidateQueries({ queryKey: ['inventario-clinico-movimientos'] })
}
