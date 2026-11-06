'use strict'

// Datos de la clínica de demostración local. Puro: sin BD ni azar, así el mismo
// día produce siempre los mismos registros. Todo es inventado (nombres, cédulas,
// teléfonos y correos con dominio .test); no hay datos de clínicas reales.
// Los datos se escriben con crearClinicaDemo.js.

const DOMINIO = 'losandes-demo.test'
const EMAIL_ADMIN = 'demo@bourgelat.test'

const sumarDias = (fecha, dias) => {
  const [anio, mes, dia] = fecha.split('-').map(Number)
  const resultado = new Date(Date.UTC(anio, mes - 1, dia + dias))
  return resultado.toISOString().slice(0, 10)
}

const restarMeses = (fecha, meses) => {
  const [anio, mes, dia] = fecha.split('-').map(Number)
  const resultado = new Date(Date.UTC(anio, mes - 1 - meses, Math.min(dia, 28)))
  return resultado.toISOString().slice(0, 10)
}

const minutos = (hora) => {
  const [h, m] = hora.split(':').map(Number)
  return h * 60 + m
}

const clinica = {
  nombre: 'Clínica Veterinaria Los Andes',
  nombreComercial: 'Clínica Veterinaria Los Andes',
  email: `contacto@${DOMINIO}`,
  telefono: '3105550140',
  direccion: 'Carrera 5 # 12-45, barrio Centro',
  ciudad: 'Neiva',
  departamento: 'Huila',
  tipoPersona: 'persona_juridica',
  horarioAtencion: {
    1: [{ inicio: '08:00', fin: '18:00' }],
    2: [{ inicio: '08:00', fin: '18:00' }],
    3: [{ inicio: '08:00', fin: '18:00' }],
    4: [{ inicio: '08:00', fin: '18:00' }],
    5: [{ inicio: '08:00', fin: '18:00' }],
    6: [{ inicio: '08:00', fin: '13:00' }],
  },
}

const consultorios = [
  { key: 'c1', nombre: 'Consultorio 1', descripcion: 'Consulta general y vacunación' },
  { key: 'c2', nombre: 'Consultorio 2', descripcion: 'Consulta, urgencias y estética' },
  { key: 'cx', nombre: 'Sala de cirugía', descripcion: 'Cirugías y procedimientos' },
]

const usuarios = [
  {
    key: 'admin',
    nombre: 'Catalina Ramírez Ortiz',
    email: EMAIL_ADMIN,
    rol: 'admin',
    rolesAdicionales: ['veterinario'],
    cargo: 'Médica veterinaria - directora',
    tarjetaProfesional: 'MV-10482',
    telefono: '3105550141',
  },
  {
    key: 'vet',
    nombre: 'Andrés Felipe Cabrera Núñez',
    email: `andres.cabrera@${DOMINIO}`,
    rol: 'veterinario',
    rolesAdicionales: [],
    cargo: 'Médico veterinario - cirugía',
    tarjetaProfesional: 'MV-11936',
    telefono: '3105550142',
  },
  {
    key: 'recep',
    nombre: 'Laura Daniela Pérez Castro',
    email: `laura.perez@${DOMINIO}`,
    rol: 'recepcionista',
    rolesAdicionales: [],
    cargo: 'Recepción y caja',
    tarjetaProfesional: null,
    telefono: '3105550143',
  },
]

const propietario = (key, nombre, documento, telefono, correo, direccion, barrio) => ({
  key,
  nombre,
  tipoDocumento: 'CC',
  numeroDocumento: documento,
  telefono,
  email: correo,
  direccion,
  barrio,
  ciudad: 'Neiva',
})

