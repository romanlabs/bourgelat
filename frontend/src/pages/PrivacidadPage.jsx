import PublicPageShell from '@/components/shared/PublicPageShell'
import {
  LegalHeader,
  LegalSection as Seccion,
  legalH3 as h3Class,
  legalLink,
  legalP as pClass,
  legalUl as ulClass,
} from '@/components/shared/LegalSection'
import {
  CORREO_LEGAL as CORREO,
  DOMICILIO,
  RESPONSABLES,
  TELEFONO_LEGAL as TELEFONO,
  VERSIONES_LEGALES,
} from '@/content/legal'

export default function PrivacidadPage() {
  const { version, vigencia } = VERSIONES_LEGALES.privacidad

  return (
    <PublicPageShell
      eyebrow="Legal"
      title="Política de tratamiento de datos personales"
      description="Cómo Bourgelat recolecta, usa, protege y conserva los datos personales, y cómo puedes ejercer tus derechos como titular."
    >
      <LegalHeader version={version} vigencia={vigencia} />

      <div className="grid gap-6">
        <Seccion numero={1} titulo="Quiénes somos">
          <p className={pClass}>
            Bourgelat es una plataforma de software para la gestión de clínicas veterinarias en Colombia,
            desarrollada y operada por las siguientes personas naturales, quienes actúan conjuntamente como
            responsables del tratamiento de los datos descritos en esta política:
          </p>
          <ul className={ulClass}>
            {RESPONSABLES.map((r) => (
              <li key={r.nombre}>
                {r.nombre} — {r.documento}
              </li>
            ))}
          </ul>
          <ul className={ulClass}>
            <li>Domicilio: {DOMICILIO}</li>
            <li>
              Correo electrónico: <a href={`mailto:${CORREO}`} className={legalLink}>{CORREO}</a>
            </li>
            <li>Teléfono: {TELEFONO}</li>
            <li>Sitio web: bourgelat.co</li>
          </ul>
          <p className={pClass}>
            Bourgelat opera de forma completamente digital y no cuenta con oficinas de atención presencial.
            Todas las consultas, solicitudes y reclamos se atienden a través del correo electrónico indicado,
            que es el canal oficial para efectos de esta política.
          </p>
        </Seccion>

        <Seccion numero={2} titulo="Marco legal y alcance">
          <p className={pClass}>
            Esta política se expide en cumplimiento de la Ley Estatutaria 1581 de 2012, el Decreto 1377 de 2013
            (compilado en el Decreto 1074 de 2015) y demás normas que las modifiquen o complementen.
          </p>
          <p className={pClass}>
            Bourgelat trata datos personales en dos calidades distintas, y es importante diferenciarlas:
          </p>
          <ul className={ulClass}>
            <li>
              <strong className="text-[#10263a]">Como responsable</strong>, respecto de los datos de las
              clínicas que contratan el servicio y de las personas que usan la plataforma (el equipo de cada
              clínica). Bourgelat decide sobre su tratamiento según esta política.
            </li>
            <li>
              <strong className="text-[#10263a]">Como encargado</strong>, respecto de los datos que cada
              clínica registra sobre sus propios clientes (propietarios de mascotas) y sus pacientes. En ese caso
              la clínica es la responsable del tratamiento y Bourgelat solo trata esos datos por cuenta de ella y
              según sus instrucciones (ver sección 5).
            </li>
          </ul>
        </Seccion>

        <Seccion numero={3} titulo="Datos que tratamos como responsables">
          <h3 className={h3Class}>De la clínica</h3>
          <ul className={ulClass}>
            <li>Nombre, nombre comercial, razón social, NIT y dígito de verificación.</li>
            <li>Correo electrónico, teléfono, dirección, ciudad, departamento y código postal.</li>
            <li>Información tributaria necesaria para la facturación electrónica y el logo de la clínica.</li>
            <li>Plan de suscripción, estado, fechas y referencias de pago.</li>
          </ul>

          <h3 className={h3Class}>De los usuarios de la plataforma (equipo de la clínica)</h3>
          <ul className={ulClass}>
            <li>Nombre, correo electrónico, teléfono, foto de perfil, cargo y rol dentro de la clínica.</li>
            <li>Número de tarjeta profesional, en el caso de médicos veterinarios.</li>
            <li>
              Contraseña, que se almacena únicamente de forma irreversible (hash); nadie en Bourgelat puede
              conocerla.
            </li>
            <li>
              Si el usuario inicia sesión con Google o Microsoft, el identificador de su cuenta en ese proveedor.
            </li>
            <li>
              Respuestas del cuestionario inicial (onboarding): cargo, WhatsApp de contacto, tipo y tamaño de la
              clínica, volumen de pacientes, objetivos y forma de gestión actual.
            </li>
          </ul>

          <h3 className={h3Class}>Datos técnicos y de uso</h3>
          <ul className={ulClass}>
            <li>Dirección IP y tipo de navegador asociados a las sesiones y a las acciones realizadas.</li>
            <li>
              Registro de auditoría de las acciones realizadas en la plataforma (qué se hizo, quién, cuándo y
              desde dónde).
            </li>
            <li>Fecha del último acceso e intentos fallidos de inicio de sesión.</li>
            <li>
              Tickets de soporte: asunto, mensajes, capturas de pantalla adjuntas y datos técnicos del momento
              del reporte (navegador, pantalla, sección de la aplicación y rol).
            </li>
          </ul>
        </Seccion>

        <Seccion numero={4} titulo="Finalidades del tratamiento">
          <p className={pClass}>Los datos descritos en la sección 3 se tratan para:</p>
          <ul className={ulClass}>
            <li>Crear y administrar la cuenta de la clínica y de sus usuarios, y prestar el servicio contratado.</li>
            <li>Autenticar a los usuarios, proteger las cuentas y prevenir accesos no autorizados o fraudes.</li>
            <li>Mantener la trazabilidad de las acciones realizadas dentro de la plataforma.</li>
            <li>
              Configurar y transmitir la facturación electrónica de la clínica ante la DIAN, cuando la clínica
              activa esa función.
            </li>
            <li>Gestionar la suscripción, su cobro y la facturación del servicio.</li>
            <li>Atender solicitudes de soporte y diagnosticar fallas técnicas.</li>
            <li>
              Enviar comunicaciones relacionadas con el servicio: verificación de correo, recuperación de
              contraseña, avisos de seguridad, cambios en el servicio o en esta política.
            </li>
            <li>
              Entender el perfil de la clínica a partir del cuestionario inicial para adaptar el acompañamiento
              durante la puesta en marcha y contactarla por los medios que haya indicado.
            </li>
            <li>
              Enviar novedades, promociones y actualizaciones de Bourgelat por correo electrónico,{' '}
              <strong className="text-[#10263a]">solo si el usuario lo autorizó</strong> de forma independiente
              al registrarse. Esta autorización es opcional, no condiciona el servicio y puede retirarse en
              cualquier momento.
            </li>
            <li>Mejorar el producto a partir de estadísticas agregadas de uso.</li>
            <li>Cumplir obligaciones legales, contables y tributarias, y atender requerimientos de autoridades.</li>
          </ul>
          <p className={pClass}>
            Bourgelat no vende ni cede datos personales a terceros con fines comerciales o publicitarios.
          </p>
        </Seccion>

        <Seccion numero={5} titulo="Datos que tratamos por cuenta de las clínicas">
          <p className={pClass}>
            Para prestar el servicio, las clínicas registran en Bourgelat información de sus clientes y
            pacientes, entre otros:
          </p>
          <ul className={ulClass}>
            <li>
              Propietarios de mascotas: nombre, tipo y número de documento, correo electrónico, teléfono,
              dirección, ciudad y, cuando se requiere facturación electrónica, datos tributarios.
            </li>
            <li>
              Mascotas y su información clínica: datos de identificación, historias clínicas, antecedentes,
              vacunas, exámenes de laboratorio, citas y servicios de estética.
            </li>
            <li>Facturas, abonos y pagos asociados a los servicios prestados por la clínica.</li>
          </ul>
          <p className={pClass}>Frente a estos datos:</p>
          <ul className={ulClass}>
            <li>
              La clínica es la responsable del tratamiento. Le corresponde contar con su propia política de
              tratamiento y obtener la autorización previa, expresa e informada de sus clientes.
            </li>
            <li>
              Bourgelat actúa como encargado: trata los datos únicamente para prestar el servicio a la clínica,
              no los usa para fines propios y no los comparte salvo con los proveedores indicados en la sección 7
              o cuando la ley lo exija.
            </li>
            <li>
              Si un propietario de mascota quiere consultar, actualizar o suprimir sus datos, debe dirigirse a su
              clínica. Si escribe a Bourgelat, trasladaremos la solicitud a la clínica correspondiente y le
              daremos el apoyo técnico necesario para atenderla.
            </li>
          </ul>
        </Seccion>

        <Seccion numero={6} titulo="Autorización">
          <p className={pClass}>
            Al crear una cuenta, la persona que se registra autoriza de manera previa, expresa e informada el
            tratamiento de sus datos según esta política, marcando una casilla que nunca viene seleccionada por
            defecto. Bourgelat conserva prueba de esa autorización: la versión de la política aceptada, la fecha
            y hora, la dirección IP y el navegador desde el que se otorgó. La autorización puede revocarse en
            cualquier momento, salvo cuando exista un deber legal o contractual de conservar la información;
            revocarla puede implicar que no sea posible seguir prestando el servicio.
          </p>
          <p className={pClass}>
            Bourgelat no solicita datos sensibles de los usuarios de la plataforma. La información de salud que se
            registra corresponde a los animales atendidos por la clínica y no a las personas titulares de los
            datos.
          </p>
        </Seccion>

        <Seccion numero={7} titulo="Proveedores y transferencia internacional">
          <p className={pClass}>
            Para operar el servicio, Bourgelat se apoya en proveedores que tratan datos en su nombre y bajo sus
            instrucciones:
          </p>
          <ul className={ulClass}>
            <li>
              <strong className="text-[#10263a]">Render</strong> — alojamiento de la aplicación, base de datos
              y archivos. Servidores ubicados en Estados Unidos (Oregón).
            </li>
            <li>
              <strong className="text-[#10263a]">Cloudflare</strong> — DNS, certificados de seguridad y
              protección contra ataques.
            </li>
            <li>
              <strong className="text-[#10263a]">Factus</strong> — proveedor tecnológico de facturación
              electrónica, que transmite las facturas a la DIAN.
            </li>
            <li>
              <strong className="text-[#10263a]">Google y Microsoft</strong> — solo si el usuario elige iniciar
              sesión con su cuenta de esos servicios.
            </li>
            <li>
              <strong className="text-[#10263a]">Proveedor de correo electrónico</strong> — envío de correos
              transaccionales (verificación, recuperación de contraseña, soporte).
            </li>
            <li>
              <strong className="text-[#10263a]">Pasarela de pagos</strong> — cuando se habilite el pago en
              línea de la suscripción. Bourgelat no almacena datos de tarjetas.
            </li>
          </ul>
          <p className={pClass}>
            Algunos de estos proveedores almacenan o procesan datos fuera de Colombia, en particular en Estados
            Unidos. Al aceptar esta política, el titular autoriza esta transmisión internacional, que se realiza
            con proveedores que ofrecen niveles adecuados de protección y únicamente para las finalidades aquí
            descritas.
          </p>
        </Seccion>

        <Seccion numero={8} titulo="Seguridad de la información">
          <p className={pClass}>Aplicamos, entre otras, las siguientes medidas:</p>
          <ul className={ulClass}>
            <li>Comunicación cifrada (HTTPS/TLS) entre el navegador y los servidores.</li>
            <li>
              Cifrado adicional en la base de datos de los datos de identificación y contacto de los propietarios
              de mascotas, de la información de pago y de las credenciales de integración con terceros.
            </li>
            <li>Contraseñas almacenadas con funciones de hash irreversibles.</li>
            <li>
              Aislamiento de la información entre clínicas: cada clínica solo accede a sus propios datos.
            </li>
            <li>Control de acceso por roles y bloqueo temporal ante intentos fallidos de inicio de sesión.</li>
            <li>Sesiones de corta duración y registro de auditoría de las acciones realizadas.</li>
            <li>Acceso a la infraestructura de producción restringido a los responsables del proyecto.</li>
          </ul>
          <p className={pClass}>
            Ningún sistema es completamente invulnerable. Si ocurre un incidente de seguridad que afecte datos
            personales, lo informaremos a las clínicas afectadas y a la Superintendencia de Industria y Comercio
            en los términos que exige la ley. Cada clínica es responsable de gestionar adecuadamente los usuarios,
            roles y credenciales de su equipo.
          </p>
        </Seccion>

        <Seccion numero={9} titulo="Conservación de los datos">
          <ul className={ulClass}>
            <li>
              Los datos de la clínica, de sus usuarios y los que la clínica registra se conservan mientras la
              suscripción esté vigente.
            </li>
            <li>
              Al terminar la relación, la clínica podrá solicitar la exportación de su información durante un
              plazo de [30] días. Vencido ese plazo, los datos se eliminarán, salvo aquellos que deban conservarse
              por obligación legal, contable o tributaria, durante el tiempo que dicha obligación exija.
            </li>
            <li>
              Los registros de auditoría de acciones exitosas se eliminan automáticamente a los 3 meses. Las
              sesiones expiran a los 7 días y los enlaces de verificación y recuperación de contraseña se eliminan
              una vez vencidos.
            </li>
          </ul>
        </Seccion>

        <Seccion numero={10} titulo="Derechos de los titulares">
          <p className={pClass}>Como titular de datos personales, tienes derecho a:</p>
          <ul className={ulClass}>
            <li>Conocer, actualizar y rectificar tus datos personales.</li>
            <li>Solicitar prueba de la autorización otorgada.</li>
            <li>Ser informado sobre el uso que se ha dado a tus datos.</li>
            <li>
              Revocar la autorización o solicitar la supresión de tus datos cuando no exista un deber legal o
              contractual de conservarlos.
            </li>
            <li>Acceder gratuitamente a tus datos personales.</li>
            <li>
              Presentar quejas ante la Superintendencia de Industria y Comercio, una vez agotado el trámite de
              consulta o reclamo ante Bourgelat.
            </li>
          </ul>
        </Seccion>

        <Seccion numero={11} titulo="Cómo ejercer tus derechos">
          <p className={pClass}>
            Envía tu solicitud a{' '}
            <a href={`mailto:${CORREO}`} className={legalLink}>{CORREO}</a> con el asunto
            &quot;Datos personales&quot;, indicando tu nombre completo, número de identificación, la descripción
            de lo que solicitas y un medio de respuesta. Podemos pedir información adicional para verificar tu
            identidad antes de responder.
          </p>
          <ul className={ulClass}>
            <li>
              <strong className="text-[#10263a]">Consultas</strong>: se responden en un máximo de 10 días
              hábiles, prorrogables por 5 días hábiles más, informando el motivo de la demora.
            </li>
            <li>
              <strong className="text-[#10263a]">Reclamos</strong> (corrección, actualización, supresión o
              incumplimiento): se responden en un máximo de 15 días hábiles, prorrogables por 8 días hábiles más.
              Si el reclamo está incompleto, te pediremos completarlo dentro de los 5 días siguientes; si pasan 2
              meses sin respuesta, se entenderá desistido.
            </li>
          </ul>
          <p className={pClass}>
            Si tu solicitud se refiere a datos que una clínica registró sobre ti como cliente, la trasladaremos a
            esa clínica según lo indicado en la sección 5.
          </p>
        </Seccion>

        <Seccion numero={12} titulo="Menores de edad">
          <p className={pClass}>
            Bourgelat es un servicio dirigido a clínicas veterinarias y sus profesionales. No está destinado a
            menores de edad ni recolecta intencionalmente sus datos como usuarios de la plataforma.
          </p>
        </Seccion>

        <Seccion numero={13} titulo="Cambios y vigencia">
          <p className={pClass}>
            Esta política rige desde la fecha indicada al inicio. Cualquier cambio sustancial se informará a las
            clínicas por correo electrónico o dentro de la plataforma antes de entrar en vigor. Los datos se
            tratarán durante el tiempo necesario para cumplir las finalidades aquí descritas.
          </p>
        </Seccion>
      </div>
    </PublicPageShell>
  )
}
