// Un antecedente vacío no significa que el paciente no lo tenga: la ficha se crea
// sola al abrirla, sin que nadie pregunte. Nunca se muestra como «Ninguna» o «No».
export const SIN_REGISTRAR = 'Sin registrar'

// La esterilización se guarda en el paciente y en sus antecedentes, sin sincronizar;
// basta con que una de las dos fichas la registre.
export const estaEsterilizado = (...fichas) => fichas.some((ficha) => ficha?.esterilizado === true)