const propietarios = [
  propietario('p1', 'Martha Lucía Cuéllar Perdomo', '1075000101', '3005550101', `martha.cuellar@${DOMINIO}`, 'Calle 21 # 8-30', 'Cálamo'),
  propietario('p2', 'Jhon Fredy Trujillo Vargas', '1075000102', '3005550102', `jhon.trujillo@${DOMINIO}`, 'Carrera 7 # 30-12', 'Las Granjas'),
  propietario('p3', 'Diana Carolina Salazar Rincón', '1075000103', '3005550103', `diana.salazar@${DOMINIO}`, 'Calle 9 # 15-60', 'Altico'),
  propietario('p4', 'Carlos Eduardo Medina Rojas', '1075000104', '3005550104', `carlos.medina@${DOMINIO}`, 'Carrera 14 # 4-80', 'Los Pinos'),
  propietario('p5', 'Yuliana Andrea Ardila Ortiz', '1075000105', '3005550105', `yuliana.ardila@${DOMINIO}`, 'Calle 38 # 5-22', 'Cándido'),
  propietario('p6', 'Hernán Darío Polanía Bahamón', '1075000106', '3005550106', `hernan.polania@${DOMINIO}`, 'Carrera 2 # 18-40', 'Quirinal'),
  propietario('p7', 'Sandra Milena Ibarra Lozano', '1075000107', '3005550107', `sandra.ibarra@${DOMINIO}`, 'Calle 11 # 22-18', 'Cámbulos'),
  propietario('p8', 'Luis Alberto Gómez Charry', '1075000108', '3005550108', `luis.gomez@${DOMINIO}`, 'Carrera 16 # 29-05', 'Mártires'),
  propietario('p9', 'Paola Andrea Rojas Cabrera', '1075000109', '3005550109', `paola.rojas@${DOMINIO}`, 'Calle 26 # 4-70', 'Santa Inés'),
  propietario('p10', 'Jairo Antonio Silva Murcia', '1075000110', '3005550110', `jairo.silva@${DOMINIO}`, 'Carrera 5 # 40-15', 'Granada'),
]

// edadMeses se convierte en fechaNacimiento respecto a la fecha de hoy.
const mascota = (key, propietarioKey, nombre, especie, raza, sexo, edadMeses, peso, color, esterilizado) => ({
  key, propietarioKey, nombre, especie, raza, sexo, edadMeses, peso, color, esterilizado,
})

const mascotasBase = [
  mascota('luna', 'p1', 'Luna', 'perro', 'French poodle', 'hembra', 36, 7.2, 'Blanco', true),
  mascota('toby', 'p2', 'Toby', 'perro', 'Criollo', 'macho', 72, 14.0, 'Café con blanco', true),
  mascota('mia', 'p3', 'Mía', 'gato', 'Doméstico de pelo corto', 'hembra', 24, 3.8, 'Carey', true),
  mascota('rocky', 'p4', 'Rocky', 'perro', 'Labrador retriever', 'macho', 48, 31.5, 'Chocolate', false),
  mascota('bruno', 'p4', 'Bruno', 'perro', 'Schnauzer miniatura', 'macho', 60, 8.4, 'Sal y pimienta', true),
  mascota('canela', 'p5', 'Canela', 'perro', 'Criollo', 'hembra', 84, 18.0, 'Canela', true),
  mascota('frida', 'p5', 'Frida', 'gato', 'Siamés', 'hembra', 14, 3.1, 'Crema y marrón', false),
  mascota('simon', 'p6', 'Simón', 'gato', 'Europeo común', 'macho', 36, 4.9, 'Gris atigrado', true),
  mascota('max', 'p6', 'Max', 'perro', 'Pastor alemán', 'macho', 72, 34.0, 'Negro y fuego', false),
  mascota('nala', 'p7', 'Nala', 'perro', 'Bulldog francés', 'hembra', 24, 11.0, 'Beige', false),
  mascota('chispa', 'p8', 'Chispa', 'perro', 'Criollo', 'macho', 4, 6.0, 'Negro con patas blancas', false),
  mascota('zeus', 'p8', 'Zeus', 'perro', 'Rottweiler', 'macho', 36, 42.0, 'Negro y fuego', false),
  mascota('kira', 'p9', 'Kira', 'perro', 'Golden retriever', 'hembra', 36, 28.0, 'Dorado', false),
  mascota('coco', 'p9', 'Coco', 'perro', 'French poodle', 'macho', 96, 6.4, 'Albaricoque', true),
  mascota('pepe', 'p10', 'Pepe', 'roedor', 'Hámster sirio', 'macho', 12, 0.15, 'Dorado', null),
  mascota('tomas', 'p10', 'Tomás', 'conejo', 'Cabeza de león', 'macho', 26, 1.9, 'Gris', true),
]

const cita = (key, hora, fin, consultorio, vet, mascotaKey, tipoCita, motivo, estado, extra = {}) => ({
  key, horaInicio: hora, horaFin: fin, consultorioKey: consultorio, veterinarioKey: vet,
  mascotaKey, tipoCita, motivo, estado, ...extra,
})

