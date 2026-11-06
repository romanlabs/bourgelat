// Colores de cada «capítulo» de la landing. Cada sección es un campo de un
// solo color, de borde a borde; la barra superior toma el color del campo que
// tiene debajo. Solo tokens del tema.
export const CAMPOS = {
  primary: {
    fondo: 'bg-primary',
    tinta: 'text-primary-foreground',
    suave: 'text-sidebar-foreground',
    boton: 'bg-brand text-foreground hover:bg-card',
    enlace: 'text-sidebar-foreground hover:text-brand',
  },
  card: {
    fondo: 'bg-card',
    tinta: 'text-foreground',
    suave: 'text-muted-foreground',
    boton: 'bg-primary text-primary-foreground hover:bg-foreground',
    enlace: 'text-muted-foreground hover:text-foreground',
  },
  fondo: {
    fondo: 'bg-background',
    tinta: 'text-foreground',
    suave: 'text-muted-foreground',
    boton: 'bg-primary text-primary-foreground hover:bg-foreground',
    enlace: 'text-muted-foreground hover:text-foreground',
  },
  brand: {
    fondo: 'bg-brand',
    tinta: 'text-foreground',
    suave: 'text-foreground',
    boton: 'bg-foreground text-background hover:bg-primary',
    enlace: 'text-foreground hover:text-primary',
  },
  tinta: {
    fondo: 'bg-foreground',
    tinta: 'text-background',
    suave: 'text-secondary',
    boton: 'bg-brand text-foreground hover:bg-card',
    enlace: 'text-secondary hover:text-brand',
  },
}

export const campo = (nombre) => CAMPOS[nombre] ?? CAMPOS.card
