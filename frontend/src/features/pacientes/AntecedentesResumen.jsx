import { ArrowRight } from 'lucide-react'
import { NavCtaLink } from '@/components/shared/NavCta'

const mapMedicamentosToText = (medicamentos) => {
  if (!Array.isArray(medicamentos) || medicamentos.length === 0) return ''
  return medicamentos
    .map((item) => {
      if (typeof item === 'string') return item
      if (item && typeof item === 'object') {
        return [item.nombre, item.dosis, item.frecuencia].filter(Boolean).join(' | ')
      }
      return ''
    })
    .filter(Boolean)
    .join('\n')
}

export default function AntecedentesResumen({ antecedentes, mascotaId }) {
  const alergias = antecedentes?.alergias || []
  const condiciones = antecedentes?.condicionesCronicas || []
  const vacunas = antecedentes?.vacunas || []
  const medicamentosTexto = mapMedicamentosToText(antecedentes?.medicamentosActuales)
  const ninguno =
    alergias.length === 0 && condiciones.length === 0 && !medicamentosTexto && vacunas.length === 0

  if (ninguno) {
    return (
      <div className="py-1 text-sm text-muted-foreground">
        Sin antecedentes registrados para este paciente.{' '}
        <NavCtaLink to={`/antecedentes?mascotaId=${mascotaId}`}>
          Registrar antecedentes
        </NavCtaLink>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {alergias.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-rose-700">
            Alergias
          </p>
          <div className="space-y-1">
            {alergias.map((item, index) => (
              <div
                key={index}
                className="rounded border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-800"
              >
                <span className="font-semibold">{item.tipo || 'Alergia'}</span>
                {item.descripcion ? <span> · {item.descripcion}</span> : null}
                {item.reaccion ? (
                  <span className="text-rose-600"> → {item.reaccion}</span>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      )}

      {condiciones.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">
            Condiciones crónicas
          </p>
          <div className="space-y-1">
            {condiciones.map((item, index) => (
              <div
                key={index}
                className="rounded border border-amber-100 bg-amber-50 px-3 py-2 text-sm text-amber-800"
              >
                <span className="font-semibold">{item.nombre}</span>
                {item.tratamientoActual ? <span> · {item.tratamientoActual}</span> : null}
              </div>
            ))}
          </div>
        </div>
      )}

      {medicamentosTexto ? (
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-violet-700">
            Medicamentos actuales
          </p>
          <p className="whitespace-pre-line text-sm leading-6 text-foreground">
            {medicamentosTexto}
          </p>
        </div>
      ) : null}

      {vacunas.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
            Vacunas
          </p>
          <div className="space-y-1">
            {vacunas.slice(0, 3).map((item, index) => (
              <div key={index} className="text-sm text-foreground">
                <span className="font-semibold">{item.nombre}</span>
                {item.fecha ? (
                  <span className="text-muted-foreground"> · {item.fecha}</span>
                ) : null}
                {item.proximaDosis ? (
                  <span className="text-emerald-700"> · Próxima: {item.proximaDosis}</span>
                ) : null}
              </div>
            ))}
            {vacunas.length > 3 ? (
              <p className="text-xs text-muted-foreground">+{vacunas.length - 3} más</p>
            ) : null}
          </div>
        </div>
      )}

      {antecedentes?.esterilizado ? (
        <p className="text-xs text-muted-foreground">
          Paciente esterilizado
          {antecedentes.fechaEsterilizacion ? ` · ${antecedentes.fechaEsterilizacion}` : ''}
        </p>
      ) : null}

      <NavCtaLink
        to={`/antecedentes?mascotaId=${mascotaId}`}
        icon={ArrowRight}
        size="sm"
        className="pt-1"
      >
        Editar antecedentes
      </NavCtaLink>
    </div>
  )
}
