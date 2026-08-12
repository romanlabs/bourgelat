import { useAuthStore } from '@/store/authStore'
import { esSoloLectura } from '@/lib/suscripcion'

// Devuelve las props que deshabilitan un botón o formulario cuando la
// suscripción venció, con la explicación en el title para que el usuario
// entienda por qué no puede actuar.
//
// Esto es claridad para el usuario, no la barrera de seguridad: el backend
// rechaza toda mutación con 403 SUBSCRIPTION_READ_ONLY independientemente de
// lo que muestre la interfaz.
export const useSoloLectura = () => {
  const suscripcion = useAuthStore((state) => state.suscripcion)
  const soloLectura = esSoloLectura(suscripcion)

  return {
    soloLectura,
    propsAccion: soloLectura
      ? {
          disabled: true,
          title: 'Tu suscripción venció. Puedes consultar y exportar, pero no editar.',
        }
      : {},
  }
}
