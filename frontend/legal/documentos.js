// Texto de los documentos legales de Bourgelat. De aquí sale el PDF formal
// (legal/generar.mjs); las páginas de la web solo lo enlazan.
//
// Cada documento es una lista de secciones { titulo, bloques }. Un bloque es
// un párrafo (string), { sub } (subtítulo), { lista: [...] } o
// { tabla: { columnas, filas } }. **texto** se escribe en negrita.

import {
  CORREO_LEGAL as CORREO,
  NOMBRES_RESPONSABLES,
  RESPONSABLES,
  SITIO_WEB,
  TELEFONO_LEGAL as TELEFONO,
} from '../src/content/legal.js'

const identificacion = ({ ciudad, direccion }) => [
  { lista: RESPONSABLES.map((r) => `**${r.nombre}**, identificado con ${r.documento}`) },
  {
    lista: [
      `**Domicilio:** ${ciudad}, Colombia`,
      `**Dirección de correspondencia:** ${direccion}`,
      `**Correo electrónico:** ${CORREO}`,
      `**Teléfono y WhatsApp:** ${TELEFONO}`,
      `**Sitio web:** ${SITIO_WEB}`,
    ],
  },
]

export const politicaDatos = (datos) => [
  {
    titulo: '¿Qué encontrarás en este documento?',
    bloques: [
      'Esta política te explica, de forma clara, cómo Bourgelat trata los datos personales:',
      {
        lista: [
          'Quién es el responsable de tus datos y cómo contactarlo.',
          'Qué datos recolectamos y para qué los usamos.',
          'Con quién los compartimos y cómo los protegemos.',
          'Cuáles son tus derechos y cómo ejercerlos, con los plazos de respuesta.',
        ],
      },
    ],
  },
  {
    titulo: '¿Quién es el responsable del tratamiento de tus datos?',
    bloques: [
      'Bourgelat es una plataforma de software para la gestión de clínicas veterinarias en Colombia, desarrollada y operada por las siguientes personas naturales, quienes actúan conjuntamente como responsables del tratamiento de los datos descritos en esta política (en adelante, "Bourgelat"):',
      ...identificacion(datos),
      'Bourgelat opera de forma digital y no cuenta con oficinas de atención presencial. El correo electrónico indicado es el canal oficial para consultas, solicitudes y reclamos sobre datos personales, y los responsables son quienes los atienden directamente.',
    ],
  },
  {
    titulo: '¿Qué normas aplican y en qué calidad actúa Bourgelat?',
    bloques: [
      'Esta política se expide en cumplimiento de la Ley Estatutaria 1581 de 2012, el Decreto 1377 de 2013 (compilado en el Decreto 1074 de 2015) y las demás normas que las modifiquen o complementen.',
      'Bourgelat trata datos personales en dos calidades distintas:',
      {
        lista: [
          '**Como responsable**, respecto de los datos de las clínicas que contratan el servicio y de las personas que usan la plataforma (el equipo de cada clínica). Bourgelat decide sobre su tratamiento según esta política.',
          '**Como encargado**, respecto de los datos que cada clínica registra sobre sus propios clientes (propietarios de mascotas) y sus pacientes. En ese caso la clínica es la responsable del tratamiento y Bourgelat solo trata esos datos por cuenta de ella y según sus instrucciones (ver sección 6).',
        ],
      },
    ],
  },
  {
    titulo: '¿Qué datos tratamos como responsables?',
    bloques: [
      { sub: 'De la clínica' },
      {
        lista: [
          'Nombre, nombre comercial, razón social, NIT y dígito de verificación.',
          'Correo electrónico, teléfono, dirección, ciudad, departamento y código postal.',
          'Información tributaria necesaria para la facturación electrónica y el logo de la clínica.',
          'Plan de suscripción, estado, fechas y referencias de pago.',
        ],
      },
      { sub: 'De los usuarios de la plataforma (equipo de la clínica)' },
      {
        lista: [
          'Nombre, correo electrónico, teléfono, foto de perfil, cargo y rol dentro de la clínica.',
          'Número de tarjeta profesional, en el caso de médicos veterinarios.',
          'Contraseña, que se almacena únicamente de forma irreversible (hash); nadie en Bourgelat puede conocerla.',
          'Si el usuario inicia sesión con Google, el identificador de su cuenta en ese proveedor.',
          'Respuestas del cuestionario inicial: cargo, WhatsApp de contacto, tipo y tamaño de la clínica, volumen de pacientes, objetivos y forma de gestión actual.',
        ],
      },
      { sub: 'Datos técnicos y de uso' },
      {
        lista: [
          'Dirección IP y tipo de navegador asociados a las sesiones y a las acciones realizadas.',
          'Registro de auditoría de las acciones realizadas en la plataforma (qué se hizo, quién, cuándo y desde dónde).',
          'Fecha del último acceso e intentos fallidos de inicio de sesión.',
          'Tickets de soporte: asunto, mensajes, capturas de pantalla adjuntas y datos técnicos del momento del reporte (navegador, pantalla, sección de la aplicación y rol).',
        ],
      },
    ],
  },
  {
    titulo: '¿Para qué usamos esos datos?',
    bloques: [
      'Los datos descritos en la sección 4 se tratan para:',
      {
        lista: [
          'Crear y administrar la cuenta de la clínica y de sus usuarios, y prestar el servicio contratado.',
          'Autenticar a los usuarios, proteger las cuentas y prevenir accesos no autorizados o fraudes.',
          'Mantener la trazabilidad de las acciones realizadas dentro de la plataforma.',
          'Configurar y transmitir la facturación electrónica de la clínica ante la DIAN, cuando la clínica activa esa función.',
          'Gestionar la suscripción, su cobro y la facturación del servicio.',
          'Atender solicitudes de soporte y diagnosticar fallas técnicas.',
          'Enviar comunicaciones relacionadas con el servicio: verificación de correo, recuperación de contraseña, recordatorios de pago, avisos de seguridad y cambios en el servicio o en esta política.',
          'Entender el perfil de la clínica a partir del cuestionario inicial para adaptar el acompañamiento durante la puesta en marcha y contactarla por los medios que haya indicado.',
          'Enviar novedades, promociones y actualizaciones de Bourgelat por correo electrónico, **solo si el usuario lo autorizó** de forma independiente al registrarse. Esta autorización es opcional, no condiciona el servicio y puede retirarse en cualquier momento.',
          'Mejorar el producto a partir de estadísticas agregadas de uso.',
          'Cumplir obligaciones legales, contables y tributarias, y atender requerimientos de autoridades.',
        ],
      },
      '**Bourgelat no vende ni cede datos personales a terceros** con fines comerciales o publicitarios.',
    ],
  },
  {
    titulo: '¿Qué datos tratamos por cuenta de las clínicas?',
    bloques: [
      'Para prestar el servicio, las clínicas registran en Bourgelat información de sus clientes y pacientes, entre otros:',
      {
        lista: [
          'Propietarios de mascotas: nombre, tipo y número de documento, correo electrónico, teléfono, dirección, ciudad y, cuando se requiere facturación electrónica, datos tributarios.',
          'Mascotas y su información clínica: datos de identificación, historias clínicas, antecedentes, vacunas, exámenes de laboratorio, citas y servicios de estética.',
          'Facturas, abonos y pagos asociados a los servicios prestados por la clínica.',
        ],
      },
      'Frente a estos datos:',
      {
        lista: [
          'La clínica es la responsable del tratamiento. Le corresponde contar con su propia política de tratamiento y obtener la autorización previa, expresa e informada de sus clientes.',
          'Bourgelat actúa como encargado: trata los datos únicamente para prestar el servicio a la clínica, no los usa para fines propios y no los comparte salvo con los proveedores indicados en la sección 8 o cuando la ley lo exija.',
          'Si un propietario de mascota quiere consultar, actualizar o suprimir sus datos, debe dirigirse a su clínica. Si escribe a Bourgelat, trasladaremos la solicitud a la clínica correspondiente y le daremos el apoyo técnico necesario para atenderla.',
        ],
      },
    ],
  },
  {
    titulo: '¿Cómo nos autorizas a tratar tus datos?',
    bloques: [
      'Al crear una cuenta, la persona que se registra autoriza de manera previa, expresa e informada el tratamiento de sus datos según esta política, marcando una casilla que nunca viene seleccionada por defecto. Bourgelat conserva prueba de esa autorización: la versión de la política aceptada, la fecha y hora, la dirección IP y el navegador desde el que se otorgó.',
      'La autorización puede revocarse en cualquier momento, salvo cuando exista un deber legal o contractual de conservar la información; revocarla puede implicar que no sea posible seguir prestando el servicio.',
      'Bourgelat no solicita datos sensibles de los usuarios de la plataforma. La información de salud que se registra corresponde a los animales atendidos por la clínica y no a las personas titulares de los datos.',
    ],
  },
  {
    titulo: '¿Con quién compartimos los datos?',
    bloques: [
      'Para operar el servicio, Bourgelat se apoya en proveedores que tratan datos en su nombre y bajo sus instrucciones:',
      {
        lista: [
          '**Render**: alojamiento de la aplicación, la base de datos y los archivos. Servidores ubicados en Estados Unidos (Oregón).',
          '**Cloudflare**: DNS, certificados de seguridad y protección contra ataques.',
          '**Brevo**: envío de correos del servicio (verificación, recuperación de contraseña, recordatorios y soporte).',
          '**Factus**: proveedor tecnológico de facturación electrónica, que transmite las facturas a la DIAN, cuando la clínica activa esa función.',
          '**Google**: solo si el usuario elige iniciar sesión con su cuenta de ese servicio.',
          '**Pasarela de pagos**: cuando se habilite el pago en línea de la suscripción. Bourgelat no almacena datos de tarjetas.',
        ],
      },
      'Algunos de estos proveedores almacenan o procesan datos fuera de Colombia, en particular en Estados Unidos. Al aceptar esta política, el titular autoriza esta transmisión internacional, que se realiza con proveedores que ofrecen niveles adecuados de protección y únicamente para las finalidades aquí descritas.',
    ],
  },
  {
    titulo: '¿Cómo protegemos los datos?',
    bloques: [
      'Aplicamos, entre otras, las siguientes medidas:',
      {
        lista: [
          'Comunicación cifrada (HTTPS/TLS) entre el navegador y los servidores.',
          'Cifrado adicional en la base de datos de los datos de identificación y contacto de los propietarios de mascotas, de la información de pago y de las credenciales de integración con terceros.',
          'Contraseñas almacenadas con funciones de hash irreversibles.',
          'Aislamiento de la información entre clínicas: cada clínica solo accede a sus propios datos.',
          'Control de acceso por roles y bloqueo temporal ante intentos fallidos de inicio de sesión.',
          'Sesiones de corta duración y registro de auditoría de las acciones realizadas.',
          'Acceso a la infraestructura de producción restringido a los responsables del proyecto.',
        ],
      },
      'Ningún sistema es completamente invulnerable. Si ocurre un incidente de seguridad que afecte datos personales, lo informaremos a las clínicas afectadas y a la Superintendencia de Industria y Comercio en los términos que exige la ley. Cada clínica es responsable de gestionar adecuadamente los usuarios, roles y credenciales de su equipo.',
    ],
  },
  {
    titulo: '¿Por cuánto tiempo conservamos los datos?',
    bloques: [
      {
        lista: [
          'Los datos de la clínica, de sus usuarios y los que la clínica registra se conservan mientras la suscripción esté vigente.',
          'Al terminar la relación, la clínica podrá solicitar la exportación de su información durante un plazo de 30 días. Vencido ese plazo, los datos se eliminarán, salvo aquellos que deban conservarse por obligación legal, contable o tributaria, durante el tiempo que dicha obligación exija.',
          'Los registros de auditoría de acciones exitosas se eliminan automáticamente a los 3 meses. Las sesiones expiran a los 7 días y los enlaces de verificación y recuperación de contraseña se eliminan una vez vencidos.',
        ],
      },
    ],
  },
  {
    titulo: '¿Cuáles son tus derechos como titular?',
    bloques: [
      'Como titular de datos personales, tienes derecho a:',
      {
        lista: [
          'Conocer, actualizar y rectificar tus datos personales.',
          'Solicitar prueba de la autorización otorgada.',
          'Ser informado sobre el uso que se ha dado a tus datos.',
          'Revocar la autorización o solicitar la supresión de tus datos cuando no exista un deber legal o contractual de conservarlos.',
          'Acceder gratuitamente a tus datos personales.',
          'Presentar quejas ante la Superintendencia de Industria y Comercio, una vez agotado el trámite de consulta o reclamo ante Bourgelat.',
        ],
      },
    ],
  },
  {
    titulo: '¿Cómo ejercer tus derechos?',
    bloques: [
      `Envía tu solicitud a **${CORREO}** con el asunto "Datos personales", indicando tu nombre completo, número de identificación, la descripción de lo que solicitas y un medio de respuesta. Podemos pedir información adicional para verificar tu identidad antes de responder. Las solicitudes las atienden directamente los responsables indicados en la sección 2.`,
      {
        lista: [
          '**Consultas**: se responden en un máximo de diez (10) días hábiles desde su recibo. Si no es posible en ese plazo, te informaremos el motivo y responderemos en un máximo de cinco (5) días hábiles adicionales.',
          '**Reclamos** (corrección, actualización, supresión, revocatoria o posible incumplimiento): se responden en un máximo de quince (15) días hábiles desde su recibo, prorrogables por ocho (8) días hábiles más, informando el motivo de la demora. Si el reclamo está incompleto, te pediremos completarlo dentro de los cinco (5) días hábiles siguientes; si pasan dos (2) meses sin respuesta, se entenderá desistido.',
        ],
      },
      'Si tu solicitud se refiere a datos que una clínica registró sobre ti como cliente, la trasladaremos a esa clínica según lo indicado en la sección 6.',
    ],
  },
  {
    titulo: '¿Qué pasa con los menores de edad?',
    bloques: [
      'Bourgelat es un servicio dirigido a clínicas veterinarias y sus profesionales. No está destinado a menores de edad ni recolecta intencionalmente sus datos como usuarios de la plataforma.',
    ],
  },
  {
    titulo: '¿Cómo te avisamos de cambios en esta política?',
    bloques: [
      'Cualquier cambio sustancial se publicará en bourgelat.co como una nueva versión de este documento y se informará a las clínicas por correo electrónico o dentro de la plataforma antes de entrar en vigor. Si el cambio se refiere a las finalidades del tratamiento, pediremos una nueva autorización, como lo exige el artículo 5 del Decreto 1377 de 2013.',
      'Las versiones anteriores se conservan publicadas, porque son las que aceptaron las clínicas en su momento.',
    ],
  },
  {
    titulo: 'Vigencia',
    bloques: [
      'Esta política rige desde la fecha indicada en la portada. Los datos se tratarán durante el tiempo necesario para cumplir las finalidades aquí descritas, según la sección 10.',
    ],
  },
  {
    titulo: 'Anexo: definiciones',
    bloques: [
      'Para efectos de esta política, y según el artículo 3 de la Ley 1581 de 2012:',
      {
        lista: [
          '**Titular**: persona natural cuyos datos personales son objeto de tratamiento.',
          '**Dato personal**: cualquier información vinculada o que pueda asociarse a una persona natural determinada o determinable.',
          '**Tratamiento**: cualquier operación sobre datos personales, como la recolección, almacenamiento, uso, circulación o supresión.',
          '**Responsable del tratamiento**: quien decide sobre la base de datos y el tratamiento de los datos.',
          '**Encargado del tratamiento**: quien trata datos personales por cuenta del responsable.',
          '**Autorización**: consentimiento previo, expreso e informado del titular para el tratamiento.',
          '**Transmisión**: comunicación de datos a un encargado, dentro o fuera de Colombia, para que los trate por cuenta del responsable.',
        ],
      },
    ],
  },
]