const citasBase = [
  cita('a1', '08:00', '08:30', 'c1', 'admin', 'luna', 'vacunacion', 'Vacunación anual (óctuple)', 'completada'),
  cita('a2', '08:30', '09:00', 'c1', 'admin', 'toby', 'control', 'Control de peso y revisión dental', 'completada'),
  cita('a3', '09:00', '09:30', 'c1', 'admin', 'mia', 'consulta_general', 'Vómito ocasional desde hace tres días', 'completada'),
  cita('a4', '10:00', '10:30', 'c1', 'admin', 'rocky', 'consulta_general', 'Picazón y enrojecimiento en las patas', 'en_atencion', { horaLlegada: '09:50', horaInicioAtencion: '10:02' }),
  cita('a5', '10:30', '11:00', 'c1', 'admin', 'canela', 'control', 'Control postoperatorio, retiro de puntos', 'en_espera', { horaLlegada: '10:20' }),
  cita('a6', '11:30', '12:00', 'c1', 'admin', 'simon', 'vacunacion', 'Vacuna triple felina y refuerzo', 'programada'),
  cita('a7', '14:30', '15:00', 'c1', 'admin', 'bruno', 'desparasitacion', 'Desparasitación y antipulgas', 'programada'),
  cita('a8', '16:00', '16:30', 'c1', 'admin', 'frida', 'consulta_general', 'Primera consulta, plan de vacunación', 'programada'),
  cita('b1', '09:00', '09:30', 'c2', 'vet', 'max', 'consulta_general', 'Cojera en la pata trasera derecha', 'completada'),
  cita('b2', '09:30', '11:00', 'cx', 'vet', 'nala', 'cirugia', 'Esterilización (ovariohisterectomía)', 'en_atencion', { horaLlegada: '08:45', horaInicioAtencion: '09:35' }),
  cita('b3', '11:00', '11:30', 'c2', 'vet', 'chispa', 'urgencia', 'Diarrea y decaimiento, cachorro sin vacunar', 'en_espera', { origen: 'walk_in', horaLlegada: '10:50' }),
  cita('b4', '12:00', '12:30', 'c2', 'vet', 'pepe', 'consulta_general', 'Revisión por pérdida de apetito', 'cancelada', { motivoCancelacion: 'El tutor reprogramó para la próxima semana' }),
  cita('b5', '13:00', '14:30', 'cx', 'vet', 'kira', 'cirugia', 'Cirugía programada: extracción de masa cutánea', 'programada'),
  cita('b6', '15:00', '16:00', 'c2', 'vet', 'coco', 'peluqueria', 'Baño medicado con clorhexidina', 'programada'),
  cita('b7', '16:30', '17:00', 'c2', 'vet', 'zeus', 'radiografia', 'Radiografía de cadera, control de displasia', 'programada'),
]

// Evoluciones de varias consultas. diasAtras se resta a la fecha de hoy.
const historia = (key, mascotaKey, veterinarioKey, diasAtras, hora, datos) => ({
  key, mascotaKey, veterinarioKey, diasAtras, hora, bloqueada: true, ...datos,
})

