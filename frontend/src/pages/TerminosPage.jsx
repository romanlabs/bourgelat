import DocumentoLegal from '@/components/shared/DocumentoLegal'

export default function TerminosPage() {
  return (
    <DocumentoLegal
      clave="terminos"
      description="Las reglas que rigen el uso de Bourgelat, las responsabilidades de cada parte y el acuerdo de tratamiento de datos entre Bourgelat y cada clínica."
      resumen={[
        'Prueba gratis de 30 días, planes, pagos y qué pasa si la suscripción vence.',
        'Los datos de la clínica son de la clínica: puede exportarlos cuando quiera.',
        'El acuerdo de tratamiento de datos entre la clínica y Bourgelat.',
      ]}
    />
  )
}