export const terminos = (datos) => [
  {
    titulo: 'Aceptación y partes',
    bloques: [
      `Estos términos regulan el uso de Bourgelat, una plataforma de software para la gestión de clínicas veterinarias, desarrollada y operada por ${NOMBRES_RESPONSABLES}, personas naturales que actúan conjuntamente (en adelante, "Bourgelat"):`,
      ...identificacion(datos),
      'Al crear una cuenta, la persona que la registra declara que es mayor de edad, que tiene facultades para obligar a la clínica o establecimiento que representa (en adelante, "la Clínica") y que acepta estos términos y la política de tratamiento de datos personales. Si no está de acuerdo, no debe usar el servicio.',
    ],
  },
  {
    titulo: 'Definiciones',
    bloques: [
      {
        lista: [
          '**Servicio**: la plataforma Bourgelat, accesible en bourgelat.co y app.bourgelat.co, con sus funciones de agenda, pacientes, historias clínicas, inventario, caja, facturación, reportes y las demás que se habiliten.',
          '**Clínica**: la persona natural o jurídica que contrata el Servicio para su establecimiento veterinario.',
          '**Usuarios**: las personas del equipo de la Clínica a quienes ella da acceso al Servicio.',
          '**Datos de la Clínica**: toda la información que la Clínica o sus Usuarios registran en el Servicio, incluidos los datos de sus clientes y pacientes.',
        ],
      },
    ],
  },
  {
    titulo: 'El servicio',
    bloques: [
      'Bourgelat se presta como software en la nube (SaaS): la Clínica accede a través de internet y no adquiere una copia del software. Bourgelat puede mejorar, modificar o retirar funciones con el tiempo, procurando no afectar de forma sustancial las funciones principales incluidas en el plan contratado.',
      'Bourgelat es una herramienta de gestión. **No presta servicios veterinarios, contables, tributarios ni legales**, y no reemplaza el criterio profesional de los médicos veterinarios ni la asesoría contable de la Clínica.',
    ],
  },
  {
    titulo: 'Cuenta, usuarios y credenciales',
    bloques: [
      {
        lista: [
          'La Clínica debe registrar información veraz, completa y actualizada.',
          'La Clínica decide quiénes son sus Usuarios, qué rol tiene cada uno y cuándo retirarles el acceso. Es responsable de las acciones que realicen sus Usuarios dentro del Servicio.',
          'Las credenciales son personales. La Clínica y sus Usuarios deben protegerlas y avisar de inmediato a Bourgelat si sospechan un acceso no autorizado.',
          'La Clínica garantiza que los veterinarios que registra cuentan con tarjeta profesional vigente cuando esta se registre en el Servicio.',
        ],
      },
    ],
  },
  {
    titulo: 'Planes, prueba y pagos',
    bloques: [
      {
        lista: [
          'Toda cuenta nueva inicia con un **periodo de prueba gratuito de 30 días** con acceso a las funciones del Servicio, sin necesidad de registrar un medio de pago.',
          'Los planes, precios, usuarios incluidos, el valor de los usuarios adicionales y los complementos (como la facturación electrónica DIAN) son los publicados en bourgelat.co/planes al momento de contratar. Los precios están expresados en pesos colombianos.',
          'La suscripción se paga por periodos anticipados (mensual o anual). La Clínica puede cancelarla en cualquier momento; la cancelación tiene efecto al final del periodo ya pagado y no genera devoluciones proporcionales, salvo lo que disponga la ley.',
          'Bourgelat puede modificar sus precios avisando a la Clínica con al menos 30 días de anticipación. El nuevo precio aplica desde el siguiente periodo de pago.',
          'Las condiciones de los planes personalizados o de cortesía se rigen por lo acordado por escrito con cada Clínica.',
        ],
      },
    ],
  },
  {
    titulo: 'Vencimiento de la suscripción',
    bloques: [
      'Si la prueba o la suscripción vencen sin renovarse, la cuenta pasa a **modo de solo lectura**: la Clínica conserva el acceso para consultar su información y descargar sus documentos, pero no puede crear ni modificar registros. El acceso completo se restablece al renovar.',
      'Si la cuenta permanece en solo lectura o cancelada por más de 90 días, Bourgelat avisará a la Clínica por correo y, pasados 30 días desde ese aviso, podrá eliminar los Datos de la Clínica según la sección 9.',
    ],
  },
  {
    titulo: 'Uso aceptable',
    bloques: [
      'La Clínica y sus Usuarios se comprometen a no:',
      {
        lista: [
          'Usar el Servicio para actividades ilícitas o para registrar información obtenida ilegalmente.',
          'Intentar acceder a datos de otras clínicas, a cuentas ajenas o a partes del sistema no autorizadas.',
          'Realizar ingeniería inversa, pruebas de intrusión o de carga no autorizadas, o interferir con el funcionamiento del Servicio.',
          'Suplantar a otras personas o compartir credenciales entre varias personas.',
          'Revender, sublicenciar o poner el Servicio a disposición de terceros ajenos a la Clínica.',
        ],
      },
    ],
  },
  {
    titulo: 'Responsabilidad profesional y tributaria de la Clínica',
    bloques: [
      {
        lista: [
          'El contenido de las historias clínicas, diagnósticos, tratamientos, fórmulas y demás registros profesionales es responsabilidad exclusiva de la Clínica y de los veterinarios que los elaboran.',
          'Cuando la Clínica activa la facturación electrónica, sigue siendo la responsable ante la DIAN de sus obligaciones tributarias: la veracidad de la información, su habilitación como facturadora, la resolución de numeración y las credenciales del proveedor tecnológico (Factus). Bourgelat transmite la información que la Clínica registra, pero no responde por rechazos, sanciones o errores derivados de datos incorrectos o de la operación de la DIAN o del proveedor tecnológico.',
          'La Clínica es responsable de conservar sus documentos contables y tributarios durante los plazos que exija la ley, para lo cual puede descargar sus facturas y el reporte de finanzas desde el Servicio.',
        ],
      },
    ],
  },
  {
    titulo: 'Los datos de la Clínica',
    bloques: [
      {
        lista: [
          '**Los Datos de la Clínica pertenecen a la Clínica.** Bourgelat no adquiere ningún derecho sobre ellos, salvo el necesario para prestar el Servicio.',
          `Mientras tenga acceso al Servicio, incluido el modo de solo lectura, la Clínica puede consultar su información, descargar en PDF sus historias clínicas y facturas, y exportar el reporte de finanzas. Además puede solicitar a Bourgelat una copia completa de sus datos escribiendo a ${CORREO}.`,
          'Al terminar la relación, la Clínica tendrá 30 días para solicitar la exportación de sus datos. Vencido ese plazo, Bourgelat los eliminará de sus sistemas activos, y de las copias de respaldo a medida que estas expiren, salvo lo que deba conservar por obligación legal.',
          'Bourgelat puede usar estadísticas agregadas y anonimizadas del uso del Servicio para mejorarlo, siempre que no permitan identificar a la Clínica, a sus Usuarios ni a sus clientes.',
        ],
      },
    ],
  },
  {
    titulo: 'Acuerdo de tratamiento de datos (encargo)',
    bloques: [
      'Respecto de los datos personales de los clientes de la Clínica (propietarios de mascotas) y demás titulares que la Clínica registre, **la Clínica es la responsable del tratamiento y Bourgelat actúa como encargado**, en los términos de la Ley 1581 de 2012 y el Decreto 1377 de 2013. Esta sección constituye el contrato de transmisión de datos personales entre ambas partes.',
      { sub: 'La Clínica se obliga a' },
      {
        lista: [
          'Contar con su propia política de tratamiento de datos personales.',
          'Obtener y conservar la autorización previa, expresa e informada de sus clientes para el tratamiento de sus datos, incluida su transmisión a Bourgelat y a los proveedores de este.',
          'Registrar en el Servicio solo los datos necesarios para las finalidades que ha informado.',
          'Atender las consultas y reclamos de sus clientes como responsable del tratamiento.',
        ],
      },
      { sub: 'Bourgelat se obliga a' },
      {
        lista: [
          'Tratar esos datos únicamente para prestar el Servicio a la Clínica y según sus instrucciones, sin usarlos para fines propios ni compartirlos con terceros, salvo lo previsto en esta sección o por orden de autoridad competente.',
          'Aplicar las medidas de seguridad descritas en la política de tratamiento de datos, y mantener el aislamiento de la información de cada Clínica.',
          'Guardar confidencialidad sobre esos datos, incluso después de terminada la relación.',
          'Informar a la Clínica, sin demora injustificada, de cualquier incidente de seguridad que afecte sus datos, y apoyarla en las gestiones ante la Superintendencia de Industria y Comercio.',
          'Trasladar a la Clínica las solicitudes que reciba directamente de sus clientes y darle el apoyo técnico necesario para atenderlas.',
          'Devolver y eliminar los datos al terminar la relación, según la sección 9.',
        ],
      },
      '**Subencargados.** La Clínica autoriza a Bourgelat a apoyarse en los proveedores listados en la política de tratamiento de datos (alojamiento, seguridad de red, correo, facturación electrónica y autenticación), algunos de los cuales tratan información fuera de Colombia. Bourgelat informará los cambios relevantes en esa lista.',
    ],
  },
  {
    titulo: 'Disponibilidad y soporte',
    bloques: [
      {
        lista: [
          'Bourgelat procura que el Servicio esté disponible de forma continua, pero no garantiza que funcione sin interrupciones ni errores. Puede haber mantenimientos programados, que se procurará hacer en horarios de bajo uso, y fallas de proveedores externos (alojamiento, internet, DIAN, Factus) fuera de su control.',
          `El soporte se presta a través de los tickets de soporte dentro de la plataforma y del correo ${CORREO}, en días hábiles. Los planes personalizados pueden incluir condiciones de soporte distintas acordadas por escrito.`,
        ],
      },
    ],
  },
  {
    titulo: 'Propiedad intelectual',
    bloques: [
      `El software, el diseño, la marca Bourgelat y los contenidos del Servicio pertenecen a ${NOMBRES_RESPONSABLES}. Estos términos otorgan a la Clínica un derecho de uso personal, no exclusivo e intransferible mientras la suscripción esté vigente, y no le transfieren ningún derecho de propiedad. Si la Clínica envía sugerencias o comentarios, Bourgelat puede usarlos para mejorar el Servicio sin obligación alguna.`,
    ],
  },
  {
    titulo: 'Limitación de responsabilidad',
    bloques: [
      {
        lista: [
          'Bourgelat responde por los daños directos causados por su culpa en la prestación del Servicio, hasta por el valor que la Clínica haya pagado en los tres (3) meses anteriores al hecho que origina el reclamo.',
          'Bourgelat no responde por lucro cesante, pérdida de oportunidades de negocio ni daños indirectos, ni por los perjuicios derivados del uso indebido del Servicio por parte de la Clínica o sus Usuarios, de la información que estos registren o de fallas de terceros.',
          'Estas limitaciones no aplican en caso de dolo o culpa grave, ni en lo que la ley no permita limitar.',
        ],
      },
    ],
  },
  {
    titulo: 'Suspensión y terminación',
    bloques: [
      {
        lista: [
          'La Clínica puede terminar la relación en cualquier momento cancelando su suscripción.',
          'Bourgelat puede suspender o terminar el acceso de una Clínica o de un Usuario que incumpla estos términos, en especial la sección 7, previo aviso cuando sea posible. Ante riesgos graves de seguridad, la suspensión puede ser inmediata.',
          'Si Bourgelat decide dejar de prestar el Servicio, avisará a las Clínicas con al menos 60 días de anticipación para que puedan exportar su información.',
        ],
      },
    ],
  },
  {
    titulo: 'Cambios a estos términos',
    bloques: [
      'Bourgelat puede actualizar estos términos. Los cambios sustanciales se publicarán como una nueva versión de este documento y se informarán por correo electrónico o dentro de la plataforma con al menos 15 días de anticipación. Si la Clínica continúa usando el Servicio después de la fecha de entrada en vigor, se entiende que los acepta; si no está de acuerdo, puede cancelar su suscripción.',
    ],
  },
  {
    titulo: 'Ley aplicable y controversias',
    bloques: [
      `Estos términos se rigen por las leyes de la República de Colombia. Las partes buscarán resolver cualquier diferencia de forma directa a través de ${CORREO}. Si no llegan a un acuerdo en 30 días, la controversia se someterá a los jueces competentes de ${datos.ciudad}.`,
    ],
  },
  {
    titulo: 'Contacto',
    bloques: [
      `Bourgelat opera de forma digital y no tiene oficinas de atención presencial. Todas las comunicaciones relacionadas con estos términos se atienden en ${CORREO} o al ${TELEFONO}.`,
    ],
  },
]

