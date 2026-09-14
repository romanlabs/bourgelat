/**
 * Registro central de claves de React Query, agrupadas por dominio de datos.
 *
 * Regla: un dominio agrupa TODAS las claves que sirven el mismo dato, sin importar
 * que feature las consulte. Si una pantalla lee datos de otro modulo con su propia
 * clave (el POS lee el catalogo de inventario como 'finanzas-productos'), esa clave
 * va en el dominio de origen. Asi una mutacion solo necesita saber que dominio toca,
 * y no puede olvidarse de refrescar la pantalla de otro modulo.
 *
 * Las claves son solo el primer segmento (la raiz). React Query invalida por prefijo,
 * asi que ['inventario-productos'] alcanza a ['inventario-productos', buscar, pagina, ...].
 */
export const DOMINIOS = {
  productos: [
    'inventario-productos',
    'inventario-producto-detalle',
    'inventario-reporte-completo',
    'inventario-alertas',
    'inventario-movimientos',
    'dashboard-inventario',
    // El POS y los combos leen el mismo catalogo con claves propias; sin esto un
    // cambio de precio no se ve en la venta hasta que expira el cache.
    'finanzas-productos',
    'producto-combobox',
    'producto-combobox-duplicado',
    // La historia clinica busca medicamentos contra inventarioApi con clave propia.
    'historias-catalogo-medicamentos',
  ],

  insumosClinicos: [
    'inventario-clinico-insumos',
    'inventario-clinico-insumos-selector',
    'inventario-clinico-insumo-detalle',
    'inventario-clinico-alertas',
    'inventario-clinico-movimientos',
    // La historia clinica consume insumos desde su propio catalogo.
    'historias-catalogo-insumos-consumo',
  ],

  servicios: [
    'servicios-clinicos',
    'servicios-clinicos-selector',
    'finanzas-servicios',
  ],

  comprasProveedor: [
    'facturas-compra',
    'facturas-compra-alertas',
  ],

  facturacion: [
    'finanzas-facturas',
    'finanzas-factura-detalle',
    'finanzas-facturas-resumen',
    'finanzas-ingresos',
    'dashboard-ingresos',
    'dashboard-facturacion-estado',
    'administracion',
  ],

  caja: [
    'caja-turno-activo',
    'caja-movimientos',
    'caja-historial',
    'caja-reporte-descuadres',
    'caja-turnos-vencidos',
    'caja-turno-detalle',
  ],

  agenda: [
    'agenda-citas',
    'cita-detalle',
    'agenda-calendario',
    'agenda-analitica',
    'agenda-disponibilidad',
    'agenda-reporte-mensual',
    'recepcion-sala-espera',
    'recepcion-disponibilidad',
    'dashboard-general',
    'dashboard-citas',
    'dashboard-citas-hoy-detalle',
  ],

  pacientes: [
    'pacientes-mascotas',
    'paciente-perfil',
    'pacientes-mascotas-resumen',
    'pacientes-tutores',
    'pacientes-propietarios-resumen',
    'pacientes-propietarios-selector',
    'agenda-mascotas-base',
    'agenda-propietarios',
    'finanzas-propietarios',
    'antecedentes-mascotas-selector',
    'busqueda-global-mascotas',
    'busqueda-global-propietarios',
  ],

  historias: [
    'historias-listado',
    'historias-resumen',
    'paciente-historial',
    'historias-citas-relacionadas',
    'historias-antecedentes',
    'antecedentes-detalle',
    'examenes-laboratorio',
    'paciente-estilos',
  ],

  // Un usuario nuevo (o un cambio de rol) tiene que aparecer en los selectores de
  // veterinario de agenda e historias, no solo en la tabla de Usuarios.
  equipo: [
    'usuarios-clinica',
    'equipo-clinica',
    'agenda-equipo',
    'historias-equipo',
    // El dashboard cuenta usuarios activos. Una clave puede repetirse en varios
    // dominios: invalidar de mas solo cuesta un refetch.
    'dashboard-general',
  ],

  configuracion: [
    'configuracion-clinica',
    'configuracion-factus',
    'configuracion-bloqueos',
    'agenda-horario',
    'agenda-bloqueos',
    'recepcion-consultorios',
    'suscripcion-activa',
  ],
}

/**
 * Invalida todas las claves de los dominios indicados.
 *
 *   invalidarDominios(queryClient, 'productos')
 *   invalidarDominios(queryClient, 'productos', 'caja')
 */
export function invalidarDominios(queryClient, ...dominios) {
  for (const dominio of dominios) {
    const claves = DOMINIOS[dominio]
    if (!claves) {
      // Typo en el nombre del dominio: fallar ruidoso en dev, silencioso en prod.
      if (import.meta.env.DEV) {
        throw new Error(`invalidarDominios: dominio desconocido "${dominio}"`)
      }
      continue
    }
    for (const clave of claves) {
      queryClient.invalidateQueries({ queryKey: [clave] })
    }
  }
}
