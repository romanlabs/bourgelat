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