const historiasBase = [
  historia('h-rocky-1', 'rocky', 'admin', 250, '10:15', {
    motivoConsulta: 'Sacude la cabeza y se rasca la oreja derecha desde hace una semana',
    anamnesis: 'El tutor refiere mal olor y secreción oscura en el oído derecho. Baños frecuentes en el río los fines de semana.',
    peso: 30.2, temperatura: 38.6, frecuenciaCardiaca: 96, frecuenciaRespiratoria: 24, condicionCorporal: 3,
    mucosas: 'Rosadas, húmedas', estadoHidratacion: 'normal',
    examenFisicoDetalle: 'Conducto auditivo derecho eritematoso con cerumen oscuro y olor fétido. Dolor a la palpación del pabellón.',
    diagnostico: 'Otitis externa derecha',
    tratamiento: 'Limpieza del conducto y gotas óticas por 10 días.',
    medicamentos: [
      { nombre: 'Gotas óticas con antibiótico y antimicótico', dosis: '5 gotas', via: 'otica', frecuencia: 'Cada 12 horas', duracion: '10 días', cantidad: 1, indicacion: 'Aplicar en el oído derecho tras limpiar' },
    ],
    indicaciones: 'Secar bien el oído después de cada baño. Volver a control en 14 días.',
    proximaEnDias: 14,
  }),
  historia('h-rocky-2', 'rocky', 'admin', 236, '09:40', {
    motivoConsulta: 'Control de otitis externa derecha',
    anamnesis: 'Completó el tratamiento. Ya no se rasca ni sacude la cabeza.',
    peso: 30.4, temperatura: 38.4, frecuenciaCardiaca: 92, frecuenciaRespiratoria: 22, condicionCorporal: 3,
    mucosas: 'Rosadas, húmedas', estadoHidratacion: 'normal',
    examenFisicoDetalle: 'Conducto auditivo limpio, sin eritema ni secreción.',
    diagnostico: 'Otitis externa resuelta',
    tratamiento: 'Sin tratamiento adicional. Limpieza preventiva mensual.',
    medicamentos: [],
    indicaciones: 'Limpiador ótico una vez al mes y después de baños en el río.',
    proximaEnDias: null,
  }),
  historia('h-rocky-3', 'rocky', 'admin', 95, '11:00', {
    motivoConsulta: 'Lame y muerde las patas, enrojecimiento entre los dedos',
    anamnesis: 'Empezó hace un mes, coincide con el cambio de alimento. Se lame sobre todo de noche.',
    peso: 31.0, temperatura: 38.5, frecuenciaCardiaca: 94, frecuenciaRespiratoria: 24, condicionCorporal: 4,
    mucosas: 'Rosadas, húmedas', estadoHidratacion: 'normal',
    examenFisicoDetalle: 'Eritema interdigital en las cuatro patas, pelo manchado por saliva. Sin lesiones abiertas.',
    diagnosticoPresuntivo: 'Alergia alimentaria',
    diagnostico: 'Dermatitis alérgica',
    tratamiento: 'Antiinflamatorio corto, baño con clorhexidina y dieta de eliminación por 8 semanas.',
    medicamentos: [
      { nombre: 'Prednisolona', concentracion: '20 mg', dosis: '1/2 tableta', via: 'oral', frecuencia: 'Cada 24 horas', duracion: '7 días', cantidad: 4, indicacion: 'Con la comida' },
    ],
    indicaciones: 'Dieta hipoalergénica estricta, sin premios ni sobras. Control en 8 semanas.',
    proximaEnDias: 56,
  }),
  historia('h-rocky-4', 'rocky', 'admin', 40, '10:30', {
    motivoConsulta: 'Control de dermatitis alérgica tras dieta de eliminación',
    anamnesis: 'Cumplió la dieta. Casi no se lame las patas; mejoró el pelaje.',
    peso: 31.5, temperatura: 38.4, frecuenciaCardiaca: 90, frecuenciaRespiratoria: 22, condicionCorporal: 4,
    mucosas: 'Rosadas, húmedas', estadoHidratacion: 'normal',
    examenFisicoDetalle: 'Sin eritema interdigital. Piel sin lesiones.',
    diagnostico: 'Dermatitis alérgica controlada',
    tratamiento: 'Mantener el alimento actual. Suplemento de omega 3 por 3 meses.',
    medicamentos: [
      { nombre: 'Omega 3 en cápsulas', dosis: '1 cápsula', via: 'oral', frecuencia: 'Cada 24 horas', duracion: '90 días', cantidad: 90, indicacion: 'Con la comida principal' },
    ],
    indicaciones: 'Reintroducir proteínas de a una, con 15 días entre cada una, y avisar si reaparece la picazón.',
    proximaEnDias: 90,
  }),
  historia('h-canela-1', 'canela', 'vet', 22, '14:00', {
    motivoConsulta: 'Nódulo en la glándula mamaria, cirugía de resección',
    anamnesis: 'La tutora notó el nódulo hace dos meses; creció de tamaño. Sin otros síntomas.',
    peso: 18.2, temperatura: 38.3, frecuenciaCardiaca: 100, frecuenciaRespiratoria: 26, condicionCorporal: 3,
    mucosas: 'Rosadas', estadoHidratacion: 'normal',
    examenFisicoDetalle: 'Nódulo firme de 2 cm en la mama inguinal derecha, móvil, sin ulceración.',
    diagnostico: 'Neoplasia mamaria (pendiente de patología)',
    tratamiento: 'Resección quirúrgica del nódulo con envío a patología. Analgesia y antibiótico.',
    medicamentos: [
      { nombre: 'Meloxicam', concentracion: '1,5 mg/ml', dosis: '0,2 mg/kg', via: 'oral', frecuencia: 'Cada 24 horas', duracion: '5 días', cantidad: 1, indicacion: 'Con la comida' },
      { nombre: 'Amoxicilina con ácido clavulánico', concentracion: '250 mg', dosis: '1 tableta', via: 'oral', frecuencia: 'Cada 12 horas', duracion: '7 días', cantidad: 14, indicacion: 'Completar el tratamiento' },
    ],
    indicaciones: 'Collar isabelino por 10 días. Mantener la herida seca. Retiro de puntos en 14 días.',
    proximaEnDias: 14,
  }),
  historia('h-toby-1', 'toby', 'admin', 60, '16:10', {
    motivoConsulta: 'Vómito y diarrea desde ayer',
    anamnesis: 'Comió sobras de asado en una reunión familiar. Un episodio de vómito y tres de diarrea.',
    peso: 14.6, temperatura: 39.1, frecuenciaCardiaca: 112, frecuenciaRespiratoria: 28, condicionCorporal: 3,
    mucosas: 'Rosadas, algo pegajosas', estadoHidratacion: 'deshidratacion_leve',
    examenFisicoDetalle: 'Abdomen levemente doloroso a la palpación. Sin cuerpos extraños palpables.',
    diagnostico: 'Gastroenteritis aguda',
    tratamiento: 'Fluidoterapia subcutánea, protector gástrico y dieta blanda por 3 días.',
    medicamentos: [
      { nombre: 'Omeprazol', concentracion: '20 mg', dosis: '1/2 cápsula', via: 'oral', frecuencia: 'Cada 24 horas', duracion: '5 días', cantidad: 3, indicacion: 'En ayunas' },
    ],
    indicaciones: 'Pollo cocido y arroz en porciones pequeñas. Agua fresca siempre disponible.',
    proximaEnDias: 7,
  }),
  historia('h-toby-2', 'toby', 'admin', 52, '09:20', {
    motivoConsulta: 'Control de gastroenteritis',
    anamnesis: 'Sin vómito desde hace cuatro días, heces normales, apetito recuperado.',
    peso: 14.4, temperatura: 38.5, frecuenciaCardiaca: 96, frecuenciaRespiratoria: 22, condicionCorporal: 3,
    mucosas: 'Rosadas, húmedas', estadoHidratacion: 'normal',
    examenFisicoDetalle: 'Abdomen blando, sin dolor.',
    diagnostico: 'Gastroenteritis resuelta',
    tratamiento: 'Alta. Volver a la dieta habitual de forma gradual.',
    medicamentos: [],
    indicaciones: 'Evitar sobras de la mesa.',
    proximaEnDias: null,
  }),
  historia('h-mia-hoy', 'mia', 'admin', 0, '09:20', {
    citaKey: 'a3',
    motivoConsulta: 'Vómito ocasional desde hace tres días',
    anamnesis: 'Vomita bolas de pelo y a veces espuma. Mantiene el apetito y la actividad.',
    peso: 3.8, temperatura: 38.7, frecuenciaCardiaca: 168, frecuenciaRespiratoria: 30, condicionCorporal: 3,
    mucosas: 'Rosadas, húmedas', estadoHidratacion: 'normal',
    examenFisicoDetalle: 'Abdomen blando e indoloro. Pelaje abundante con nudos en el lomo.',
    diagnostico: 'Tricobezoares (bolas de pelo)',
    tratamiento: 'Malta laxante y cepillado diario.',
    medicamentos: [
      { nombre: 'Pasta laxante para gatos', dosis: '2 cm', via: 'oral', frecuencia: 'Cada 24 horas', duracion: '5 días', cantidad: 1, indicacion: 'Directo del tubo' },
    ],
    indicaciones: 'Cepillar a diario. Consultar si el vómito continúa más de una semana.',
    proximaEnDias: 21,
  }),
]