// Inventario real de lo que Bourgelat guarda en el navegador. Si se agrega
// una cookie o clave de almacenamiento nueva, debe listarse aquí.
const COOKIES = [
  ['bourgelat_access_token', 'Mantiene la sesión iniciada. No es accesible desde JavaScript (httpOnly).', '15 minutos'],
  ['bourgelat_refresh_token', 'Renueva la sesión sin volver a pedir la contraseña. No es accesible desde JavaScript (httpOnly).', '7 días'],
  ['bourgelat_oauth_flujo', 'Protege el inicio de sesión con Google mientras se completa.', '10 minutos'],
]

const ALMACENAMIENTO_LOCAL = [
  ['bourgelat-auth', 'Datos básicos de la sesión para mostrar la aplicación: usuario, clínica y estado de la suscripción.'],
  ['bourgelat-theme', 'Preferencia de tema claro u oscuro.'],
  ['agenda-view, agenda-view-prefs, agenda-sidebar-open', 'Preferencias de visualización de la agenda.'],
]

export const cookies = () => [
  {
    titulo: 'Resumen',
    bloques: [
      'Bourgelat solo usa cookies y almacenamiento local **estrictamente necesarios** para que puedas iniciar sesión y usar la plataforma de forma segura, y para recordar algunas preferencias de visualización. No usamos cookies de publicidad, no hacemos seguimiento entre sitios y actualmente no usamos herramientas de analítica.',
    ],
  },
  {
    titulo: 'Cookies que usamos',
    bloques: [
      'Se instalan solo cuando inicias sesión y se envían únicamente a los servidores de Bourgelat.',
      { tabla: { columnas: ['Nombre', 'Finalidad', 'Duración'], filas: COOKIES } },
    ],
  },
  {
    titulo: 'Almacenamiento local del navegador',
    bloques: [
      'Además de cookies, la aplicación guarda en el almacenamiento local (localStorage) de tu navegador la siguiente información. Permanece hasta que cierras sesión o la borras desde el navegador.',
      { tabla: { columnas: ['Nombre', 'Finalidad'], filas: ALMACENAMIENTO_LOCAL } },
    ],
  },
  {
    titulo: 'Cookies de terceros',
    bloques: [
      'Nuestro proveedor de seguridad de red, Cloudflare, puede instalar cookies técnicas para distinguir el tráfico legítimo de ataques automatizados. No se usan para identificarte ni con fines publicitarios.',
      'Si inicias sesión con Google, ese servicio aplica sus propias políticas de cookies mientras estás en sus páginas.',
    ],
  },
  {
    titulo: 'Cómo controlarlas',
    bloques: [
      {
        lista: [
          'Al cerrar sesión, Bourgelat elimina las cookies de sesión y los datos de sesión del almacenamiento local.',
          'Puedes borrar o bloquear cookies y almacenamiento local desde la configuración de tu navegador. Si bloqueas las cookies de sesión, no podrás iniciar sesión en la plataforma.',
        ],
      },
      'Como solo usamos elementos necesarios para el funcionamiento del servicio, no mostramos un banner de consentimiento. Si en el futuro incorporamos analítica u otras cookies no esenciales, actualizaremos esta política y te pediremos tu consentimiento antes de activarlas.',
    ],
  },
  {
    titulo: 'Más información',
    bloques: [
      `El tratamiento de los datos personales asociados se rige por nuestra política de tratamiento de datos personales, publicada en bourgelat.co/privacidad. Para cualquier pregunta, escríbenos a ${CORREO}.`,
    ],
  },
]
