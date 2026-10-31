import DocumentoLegal from '@/components/shared/DocumentoLegal'

export default function CookiesPage() {
  return (
    <DocumentoLegal
      clave="cookies"
      description="Qué guarda Bourgelat en tu navegador, para qué lo usa y cómo puedes controlarlo."
      resumen={[
        'Solo usamos cookies necesarias para iniciar sesión y recordar preferencias.',
        'No usamos cookies de publicidad ni hacemos seguimiento entre sitios.',
      ]}
    />
  )
}
