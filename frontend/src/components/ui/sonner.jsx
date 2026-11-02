import { Check, CircleAlert, Info, LoaderCircle, TriangleAlert } from 'lucide-react'
import { Toaster as SonnerToaster } from 'sonner'
import { cn } from '@/lib/utils'
import { useThemeStore } from '@/store/themeStore'

function IconoAviso({ icon, className, iconClassName }) {
  const Icon = icon
  return (
    <span className={cn('flex h-8 w-8 items-center justify-center rounded-lg', className)}>
      <Icon className={cn('h-[18px] w-[18px]', iconClassName)} aria-hidden="true" />
    </span>
  )
}

const ICONOS = {
  success: <IconoAviso icon={Check} className="bg-success-soft text-success" />,
  error: <IconoAviso icon={CircleAlert} className="bg-danger-soft text-danger" />,
  warning: <IconoAviso icon={TriangleAlert} className="bg-warning-soft text-warning" />,
  info: <IconoAviso icon={Info} className="bg-info-soft text-info" />,
  loading: <IconoAviso icon={LoaderCircle} className="bg-muted text-muted-foreground" iconClassName="animate-spin" />,
}

// Sonner trae sus propios estilos con selectores muy específicos; por eso el `!`.
// No se usa `unstyled` porque también quitaría cómo se apilan varios avisos.
const CLASES = {
  toast: '!gap-3 !rounded-xl !p-3 !font-sans !shadow-dropdown',
  icon: '!m-0 !h-8 !w-8 [&_svg]:!m-0',
  title: '!text-sm !font-medium !leading-5',
  description: '!text-[13px] !leading-[18px] !text-muted-foreground',
  actionButton: '!m-0 !h-8 !rounded-lg !bg-primary !px-3 !text-[13px] !font-semibold !text-primary-foreground',
  cancelButton: '!m-0 !h-8 !rounded-lg !bg-muted !px-3 !text-[13px] !font-semibold !text-foreground',
  // La X va dentro del aviso, a la derecha, y no flotando en la esquina.
  closeButton:
    '!static !order-last !h-7 !w-7 !shrink-0 !transform-none !rounded-lg !border-0 !bg-transparent !text-muted-foreground hover:!bg-muted hover:!text-foreground',
}

const VARIABLES = {
  '--width': '400px',
  '--normal-bg': 'hsl(var(--card))',
  '--normal-border': 'hsl(var(--border))',
  '--normal-text': 'hsl(var(--foreground))',
}

export function Toaster() {
  const dark = useThemeStore((state) => state.dark)

  return (
    <SonnerToaster
      // Arriba al centro: abajo a la derecha tapaban el boton principal de
      // los drawers y del punto de venta justo despues de cada accion.
      position="top-center"
      closeButton
      theme={dark ? 'dark' : 'light'}
      icons={ICONOS}
      style={VARIABLES}
      toastOptions={{ classNames: CLASES }}
    />
  )
}