// Productos del inventario de ventas. `stockInicial` es lo que había al abrir
// hoy; el stock final descuenta lo vendido en `ventasBase`.
const producto = (key, nombre, categoria, unidadMedida, precioCompra, precioVenta, stockInicial, stockMinimo, extra = {}) => ({
  key, nombre, categoria, unidadMedida, precioCompra, precioVenta, stockInicial, stockMinimo, ...extra,
})

const productosBase = [
  producto('vac_octuple', 'Vacuna óctuple canina', 'vacuna', 'dosis', 38000, 75000, 24, 10, { laboratorio: 'Laboratorios Andina Vet', lote: 'VC-2406', vencEnDias: 210 }),
  producto('vac_rabia', 'Vacuna antirrábica', 'vacuna', 'dosis', 14000, 35000, 18, 8, { laboratorio: 'Laboratorios Andina Vet', lote: 'AR-2407', vencEnDias: 300 }),
  producto('vac_triple_felina', 'Vacuna triple felina', 'vacuna', 'dosis', 32000, 68000, 6, 8, { laboratorio: 'Laboratorios Andina Vet', lote: 'TF-2405', vencEnDias: 25 }),
  producto('antipulgas', 'Antipulgas en pipeta perros 10-25 kg', 'antiparasitario', 'pipeta', 22000, 45000, 16, 6, { laboratorio: 'Biofarma Vet', lote: 'AP-3321', vencEnDias: 420 }),
  producto('desparasitante', 'Desparasitante oral (praziquantel y pirantel)', 'antiparasitario', 'tableta', 3500, 8000, 42, 20, { laboratorio: 'Biofarma Vet', lote: 'DS-1180', vencEnDias: 380 }),
  producto('collar', 'Collar antipulgas 8 meses', 'antiparasitario', 'unidad', 30000, 58000, 4, 5, { laboratorio: 'Biofarma Vet', lote: 'CA-0912', vencEnDias: 500 }),
  producto('alim_adulto', 'Alimento perro adulto 15 kg', 'alimento', 'bulto', 135000, 168000, 6, 3, { laboratorio: 'Nutrimascotas', lote: 'AL-4410', vencEnDias: 240 }),
  producto('alim_cachorro', 'Alimento cachorro razas medianas 8 kg', 'alimento', 'bulto', 92000, 118000, 3, 3, { laboratorio: 'Nutrimascotas', lote: 'AC-4412', vencEnDias: 200 }),
  producto('alim_gato', 'Alimento gato adulto 3 kg', 'alimento', 'bolsa', 38000, 52000, 10, 4, { laboratorio: 'Nutrimascotas', lote: 'AG-4415', vencEnDias: 260 }),
  producto('meloxicam', 'Meloxicam solución oral 20 ml', 'medicamento', 'frasco', 28000, 48000, 4, 4, { laboratorio: 'Laboratorios Andina Vet', lote: 'ML-7731', vencEnDias: 90, requiereFormula: true }),
  producto('amoxi', 'Amoxicilina con ácido clavulánico 250 mg', 'medicamento', 'caja x 20 tabletas', 42000, 72000, 12, 5, { laboratorio: 'Laboratorios Andina Vet', lote: 'AM-5520', vencEnDias: 330, requiereFormula: true }),
  producto('suero', 'Solución salina 0,9 % bolsa 500 ml', 'insumo', 'bolsa', 6500, 14000, 30, 12, { laboratorio: 'Insumos Médicos del Sur', lote: 'SS-2201', vencEnDias: 450 }),
  producto('shampoo', 'Shampoo de clorhexidina 250 ml', 'accesorio', 'frasco', 24000, 42000, 8, 4, { laboratorio: 'Biofarma Vet', lote: 'SH-6603', vencEnDias: 600 }),
  producto('omega', 'Suplemento omega 3 y 6, 60 cápsulas', 'suplemento', 'frasco', 36000, 62000, 9, 3, { laboratorio: 'Nutrimascotas', lote: 'OM-8102', vencEnDias: 540 }),
]

