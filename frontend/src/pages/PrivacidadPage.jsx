import DocumentoLegal from '@/components/shared/DocumentoLegal'

export default function PrivacidadPage() {
  return (
    <DocumentoLegal
      clave="privacidad"
      description="Cómo Bourgelat recolecta, usa, protege y conserva los datos personales, y cómo puedes ejercer tus derechos como titular."
      resumen={[
        'Quién es el responsable de tus datos y cómo contactarlo.',
        'Qué datos tratamos, para qué y con qué proveedores.',
        'Tus derechos y cómo ejercerlos: consultas en 10 días hábiles y reclamos en 15.',
      ]}
    />
  )
}
