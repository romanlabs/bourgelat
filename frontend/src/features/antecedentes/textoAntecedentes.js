// Un antecedente vacío no significa que el paciente no lo tenga: la ficha se crea
// sola al abrirla, sin que nadie pregunte. Solo se afirma lo que alguien registró.
export const SIN_REGISTRAR = 'Sin registrar'
export const SIN_ALERGIAS = 'Sin alergias conocidas'
export const SIN_MEDICACION = 'No toma medicamentos'

export const OPCIONES_ESTERILIZADO = [
  { value: '', label: SIN_REGISTRAR },
  { value: 'si', label: 'Sí' },
  { value: 'no', label: 'No' },
]

export const esterilizadoACampo = (valor) => (valor === true ? 'si' : valor === false ? 'no' : '')
export const campoAEsterilizado = (campo) => (campo === 'si' ? true : campo === 'no' ? false : null)
export const textoEsterilizado = (valor) => (valor === true ? 'Sí' : valor === false ? 'No' : SIN_REGISTRAR)

// Lo registrado manda: una confirmación vieja de «ninguno» no tapa una alergia.
export const textoRegistrado = (lista, confirmadoSin, textoSin) => {
  if (lista.length) return lista.join(', ')
  return confirmadoSin ? textoSin : SIN_REGISTRAR
}
