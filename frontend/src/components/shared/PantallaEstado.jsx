import { buttonVariants } from '@/components/ui/button'
import { Huella, PulsoCarga } from './IlustracionEstado'

// Los mismos botones de la app, como clases: aquí también van en enlaces normales,
// porque el AppErrorBoundary está fuera del router.
export const ACCION_PRINCIPAL = `${buttonVariants({ size: 'lg' })} no-underline`
export const ACCION_SECUNDARIA = `${buttonVariants({ size: 'lg', variant: 'secondary' })} no-underline`

/**
 * Pantalla completa de un estado (error, página inexistente, actualización): la marca,
 * una frase y una salida. Enlace normal en la marca: también se pinta fuera del router.
 *
 * @param {{
 *   titulo: string,
 *   descripcion?: React.ReactNode,
 *   acciones?: React.ReactNode,
 *   nota?: React.ReactNode,
 *   cargando?: boolean,
 *   children?: React.ReactNode,
 * }} props
 */
export function PantallaEstado({ titulo, descripcion, acciones, nota, cargando = false, children }) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="px-6 py-5 sm:px-10">
        <a href="/" className="inline-flex items-center gap-2.5 text-lg font-semibold tracking-[-0.02em] text-foreground no-underline">
          <Huella className="h-7 w-7" />
          Bourgelat
        </a>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 pb-24 text-center">
        <div className="estado-aparece w-full max-w-xl">
          <h1 className="text-balance text-4xl font-semibold leading-tight tracking-[-0.04em] sm:text-5xl">{titulo}</h1>
          {descripcion ? (
            <p className="mx-auto mt-4 max-w-md text-pretty text-base leading-relaxed text-muted-foreground">{descripcion}</p>
          ) : null}
          {children}
          {cargando ? <PulsoCarga className="mx-auto mt-8" /> : null}
          {acciones ? <div className="mt-8 flex flex-col justify-center gap-2 sm:flex-row">{acciones}</div> : null}
          {nota ? <p className="mt-6 text-sm leading-6 text-muted-foreground">{nota}</p> : null}
        </div>
      </main>
    </div>
  )
}