// Ventas de hoy en el turno abierto. Cada ítem es un producto (key) o un servicio.
const producto_ = (productoKey, cantidad = 1) => ({ productoKey, cantidad })
const servicio_ = (descripcion, precio) => ({ descripcion, precio, cantidad: 1 })

const ventasBase = [
  { hora: '08:10', propietarioKey: 'p1', metodoPago: 'efectivo', items: [producto_('vac_octuple'), servicio_('Consulta de vacunación', 25000)] },
  { hora: '09:05', propietarioKey: 'p2', metodoPago: 'efectivo', items: [servicio_('Control de peso y revisión dental', 45000), producto_('desparasitante', 2)] },
  { hora: '09:40', propietarioKey: 'p3', metodoPago: 'nequi', items: [servicio_('Consulta general', 60000), producto_('alim_gato')] },
  { hora: '10:15', propietarioKey: 'p6', metodoPago: 'tarjeta_debito', items: [producto_('alim_adulto'), producto_('shampoo')] },
  { hora: '11:20', propietarioKey: 'p5', metodoPago: 'transferencia', items: [servicio_('Consulta general', 60000), producto_('meloxicam'), producto_('amoxi')] },
  { hora: '11:50', propietarioKey: 'p4', metodoPago: 'daviplata', items: [producto_('antipulgas', 2)] },
  { hora: '12:30', propietarioKey: 'p9', metodoPago: 'tarjeta_credito', items: [servicio_('Ecografía abdominal', 120000), producto_('omega')] },
  { hora: '13:05', propietarioKey: 'p8', metodoPago: 'efectivo', items: [producto_('alim_cachorro'), servicio_('Baño medicado', 55000)] },
]

