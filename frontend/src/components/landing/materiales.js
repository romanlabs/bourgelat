// Materiales de los aparatos dibujados con CSS (tablet y celular). Son objetos
// físicos, no interfaz: grises fijos (hsl) para verse igual en cualquier tema.
export const ALUMINIO =
  'linear-gradient(145deg, hsl(210 6% 86%) 0%, hsl(210 4% 62%) 28%, hsl(210 5% 80%) 50%, hsl(210 4% 52%) 78%, hsl(210 5% 74%) 100%)'

export const SOMBRA = [
  'inset 0 1px 1px hsl(0 0% 100% / 0.7)', // filo de luz arriba
  'inset 0 -1px 2px hsl(0 0% 0% / 0.35)', // filo en sombra abajo
  '0 2px 4px hsl(0 0% 0% / 0.18)',
  '0 24px 48px -12px hsl(0 0% 0% / 0.45)',
  '0 60px 100px -30px hsl(0 0% 0% / 0.5)',
].join(', ')

export const MARCO = 'hsl(220 8% 7%)'

export const LENTE =
  'radial-gradient(circle at 35% 35%, hsl(220 60% 45%) 0 12%, hsl(225 30% 14%) 32%, hsl(220 8% 6%) 62%, hsl(220 6% 22%) 100%)'

export const SOMBRA_BOTON = '0 1px 1px hsl(0 0% 0% / 0.25)'
