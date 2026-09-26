import { Link } from 'react-router-dom'
import PublicPageShell from '@/components/shared/PublicPageShell'
import {
  CorreoLegal,
  LegalHeader,
  LegalSection,
  legalLink,
  legalP,
  legalUl,
} from '@/components/shared/LegalSection'
import { VERSIONES_LEGALES } from '@/content/legal'

// Inventario real de lo que Bourgelat guarda en el navegador. Si se agrega
// una cookie o clave de almacenamiento nueva, debe listarse aquí.
const COOKIES = [
  {
    nombre: 'bourgelat_access_token',
    finalidad: 'Mantiene la sesión iniciada. No es accesible desde JavaScript (httpOnly).',
    duracion: '15 minutos',
  },
  {
    nombre: 'bourgelat_refresh_token',
    finalidad: 'Renueva la sesión sin volver a pedir la contraseña. No es accesible desde JavaScript (httpOnly).',
    duracion: '7 días',
  },
  {
    nombre: 'bourgelat_oauth_flujo',
    finalidad: 'Protege el inicio de sesión con Google o Microsoft mientras se completa.',
    duracion: '10 minutos',
  },
]

const ALMACENAMIENTO_LOCAL = [
  {
    nombre: 'bourgelat-auth',
    finalidad: 'Datos básicos de la sesión para mostrar la aplicación: usuario, clínica y estado de la suscripción.',
  },
  {
    nombre: 'bourgelat-theme',
    finalidad: 'Preferencia de tema claro u oscuro.',
  },
  {
    nombre: 'agenda-view, agenda-view-prefs, agenda-sidebar-open',
    finalidad: 'Preferencias de visualización de la agenda.',
  },
]

function Tabla({ filas, conDuracion }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-[#d7e4ee]">
      <table className="w-full min-w-[520px] text-left text-sm">
        <thead className="bg-[#f4f7fb] text-[#10263a]">
          <tr>
            <th className="px-4 py-3 font-semibold">Nombre</th>
            <th className="px-4 py-3 font-semibold">Finalidad</th>
            {conDuracion && <th className="px-4 py-3 font-semibold">Duración</th>}
          </tr>
        </thead>
        <tbody className="text-[#51697d]">
          {filas.map((fila) => (
            <tr key={fila.nombre} className="border-t border-[#d7e4ee] align-top">
              <td className="px-4 py-3 font-mono text-xs text-[#10263a]">{fila.nombre}</td>
              <td className="px-4 py-3 leading-6">{fila.finalidad}</td>
              {conDuracion && <td className="whitespace-nowrap px-4 py-3">{fila.duracion}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function CookiesPage() {
  const { version, vigencia } = VERSIONES_LEGALES.cookies

  return (
    <PublicPageShell
      eyebrow="Legal"
      title="Política de cookies"
      description="Qué guarda Bourgelat en tu navegador, para qué lo usa y cómo puedes controlarlo."
    >
      <LegalHeader version={version} vigencia={vigencia} />

      <div className="grid gap-6">
        <LegalSection numero={1} titulo="Resumen">
          <p className={legalP}>
            Bourgelat solo usa cookies y almacenamiento local <strong className="text-[#10263a]">estrictamente
            necesarios</strong> para que puedas iniciar sesión y usar la plataforma de forma segura, y para
            recordar algunas preferencias de visualización. No usamos cookies de publicidad, no hacemos
            seguimiento entre sitios y actualmente no usamos herramientas de analítica.
          </p>
        </LegalSection>

        <LegalSection numero={2} titulo="Cookies que usamos">
          <p className={legalP}>
            Se instalan solo cuando inicias sesión y se envían únicamente a los servidores de Bourgelat.
          </p>
          <Tabla filas={COOKIES} conDuracion />
        </LegalSection>

        <LegalSection numero={3} titulo="Almacenamiento local del navegador">
          <p className={legalP}>
            Además de cookies, la aplicación guarda en el almacenamiento local (localStorage) de tu navegador la
            siguiente información. Permanece hasta que cierras sesión o la borras desde el navegador.
          </p>
          <Tabla filas={ALMACENAMIENTO_LOCAL} />
        </LegalSection>

        <LegalSection numero={4} titulo="Cookies de terceros">
          <p className={legalP}>
            Nuestro proveedor de seguridad de red, Cloudflare, puede instalar cookies técnicas para distinguir el
            tráfico legítimo de ataques automatizados. No se usan para identificarte ni con fines publicitarios.
          </p>
          <p className={legalP}>
            Si inicias sesión con Google o Microsoft, esos servicios aplican sus propias políticas de cookies
            mientras estás en sus páginas.
          </p>
        </LegalSection>

        <LegalSection numero={5} titulo="Cómo controlarlas">
          <ul className={legalUl}>
            <li>
              Al cerrar sesión, Bourgelat elimina las cookies de sesión y los datos de sesión del almacenamiento
              local.
            </li>
            <li>
              Puedes borrar o bloquear cookies y almacenamiento local desde la configuración de tu navegador. Si
              bloqueas las cookies de sesión, no podrás iniciar sesión en la plataforma.
            </li>
          </ul>
          <p className={legalP}>
            Como solo usamos elementos necesarios para el funcionamiento del servicio, no mostramos un banner de
            consentimiento. Si en el futuro incorporamos analítica u otras cookies no esenciales, actualizaremos
            esta política y te pediremos tu consentimiento antes de activarlas.
          </p>
        </LegalSection>

        <LegalSection numero={6} titulo="Más información">
          <p className={legalP}>
            El tratamiento de los datos personales asociados se rige por nuestra{' '}
            <Link to="/privacidad" className={legalLink}>
              política de tratamiento de datos personales
            </Link>
            . Para cualquier pregunta, escríbenos a <CorreoLegal />.
          </p>
        </LegalSection>
      </div>
    </PublicPageShell>
  )
}
