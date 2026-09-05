// Reglas puras para validar a que apuntan los items de una factura de compra.
// Separadas del controlador para poder probarlas sin base de datos.
//
// El caso que las motivo: la factura 18319 quedo imposible de usar porque sus
// tres productos se desactivaron DESPUES de registrarla. Confirmarla exigia
// `activo: true` y fallaba; editarla validaba lo mismo y tambien fallaba, asi
// que no habia forma de corregirla ni de completarla. Ademas el error mostraba
// el UUID crudo del producto, que para la clinica no significa nada.
//
// Regla: una compra es un hecho historico. Si el producto estaba vigente
// cuando se registro el item, desactivarlo despues no invalida ese item. Solo
// las referencias que se AGREGAN exigen que la referencia siga activa.

const ETIQUETAS = {
  producto: {
    articulo: 'El producto',
    faltanteSingular: 'Un producto del detalle ya no existe en el inventario de la clínica.',
    faltantePlural: 'Algunos productos del detalle ya no existen en el inventario de la clínica.',
  },
  insumo: {
    articulo: 'El insumo clínico',
    faltanteSingular: 'Un insumo clínico del detalle ya no existe en el inventario de la clínica.',
    faltantePlural: 'Algunos insumos clínicos del detalle ya no existen en el inventario de la clínica.',
  },
}

// Compara las referencias que pide el detalle contra las filas que existen en
// la base de datos. `idsPreexistentes` son las que ya estaban guardadas en la
// factura: esas se aceptan aunque esten inactivas.
const clasificarReferencias = ({
  idsSolicitados = [],
  filas = [],
  idsPreexistentes = [],
} = {}) => {
  const porId = new Map(filas.map((fila) => [fila.id, fila]))
  const preexistentes = new Set(idsPreexistentes)

  const faltantes = []
  const inactivas = []

  for (const id of idsSolicitados) {
    const fila = porId.get(id)

    if (!fila) {
      faltantes.push(id)
      continue
    }

    if (!fila.activo && !preexistentes.has(id)) {
      inactivas.push(fila)
    }
  }

  return { faltantes, inactivas }
}

// Mensaje presentable para la clinica: nombra el producto cuando se puede y
// nunca expone un UUID.
const mensajeReferenciasInvalidas = ({ faltantes = [], inactivas = [], tipo = 'producto' } = {}) => {
  const etiqueta = ETIQUETAS[tipo] || ETIQUETAS.producto

  if (faltantes.length) {
    return faltantes.length === 1 ? etiqueta.faltanteSingular : etiqueta.faltantePlural
  }

  if (inactivas.length) {
    const nombres = inactivas.map((fila) => fila.nombre).filter(Boolean)

    if (!nombres.length) {
      return `${etiqueta.articulo} que intentas agregar está desactivado. Actívalo de nuevo o quítalo del detalle para continuar.`
    }

    return nombres.length === 1
      ? `${etiqueta.articulo} "${nombres[0]}" está desactivado. Actívalo de nuevo o quítalo del detalle para continuar.`
      : `Estos elementos del detalle están desactivados: ${nombres.join(', ')}. Actívalos de nuevo o quítalos para continuar.`
  }

  return null
}

// true cuando el detalle es utilizable tal como esta.
const referenciasSonValidas = (clasificacion) =>
  clasificacion.faltantes.length === 0 && clasificacion.inactivas.length === 0

module.exports = {
  clasificarReferencias,
  mensajeReferenciasInvalidas,
  referenciasSonValidas,
}
