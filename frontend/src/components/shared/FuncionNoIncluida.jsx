import { Link } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'

// Aviso para una función que el plan actual no incluye. Lleva a la comparativa.
export function FuncionNoIncluida({ titulo, descripcion, size = 'md' }) {
  return (
    <EmptyState
      icon={<Lock />}
      variant="warm"
      size={size}
      bordered
      title={titulo}
      description={descripcion}
      action={
        <Button asChild variant="outline">
          <Link to="/planes">Ver planes</Link>
        </Button>
      }
    />
  )
}
