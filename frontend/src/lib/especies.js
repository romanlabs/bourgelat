// Terminologia clinica de especies. La base guarda el valor comun (perro,
// gato...); aqui vive solo lo que se muestra en pantallas, filtros y PDFs.

const ESPECIES = [
  { value: 'perro', label: 'Canino', plural: 'Caninos', comun: 'perro' },
  { value: 'gato', label: 'Felino', plural: 'Felinos', comun: 'gato' },
  { value: 'ave', label: 'Aviar', plural: 'Aves', comun: 'ave' },
  { value: 'conejo', label: 'Lagomorfo', plural: 'Lagomorfos', comun: 'conejo' },
  { value: 'reptil', label: 'Reptil', plural: 'Reptiles' },
  { value: 'otro', label: 'Otro', plural: 'Otros' },
]

export const ESPECIE_VALORES = ESPECIES.map((e) => e.value)

export const ESPECIE_LABELS = Object.fromEntries(ESPECIES.map((e) => [e.value, e.label]))

export const ESPECIE_LABELS_PLURAL = Object.fromEntries(ESPECIES.map((e) => [e.value, e.plural]))

// En el formulario se aclara el nombre comun para quien no usa el termino clinico.
export const ESPECIE_OPCIONES_FORM = ESPECIES.map((e) => ({
  value: e.value,
  label: e.comun ? `${e.label} (${e.comun})` : e.label,
}))

export const ESPECIE_OPCIONES_FILTRO = [
  { value: 'todas', label: 'Todas las especies' },
  ...ESPECIES.map((e) => ({ value: e.value, label: e.plural })),
]

// Valores desconocidos (datos viejos o libres) se muestran tal cual.
export const etiquetaEspecie = (especie) => (especie ? ESPECIE_LABELS[especie] || especie : '')
