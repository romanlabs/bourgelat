import { describe, expect, it } from 'vitest'
import { agruparAvisos, cuandoFue, derivarNotificaciones, desdeServidor } from './notificacionesDerivadas'

const ahora = new Date(2026, 9, 29, 10, 30)

describe('derivarNotificaciones', () => {
  it('sin fuentes no hay avisos', () => {
    expect(derivarNotificaciones({ ahora })).toEqual([])
  })

  it('avisa la historia sin cerrar y la abre desde la cita si puede atender', () => {
    const citas = [
      { id: 'c1', estado: 'completada', horaInicio: '09:00:00', mascota: { id: 'm1', nombre: 'Lupe' } },
      { id: 'c2', estado: 'completada', horaInicio: '09:30:00', mascota: { id: 'm2', nombre: 'Tobías' }, historia: { id: 'h2' } },
    ]
    const [aviso, ...resto] = derivarNotificaciones({ citas, puedeAtender: true, ahora })
    expect(resto).toHaveLength(0)
    expect(aviso).toMatchObject({ id: 'historia-c1', categoria: 'clinica', to: '/pacientes/m1/historial?citaId=c1' })
    expect(derivarNotificaciones({ citas, ahora })[0].to).toBe('/agenda')
  })

  it('avisa la espera en sala desde 15 minutos', () => {
    const citas = [
      { id: 'c1', estado: 'en_espera', horaLlegada: '10:10:00', mascota: { nombre: 'Simón' } },
      { id: 'c2', estado: 'en_espera', horaLlegada: '10:20:00', mascota: { nombre: 'Frida' } },
    ]
    const avisos = derivarNotificaciones({ citas, ahora })
    expect(avisos.map((a) => a.id)).toEqual(['espera-c1'])
    expect(avisos[0].titulo).toBe('Simón lleva 20 minutos en sala')
  })

  it('el id del stock cambia al agotarse, para que vuelva a salir como nuevo', () => {
    const inventario = (stock) => ({ productos: [{ id: 'p1', nombre: 'Jeringa 3 ml', stock, stockMinimo: 5 }] })
    expect(derivarNotificaciones({ inventario: inventario(2), ahora })[0].id).toBe('stock-producto-p1-bajo')
    expect(derivarNotificaciones({ inventario: inventario(0), ahora })[0]).toMatchObject({
      id: 'stock-producto-p1-agotado',
      titulo: 'Se agotó Jeringa 3 ml',
      state: { resaltarProductoId: 'p1' },
    })
  })

  it('nombra hasta 4 artículos bajo el mínimo y resume el resto', () => {
    const productos = Array.from({ length: 6 }, (_, i) => ({ id: `p${i}`, nombre: `P${i}`, stock: 1, stockMinimo: 3 }))
    const avisos = derivarNotificaciones({ inventario: { productos }, ahora })
    expect(avisos).toHaveLength(5)
    expect(avisos[4].titulo).toBe('2 artículos más bajo el mínimo')
  })

  it('avisa vencidos y por vencer en 30 días, sin contar los agotados', () => {
    const insumos = [
      { id: 'i1', nombre: 'Triple felina', stock: 8, stockMinimo: 1, fechaVencimiento: '2026-11-05' },
      { id: 'i2', nombre: 'Amoxicilina', stock: 3, stockMinimo: 1, fechaVencimiento: '2026-10-20' },
      { id: 'i3', nombre: 'Sin stock', stock: 0, stockMinimo: 0, fechaVencimiento: '2026-10-01' },
      { id: 'i4', nombre: 'Lejano', stock: 3, stockMinimo: 1, fechaVencimiento: '2027-05-01' },
    ]
    const vencen = derivarNotificaciones({ inventario: { insumos }, ahora }).filter((a) => a.id.startsWith('vence-'))
    expect(vencen.map((a) => a.titulo)).toEqual(['Amoxicilina está vencido', 'Triple felina vence el 5 de nov'])
  })

  it('agrupa el fiado vencido por cliente y lleva a Por cobrar', () => {
    const cuentasPorCobrar = {
      clientes: [
        {
          propietarioId: 't1',
          nombre: 'Daniela Toro',
          facturas: [
            { id: 'f1', fechaVencimientoCredito: '2026-10-20', saldoPendiente: '60000' },
            { id: 'f2', fechaVencimientoCredito: '2026-10-25', saldoPendiente: '40000' },
            { id: 'f3', fechaVencimientoCredito: '2026-11-10', saldoPendiente: '10000' },
          ],
        },
        { propietarioId: 't2', nombre: 'Al día', facturas: [{ id: 'f4', fechaVencimientoCredito: null, saldoPendiente: '5000' }] },
      ],
    }
    const avisos = derivarNotificaciones({ cuentasPorCobrar, ahora })
    expect(avisos).toHaveLength(1)
    expect(avisos[0]).toMatchObject({ titulo: 'Crédito vencido de Daniela Toro', to: '/caja', state: { tab: 'cobrar' } })
    expect(avisos[0].texto).toBe('2 ventas con saldo de $100.000.')
  })

  it('avisa la respuesta de soporte y el plan por vencer', () => {
    const tickets = [
      { id: 't1', codigo: '#1042', asunto: 'La tirilla sale cortada', estado: 'esperando_usuario', ultimaActividadAt: 'x' },
      { id: 't2', codigo: '#1043', asunto: 'Otra', estado: 'abierto' },
    ]
    const avisos = derivarNotificaciones({ tickets, diasRestantes: 3, ahora })
    expect(avisos.map((a) => a.titulo)).toEqual(['Respondimos tu solicitud #1042', 'Tu plan vence en 3 días'])
    expect(avisos[0].to).toBe('/soporte?ticket=t1')
    expect(derivarNotificaciones({ diasRestantes: 10, ahora })).toEqual([])
  })
})

describe('avisos guardados', () => {
  it('dice hace cuánto pasó', () => {
    expect(cuandoFue(new Date(2026, 9, 29, 10, 29, 40), ahora)).toBe('Ahora')
    expect(cuandoFue(new Date(2026, 9, 29, 10, 25), ahora)).toBe('Hace 5 min')
    expect(cuandoFue(new Date(2026, 9, 29, 8, 10), ahora)).toBe('Hace 2 h')
    expect(cuandoFue(new Date(2026, 9, 28, 18, 4), ahora)).toMatch(/^6:04/)
  })

  it('convierte la fila del servidor y la marca nueva si no está leída', () => {
    const aviso = desdeServidor(
      { id: 'n1', categoria: 'caja', titulo: 'Cierre', texto: null, enlace: '/caja', leidaEn: null, createdAt: new Date(2026, 9, 29, 9, 0).toISOString() },
      ahora
    )
    expect(aviso).toMatchObject({ id: 'srv-n1', servidorId: 'n1', to: '/caja', nueva: true })
  })

  it('agrupa lo pendiente primero y lo guardado por día', () => {
    const grupos = agruparAvisos(
      [
        { id: 'd1' },
        { id: 's1', fecha: new Date(2026, 9, 29, 9, 0).toISOString() },
        { id: 's2', fecha: new Date(2026, 9, 28, 18, 0).toISOString() },
        { id: 's3', fecha: new Date(2026, 9, 20, 8, 0).toISOString() },
      ],
      ahora
    )
    expect(grupos.map((g) => g.titulo)).toEqual(['Para revisar ahora', 'Hoy', 'Ayer', expect.stringMatching(/^Martes, 20 de octubre/)])
  })
})
