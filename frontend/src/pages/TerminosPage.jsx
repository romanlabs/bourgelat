import { Link } from 'react-router-dom'
import PublicPageShell from '@/components/shared/PublicPageShell'
import {
  CorreoLegal,
  LegalHeader,
  LegalSection,
  Strong,
  legalLink,
  legalP,
  legalUl,
} from '@/components/shared/LegalSection'
import {
  CIUDAD_JURISDICCION,
  NOMBRES_RESPONSABLES,
  RESPONSABLES,
  VERSIONES_LEGALES,
} from '@/content/legal'

export default function TerminosPage() {
  const { version, vigencia } = VERSIONES_LEGALES.terminos

  return (
    <PublicPageShell
      eyebrow="Legal"
      title="Términos y condiciones de uso"
      description="Las reglas que rigen el uso de Bourgelat, las responsabilidades de cada parte y el acuerdo de tratamiento de datos entre Bourgelat y cada clínica."
    >
      <LegalHeader version={version} vigencia={vigencia} />

      <div className="grid gap-6">
        <LegalSection numero={1} titulo="Aceptación y partes">
          <p className={legalP}>
            Estos términos regulan el uso de Bourgelat, una plataforma de software para la gestión de clínicas
            veterinarias, desarrollada y operada por {NOMBRES_RESPONSABLES}, personas naturales que actúan
            conjuntamente (en adelante, &quot;Bourgelat&quot;):
          </p>
          <ul className={legalUl}>
            {RESPONSABLES.map((r) => (
              <li key={r.nombre}>
                {r.nombre} — {r.documento}
              </li>
            ))}
          </ul>
          <p className={legalP}>
            Al crear una cuenta, la persona que la registra declara que es mayor de edad, que tiene facultades
            para obligar a la clínica o establecimiento que representa (en adelante, &quot;la Clínica&quot;) y que
            acepta estos términos y la{' '}
            <Link to="/privacidad" className={legalLink}>
              política de tratamiento de datos personales
            </Link>
            . Si no está de acuerdo, no debe usar el servicio.
          </p>
        </LegalSection>

        <LegalSection numero={2} titulo="Definiciones">
          <ul className={legalUl}>
            <li>
              <Strong>Servicio</Strong>: la plataforma Bourgelat, accesible en bourgelat.co y app.bourgelat.co,
              con sus funciones de agenda, pacientes, historias clínicas, inventario, caja, facturación, reportes
              y las demás que se habiliten.
            </li>
            <li>
              <Strong>Clínica</Strong>: la persona natural o jurídica que contrata el Servicio para su
              establecimiento veterinario.
            </li>
            <li>
              <Strong>Usuarios</Strong>: las personas del equipo de la Clínica a quienes ella da acceso al
              Servicio.
            </li>
            <li>
              <Strong>Datos de la Clínica</Strong>: toda la información que la Clínica o sus Usuarios registran
              en el Servicio, incluidos los datos de sus clientes y pacientes.
            </li>
          </ul>
        </LegalSection>

        <LegalSection numero={3} titulo="El servicio">
          <p className={legalP}>
            Bourgelat se presta como software en la nube (SaaS): la Clínica accede a través de internet y no
            adquiere una copia del software. Bourgelat puede mejorar, modificar o retirar funciones con el tiempo,
            procurando no afectar de forma sustancial las funciones principales incluidas en el plan contratado.
          </p>
          <p className={legalP}>
            Bourgelat es una herramienta de gestión. <Strong>No presta servicios veterinarios, contables,
            tributarios ni legales</Strong>, y no reemplaza el criterio profesional de los médicos veterinarios ni
            la asesoría contable de la Clínica.
          </p>
        </LegalSection>

        <LegalSection numero={4} titulo="Cuenta, usuarios y credenciales">
          <ul className={legalUl}>
            <li>La Clínica debe registrar información veraz, completa y actualizada.</li>
            <li>
              La Clínica decide quiénes son sus Usuarios, qué rol tiene cada uno y cuándo retirarles el acceso.
              Es responsable de las acciones que realicen sus Usuarios dentro del Servicio.
            </li>
            <li>
              Las credenciales son personales. La Clínica y sus Usuarios deben protegerlas y avisar de inmediato
              a Bourgelat si sospechan un acceso no autorizado.
            </li>
            <li>
              La Clínica garantiza que los veterinarios que registra cuentan con tarjeta profesional vigente
              cuando esta se registre en el Servicio.
            </li>
          </ul>
        </LegalSection>

        <LegalSection numero={5} titulo="Planes, prueba y pagos">
          <ul className={legalUl}>
            <li>
              Toda cuenta nueva inicia con un <Strong>periodo de prueba gratuito de 30 días</Strong> con acceso a
              las funciones del Servicio, sin necesidad de registrar un medio de pago.
            </li>
            <li>
              Los planes, precios, usuarios incluidos, el valor de los usuarios adicionales y los complementos
              (como la facturación electrónica DIAN) son los publicados en{' '}
              <Link to="/planes" className={legalLink}>
                bourgelat.co/planes
              </Link>{' '}
              al momento de contratar. Los precios están expresados en pesos colombianos. [Indicar si los precios
              incluyen o no impuestos, según el régimen tributario de los responsables.]
            </li>
            <li>
              La suscripción se paga por periodos anticipados (mensual o anual). La Clínica puede cancelarla en
              cualquier momento; la cancelación tiene efecto al final del periodo ya pagado y no genera
              devoluciones proporcionales, salvo lo que disponga la ley.
            </li>
            <li>
              Bourgelat puede modificar sus precios avisando a la Clínica con al menos 30 días de anticipación. El
              nuevo precio aplica desde el siguiente periodo de pago.
            </li>
            <li>
              Las condiciones de los planes personalizados o de cortesía se rigen por lo acordado por escrito
              con cada Clínica.
            </li>
          </ul>
        </LegalSection>

        <LegalSection numero={6} titulo="Vencimiento de la suscripción">
          <p className={legalP}>
            Si la prueba o la suscripción vencen sin renovarse, la cuenta pasa a <Strong>modo de solo
            lectura</Strong>: la Clínica conserva el acceso para consultar y exportar su información, pero no
            puede crear ni modificar registros. El acceso completo se restablece al renovar.
          </p>
          <p className={legalP}>
            Si la cuenta permanece en solo lectura o cancelada por más de [90] días, Bourgelat avisará a la
            Clínica por correo y, pasados [30] días desde ese aviso, podrá eliminar los Datos de la Clínica según
            la sección 9.
          </p>
        </LegalSection>

        <LegalSection numero={7} titulo="Uso aceptable">
          <p className={legalP}>La Clínica y sus Usuarios se comprometen a no:</p>
          <ul className={legalUl}>
            <li>Usar el Servicio para actividades ilícitas o para registrar información obtenida ilegalmente.</li>
            <li>
              Intentar acceder a datos de otras clínicas, a cuentas ajenas o a partes del sistema no autorizadas.
            </li>
            <li>
              Realizar ingeniería inversa, pruebas de intrusión o de carga no autorizadas, o interferir con el
              funcionamiento del Servicio.
            </li>
            <li>Suplantar a otras personas o compartir credenciales entre varias personas.</li>
            <li>Revender, sublicenciar o poner el Servicio a disposición de terceros ajenos a la Clínica.</li>
          </ul>
        </LegalSection>

        <LegalSection numero={8} titulo="Responsabilidad profesional y tributaria de la Clínica">
          <ul className={legalUl}>
            <li>
              El contenido de las historias clínicas, diagnósticos, tratamientos, fórmulas y demás registros
              profesionales es responsabilidad exclusiva de la Clínica y de los veterinarios que los elaboran.
            </li>
            <li>
              Cuando la Clínica activa la facturación electrónica, sigue siendo la responsable ante la DIAN de
              sus obligaciones tributarias: la veracidad de la información, su habilitación como facturadora, la
              resolución de numeración y las credenciales del proveedor tecnológico (Factus). Bourgelat
              transmite la información que la Clínica registra, pero no responde por rechazos, sanciones o
              errores derivados de datos incorrectos o de la operación de la DIAN o del proveedor tecnológico.
            </li>
            <li>
              La Clínica es responsable de conservar sus documentos contables y tributarios durante los plazos
              que exija la ley, para lo cual puede usar las funciones de exportación del Servicio.
            </li>
          </ul>
        </LegalSection>

        <LegalSection numero={9} titulo="Los datos de la Clínica">
          <ul className={legalUl}>
            <li>
              <Strong>Los Datos de la Clínica pertenecen a la Clínica.</Strong> Bourgelat no adquiere ningún
              derecho sobre ellos, salvo el necesario para prestar el Servicio.
            </li>
            <li>
              La Clínica puede exportar su información en cualquier momento mientras tenga acceso al Servicio,
              incluido el modo de solo lectura.
            </li>
            <li>
              Al terminar la relación, la Clínica tendrá [30] días para solicitar la exportación de sus datos.
              Vencido ese plazo, Bourgelat los eliminará de sus sistemas activos, y de las copias de respaldo a
              medida que estas expiren, salvo lo que deba conservar por obligación legal.
            </li>
            <li>
              Bourgelat puede usar estadísticas agregadas y anonimizadas del uso del Servicio para mejorarlo,
              siempre que no permitan identificar a la Clínica, a sus Usuarios ni a sus clientes.
            </li>
          </ul>
        </LegalSection>

        <LegalSection numero={10} titulo="Acuerdo de tratamiento de datos (encargo)">
          <p className={legalP}>
            Respecto de los datos personales de los clientes de la Clínica (propietarios de mascotas) y demás
            titulares que la Clínica registre, <Strong>la Clínica es la responsable del tratamiento y Bourgelat
            actúa como encargado</Strong>, en los términos de la Ley 1581 de 2012 y el Decreto 1377 de 2013. Esta
            sección constituye el contrato de transmisión de datos personales entre ambas partes.
          </p>

          <p className={legalP}>
            <Strong>La Clínica se obliga a:</Strong>
          </p>
          <ul className={legalUl}>
            <li>Contar con su propia política de tratamiento de datos personales.</li>
            <li>
              Obtener y conservar la autorización previa, expresa e informada de sus clientes para el
              tratamiento de sus datos, incluida su transmisión a Bourgelat y a los proveedores de este.
            </li>
            <li>Registrar en el Servicio solo los datos necesarios para las finalidades que ha informado.</li>
            <li>Atender las consultas y reclamos de sus clientes como responsable del tratamiento.</li>
          </ul>

          <p className={legalP}>
            <Strong>Bourgelat se obliga a:</Strong>
          </p>
          <ul className={legalUl}>
            <li>
              Tratar esos datos únicamente para prestar el Servicio a la Clínica y según sus instrucciones, sin
              usarlos para fines propios ni compartirlos con terceros, salvo lo previsto en esta sección o por
              orden de autoridad competente.
            </li>
            <li>
              Aplicar las medidas de seguridad descritas en la política de tratamiento de datos, y mantener el
              aislamiento de la información de cada Clínica.
            </li>
            <li>
              Guardar confidencialidad sobre esos datos, incluso después de terminada la relación.
            </li>
            <li>
              Informar a la Clínica, sin demora injustificada, de cualquier incidente de seguridad que afecte sus
              datos, y apoyarla en las gestiones ante la Superintendencia de Industria y Comercio.
            </li>
            <li>
              Trasladar a la Clínica las solicitudes que reciba directamente de sus clientes y darle el apoyo
              técnico necesario para atenderlas.
            </li>
            <li>Devolver y eliminar los datos al terminar la relación, según la sección 9.</li>
          </ul>

          <p className={legalP}>
            <Strong>Subencargados.</Strong> La Clínica autoriza a Bourgelat a apoyarse en los proveedores
            listados en la{' '}
            <Link to="/privacidad" className={legalLink}>
              política de tratamiento de datos
            </Link>{' '}
            (alojamiento, seguridad de red, facturación electrónica, autenticación y correo), algunos de los cuales
            tratan información fuera de Colombia. Bourgelat informará los cambios relevantes en esa lista.
          </p>
        </LegalSection>

        <LegalSection numero={11} titulo="Disponibilidad y soporte">
          <ul className={legalUl}>
            <li>
              Bourgelat procura que el Servicio esté disponible de forma continua, pero no garantiza que funcione
              sin interrupciones ni errores. Puede haber mantenimientos programados, que se procurará hacer en
              horarios de bajo uso, y fallas de proveedores externos (alojamiento, internet, DIAN, Factus) fuera
              de su control.
            </li>
            <li>
              El soporte se presta a través de los tickets de soporte dentro de la plataforma y del correo{' '}
              <CorreoLegal />, en días hábiles. Los planes personalizados pueden incluir condiciones de soporte
              distintas acordadas por escrito.
            </li>
          </ul>
        </LegalSection>

        <LegalSection numero={12} titulo="Propiedad intelectual">
          <p className={legalP}>
            El software, el diseño, la marca Bourgelat y los contenidos del Servicio pertenecen a{' '}
            {NOMBRES_RESPONSABLES}. Estos términos otorgan a la Clínica un derecho de uso personal, no exclusivo e
            intransferible mientras la suscripción esté vigente, y no le transfieren ningún derecho de propiedad.
            Si la Clínica envía sugerencias o comentarios, Bourgelat puede usarlos para mejorar el Servicio sin
            obligación alguna.
          </p>
        </LegalSection>

        <LegalSection numero={13} titulo="Limitación de responsabilidad">
          <ul className={legalUl}>
            <li>
              Bourgelat responde por los daños directos causados por su culpa en la prestación del Servicio,
              hasta por el valor que la Clínica haya pagado en los [tres (3)] meses anteriores al hecho que
              origina el reclamo.
            </li>
            <li>
              Bourgelat no responde por lucro cesante, pérdida de oportunidades de negocio ni daños indirectos,
              ni por los perjuicios derivados del uso indebido del Servicio por parte de la Clínica o sus
              Usuarios, de la información que estos registren o de fallas de terceros.
            </li>
            <li>
              Estas limitaciones no aplican en caso de dolo o culpa grave, ni en lo que la ley no permita
              limitar.
            </li>
          </ul>
        </LegalSection>

        <LegalSection numero={14} titulo="Suspensión y terminación">
          <ul className={legalUl}>
            <li>La Clínica puede terminar la relación en cualquier momento cancelando su suscripción.</li>
            <li>
              Bourgelat puede suspender o terminar el acceso de una Clínica o de un Usuario que incumpla estos
              términos, en especial la sección 7, previo aviso cuando sea posible. Ante riesgos graves de
              seguridad, la suspensión puede ser inmediata.
            </li>
            <li>
              Si Bourgelat decide dejar de prestar el Servicio, avisará a las Clínicas con al menos [60] días de
              anticipación para que puedan exportar su información.
            </li>
          </ul>
        </LegalSection>

        <LegalSection numero={15} titulo="Cambios a estos términos">
          <p className={legalP}>
            Bourgelat puede actualizar estos términos. Los cambios sustanciales se informarán por correo
            electrónico o dentro de la plataforma con al menos 15 días de anticipación. Si la Clínica continúa
            usando el Servicio después de la fecha de entrada en vigor, se entiende que los acepta; si no está
            de acuerdo, puede cancelar su suscripción.
          </p>
        </LegalSection>

        <LegalSection numero={16} titulo="Ley aplicable y controversias">
          <p className={legalP}>
            Estos términos se rigen por las leyes de la República de Colombia. Las partes buscarán resolver
            cualquier diferencia de forma directa a través de <CorreoLegal />. Si no llegan a un acuerdo en 30
            días, la controversia se someterá a los jueces competentes de {CIUDAD_JURISDICCION}.
          </p>
        </LegalSection>

        <LegalSection numero={17} titulo="Contacto">
          <p className={legalP}>
            Bourgelat opera de forma digital y no tiene oficinas de atención presencial. Todas las comunicaciones
            relacionadas con estos términos se atienden en <CorreoLegal />.
          </p>
        </LegalSection>
      </div>
    </PublicPageShell>
  )
}
