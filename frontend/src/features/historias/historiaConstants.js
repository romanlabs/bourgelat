// Compartido entre el formulario de la historia y la formula impresa, para que
// el tutor lea en papel la misma via que el veterinario eligio en pantalla.
export const MEDICATION_ROUTE_OPTIONS = [
  { value: '', label: 'Via de administracion' },
  { value: 'oral', label: 'Oral' },
  { value: 'subcutanea', label: 'Subcutánea' },
  { value: 'intramuscular', label: 'Intramuscular' },
  { value: 'intravenosa', label: 'Intravenosa' },
  { value: 'topica', label: 'Tópica' },
  { value: 'otica', label: 'Ótica' },
  { value: 'oftalmica', label: 'Oftálmica' },
  { value: 'inhalada', label: 'Inhalada' },
  { value: 'rectal', label: 'Rectal' },
  { value: 'transdermica', label: 'Transdérmica' },
  { value: 'otra', label: 'Otra' },
]

export const VIA_LABELS = Object.fromEntries(
  MEDICATION_ROUTE_OPTIONS.filter((option) => option.value).map((option) => [option.value, option.label])
)

// Igual que la via: la historia impresa dice lo mismo que el selector.
export const HYDRATION_OPTIONS = [
  { value: '', label: 'Estado de hidratacion' },
  { value: 'normal', label: 'Normal' },
  { value: 'deshidratacion_leve', label: 'Deshidratación leve' },
  { value: 'deshidratacion_moderada', label: 'Deshidratación moderada' },
  { value: 'deshidratacion_severa', label: 'Deshidratación severa' },
]

export const HIDRATACION_LABELS = Object.fromEntries(
  HYDRATION_OPTIONS.filter((option) => option.value).map((option) => [option.value, option.label])
)
