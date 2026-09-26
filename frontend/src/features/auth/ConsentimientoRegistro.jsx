// Casillas de consentimiento de todo flujo que crea una cuenta.
//
// - La obligatoria cubre términos + autorización de tratamiento de datos: en
//   Colombia (Ley 1581) no basta con informar la política, la autorización
//   debe ser expresa. Nunca viene marcada por defecto.
// - La de comunicaciones comerciales es independiente y opcional.
//
// Los enlaces abren en otra pestaña para no perder lo que ya se escribió.
// Recibe las props de cada input tal cual (register() de React Hook Form o
// name/checked/onChange nativos) para servir a formularios de ambos tipos.

export default function ConsentimientoRegistro({
  terminosProps,
  comunicacionesProps,
  error,
  className = '',
  textoClassName = 'text-muted-foreground',
  linkClassName = 'font-medium text-foreground underline underline-offset-2',
  checkboxClassName = 'accent-primary',
}) {
  const enlace = (to, texto) => (
    <a href={to} target="_blank" rel="noopener noreferrer" className={linkClassName}>
      {texto}
    </a>
  )

  return (
    <div className={`space-y-2.5 ${className}`}>
      <label className={`flex cursor-pointer items-start gap-2.5 text-[13px] leading-5 ${textoClassName}`}>
        <input
          type="checkbox"
          className={`mt-0.5 h-4 w-4 shrink-0 cursor-pointer ${checkboxClassName}`}
          aria-invalid={error ? 'true' : undefined}
          {...terminosProps}
        />
        <span>
          He leído y acepto los {enlace('/terminos', 'Términos y condiciones')} y autorizo el tratamiento de
          mis datos personales según la {enlace('/privacidad', 'Política de tratamiento de datos')}.
        </span>
      </label>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <label className={`flex cursor-pointer items-start gap-2.5 text-[13px] leading-5 ${textoClassName}`}>
        <input
          type="checkbox"
          className={`mt-0.5 h-4 w-4 shrink-0 cursor-pointer ${checkboxClassName}`}
          {...comunicacionesProps}
        />
        <span>Quiero recibir novedades, promociones y actualizaciones de Bourgelat por correo (opcional).</span>
      </label>
    </div>
  )
}