const turnoCaja = {
  usuarioKey: 'recep',
  horaApertura: '07:45',
  montoInicial: 200000,
}

const movimientosCajaBase = [
  { tipo: 'ingreso', monto: 100000, motivo: 'fondo_adicional', observaciones: 'Billetes menudos para vueltos', hora: '08:00' },
  { tipo: 'egreso', monto: 25000, motivo: 'gasto_menor', observaciones: 'Bolsas, cinta y papel para la recepción', hora: '10:40' },
  { tipo: 'egreso', monto: 60000, motivo: 'pago_proveedor', observaciones: 'Pago al domiciliario de insumos', hora: '12:10' },
]

const construirDatosDemo = (fechaHoy) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaHoy || '')) {
    throw new Error('fechaHoy debe tener formato YYYY-MM-DD')
  }

  const mascotas = mascotasBase.map(({ edadMeses, ...resto }) => ({
    ...resto,
    fechaNacimiento: restarMeses(fechaHoy, edadMeses),
  }))

  const citas = citasBase.map((item) => ({ ...item, fecha: fechaHoy, origen: item.origen || 'programada' }))

  const historias = historiasBase.map(({ diasAtras, proximaEnDias, ...resto }) => ({
    ...resto,
    fecha: sumarDias(fechaHoy, -diasAtras),
    proximaConsulta: proximaEnDias ? sumarDias(fechaHoy, -diasAtras + proximaEnDias) : null,
  }))

  const ventas = ventasBase.map((venta, indice) => {
    const items = venta.items.map((item) => {
      if (item.productoKey) {
        const base = productosBase.find((p) => p.key === item.productoKey)
        const subtotal = base.precioVenta * item.cantidad
        return {
          tipo: 'producto',
          productoKey: item.productoKey,
          descripcion: base.nombre,
          cantidad: item.cantidad,
          precioUnitario: base.precioVenta,
          subtotal,
        }
      }
      return {
        tipo: 'servicio',
        descripcion: item.descripcion,
        cantidad: 1,
        precioUnitario: item.precio,
        subtotal: item.precio,
      }
    })
    const total = items.reduce((suma, item) => suma + item.subtotal, 0)
    return {
      ...venta,
      numero: `FAC-${String(indice + 1).padStart(4, '0')}`,
      fecha: fechaHoy,
      usuarioKey: 'recep',
      items,
      total,
    }
  })

  const vendidoPorProducto = {}
  for (const venta of ventas) {
    for (const item of venta.items) {
      if (item.productoKey) {
        vendidoPorProducto[item.productoKey] = (vendidoPorProducto[item.productoKey] || 0) + item.cantidad
      }
    }
  }

  const productos = productosBase.map(({ vencEnDias, ...resto }) => ({
    ...resto,
    stock: resto.stockInicial - (vendidoPorProducto[resto.key] || 0),
    fechaVencimiento: sumarDias(fechaHoy, vencEnDias),
  }))

  const totalVentasEfectivo = ventas
    .filter((venta) => venta.metodoPago === 'efectivo')
    .reduce((suma, venta) => suma + venta.total, 0)

  return {
    clinica,
    consultorios,
    usuarios,
    propietarios,
    mascotas,
    citas,
    historias,
    productos,
    ventas,
    turnoCaja: { ...turnoCaja, fecha: fechaHoy, totalVentasEfectivo },
    movimientosCaja: movimientosCajaBase,
  }
}

module.exports = { construirDatosDemo, EMAIL_ADMIN, DOMINIO, minutos, sumarDias }
