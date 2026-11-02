// Por qué una consulta no se pudo precargar en la caja. Queda a la vista en vez de
// un toast que se va: sin él, la caja solo se ve vacía y nadie sabe qué falta.
export const avisoCobroConsulta = (error, historiaId) => {
  const { status, data } = error?.response || {}

  if (status === 400 && data?.mascotaId) {
    return {
      titulo: 'Esta consulta todavía no se puede cobrar',
      mensaje: 'Sigue abierta. Cuando se cierre la historia clínica, se cargan aquí el tutor y los insumos.',
      consultaHref: `/pacientes/${data.mascotaId}/historial?historiaId=${historiaId}`,
    }
  }

  return {
    titulo: 'No se cargó la consulta',
    mensaje: data?.message || 'No fue posible cargar los insumos de la consulta. Inténtalo de nuevo.',
    consultaHref: null,
  }
}
