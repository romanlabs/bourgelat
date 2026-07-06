import { useMemo, useState } from 'react'
import AdminShell from '@/components/layout/AdminShell'
import {
  useGastos,
  useCrearGasto,
  useAnularGasto,
  useCuentasPorCobrar,
  useRegistrarAbono,
  useRentabilidad,
} from '@/features/administracion/useAdministracion'

/*
 * Libro mayor — módulo administrativo.
 *
 * Dirección de diseño propia (no hereda los tokens de la app): el mundo del
 * cuaderno contable. Papel verde ledger, línea roja de margen, montos en
 * monoespaciada tabular con semántica de tinta de contador (verde = entra,
 * rojo = sale, negativos entre paréntesis) y la rentabilidad presentada como
 * una suma aritmética vertical con doble subrayado en el total.
 */

const TINTA = '#16261e'          // tinta verde-negra
const TINTA_SUAVE = '#5c6b5e'    // anotaciones
const VERDE_HABER = '#0e7a4e'    // ingresos (crédito)
const ROJO_DEBE = '#a3382c'      // egresos (débito)
const LINEA = '#c9d6c4'          // renglones
const MARGEN_ROJO = '#c25a4e'    // línea de margen del papel contable
const PAPEL = '#f7faf3'          // hoja
const FONDO = '#eef2ec'          // escritorio

const MONO = {
  fontFamily: "'IBM Plex Mono', ui-monospace, 'Cascadia Mono', monospace",
  fontVariantNumeric: 'tabular-nums',
}

const DISPLAY = { fontFamily: "'Spectral', Georgia, serif" }

const formatoCOP = new Intl.NumberFormat('es-CO', {
  maximumFractionDigits: 0,
})

const CATEGORIAS = [
  { value: 'nomina', label: 'Nómina' },
  { value: 'arriendo', label: 'Arriendo' },
  { value: 'servicios_publicos', label: 'Servicios públicos' },
  { value: 'insumos', label: 'Insumos' },
  { value: 'proveedor', label: 'Proveedor' },
  { value: 'mantenimiento', label: 'Mantenimiento' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'impuestos', label: 'Impuestos' },
  { value: 'otros', label: 'Otros' },
]

const METODOS = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'tarjeta', label: 'Tarjeta' },
  { value: 'otro', label: 'Otro' },
]

const etiquetaCategoria = (value) =>
  CATEGORIAS.find((c) => c.value === value)?.label || value

function rangoDelMes(mesISO) {
  const [anio, mes] = mesISO.split('-').map(Number)
  const ultimo = new Date(anio, mes, 0).getDate()
  return {
    fechaInicio: `${mesISO}-01`,
    fechaFin: `${mesISO}-${String(ultimo).padStart(2, '0')}`,
  }
}

/** Monto con tinta de contador: verde entra, rojo sale entre paréntesis. */
function Monto({ valor, tipo = 'neutro', className = '', grande = false }) {
  const n = Math.abs(Number(valor) || 0)
  const texto = tipo === 'egreso' ? `(${formatoCOP.format(n)})` : formatoCOP.format(n)
  const color =
    tipo === 'ingreso' ? VERDE_HABER : tipo === 'egreso' ? ROJO_DEBE : TINTA

  return (
    <span
      style={{ ...MONO, color }}
      className={`${grande ? 'text-2xl font-semibold' : 'text-sm'} ${className}`}
    >
      {texto}
    </span>
  )
}

/** Hoja de libro contable: margen rojo vertical y folio, como el papel real. */
function Hoja({ titulo, folio, nota, children }) {
  return (
    <section
      aria-label={titulo}
      className="relative overflow-hidden rounded-sm shadow-[0_1px_3px_rgba(22,38,30,0.12),0_8px_24px_-12px_rgba(22,38,30,0.18)]"
      style={{ backgroundColor: PAPEL }}
    >
      {/* Línea roja de margen — la firma del papel contable */}
      <span
        aria-hidden
        className="pointer-events-none absolute bottom-0 top-0 w-px"
        style={{ left: '3.25rem', backgroundColor: MARGEN_ROJO, opacity: 0.65 }}
      />
      <header
        className="flex items-baseline justify-between gap-3 border-b px-4 py-3 pl-16"
        style={{ borderColor: LINEA }}
      >
        <h2 className="text-lg" style={{ ...DISPLAY, color: TINTA, fontStyle: 'italic' }}>
          {titulo}
        </h2>
        <div className="flex items-baseline gap-4">
          {nota ? (
            <span className="text-[11px]" style={{ color: TINTA_SUAVE }}>{nota}</span>
          ) : null}
          {folio ? (
            <span className="text-[11px] uppercase tracking-widest" style={{ ...MONO, color: TINTA_SUAVE }}>
              folio {folio}
            </span>
          ) : null}
        </div>
      </header>
      {children}
    </section>
  )
}

/** Renglón del libro: número de asiento en el margen, contenido reglado. */
function Renglon({ numero, children, atenuado = false }) {
  return (
    <div
      className={`relative flex items-center gap-3 border-b px-4 py-2.5 pl-16 ${atenuado ? 'opacity-45' : ''}`}
      style={{ borderColor: LINEA }}
    >
      <span
        className="absolute left-0 w-[3.25rem] text-center text-[11px]"
        style={{ ...MONO, color: TINTA_SUAVE }}
      >
        {numero}
      </span>
      {children}
    </div>
  )
}

/**
 * La suma del contador: ingresos, menos gastos, raya, total con doble
 * subrayado. La estructura ES el reporte de rentabilidad.
 */
function SumaDelMes({ datos, cargando }) {
  const ganancia = Number(datos?.ganancia || 0)
  const positiva = ganancia >= 0

  const Fila = ({ etiqueta, children, borde }) => (
    <div
      className={`flex items-baseline justify-between gap-6 py-2 ${borde ? 'border-t' : ''}`}
      style={borde ? { borderColor: TINTA } : undefined}
    >
      <span className="text-xs uppercase tracking-wide" style={{ color: TINTA_SUAVE }}>
        {etiqueta}
      </span>
      {children}
    </div>
  )

  return (
    <div className="px-4 py-4 pl-16">
      {cargando ? (
        <p className="text-sm" style={{ color: TINTA_SUAVE }}>Sumando el periodo…</p>
      ) : (
        <>
          <Fila etiqueta="Ingresos">
            <Monto valor={datos?.totalIngresos} tipo="ingreso" />
          </Fila>
          <Fila etiqueta="Gastos">
            <Monto valor={datos?.totalGastos} tipo="egreso" />
          </Fila>
          {/* Raya simple antes del total, doble raya bajo el total: convención contable */}
          <Fila etiqueta={positiva ? 'Ganancia' : 'Pérdida'} borde>
            <span
              className="border-b-4 pb-1"
              style={{ borderBottomStyle: 'double', borderColor: TINTA }}
            >
              <Monto valor={ganancia} tipo={positiva ? 'ingreso' : 'egreso'} grande />
            </span>
          </Fila>
          {datos?.margen ? (
            <p className="pt-2 text-right text-[11px]" style={{ color: TINTA_SUAVE }}>
              margen {datos.margen} sobre ingresos
            </p>
          ) : null}
        </>
      )}
    </div>
  )
}

/** Asentar un gasto se hace escribiendo un renglón nuevo, no en un modal. */
function AsientoNuevo() {
  const crearGasto = useCrearGasto()
  const [form, setForm] = useState({
    categoria: 'insumos',
    descripcion: '',
    monto: '',
    metodoPago: 'efectivo',
  })
  const [mensaje, setMensaje] = useState(null)

  const set = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }))

  const asentar = async (e) => {
    e.preventDefault()
    setMensaje(null)
    try {
      const res = await crearGasto.mutateAsync({
        ...form,
        monto: Number(form.monto),
        descripcion: form.descripcion || undefined,
      })
      setForm((f) => ({ ...f, descripcion: '', monto: '' }))
      setMensaje({ tipo: 'ok', texto: res.message })
    } catch (err) {
      setMensaje({
        tipo: 'error',
        texto: err.response?.data?.message || 'No se pudo asentar el gasto',
      })
    }
  }

  const campo =
    'h-9 rounded-none border-0 border-b bg-transparent px-1 text-sm outline-none transition-colors focus-visible:border-b-2'

  return (
    <form
      onSubmit={asentar}
      className="relative border-b-2 px-4 py-3 pl-16"
      style={{ borderColor: TINTA, backgroundColor: 'rgba(199,154,59,0.06)' }}
    >
      <span
        className="absolute left-0 w-[3.25rem] text-center text-[11px]"
        style={{ ...MONO, color: MARGEN_ROJO }}
      >
        +
      </span>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 md:grid-cols-[10rem_1fr_9rem_9rem_auto] md:items-end">
        <label className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-widest" style={{ color: TINTA_SUAVE }}>Categoría</span>
          <select value={form.categoria} onChange={set('categoria')} className={campo} style={{ borderColor: LINEA, color: TINTA }}>
            {CATEGORIAS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-widest" style={{ color: TINTA_SUAVE }}>Concepto</span>
          <input
            value={form.descripcion}
            onChange={set('descripcion')}
            placeholder="¿En qué se gastó?"
            className={campo}
            style={{ borderColor: LINEA, color: TINTA }}
            maxLength={500}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-widest" style={{ color: TINTA_SUAVE }}>Valor</span>
          <input
            value={form.monto}
            onChange={set('monto')}
            type="number"
            min="1"
            step="1"
            required
            placeholder="0"
            className={`${campo} text-right`}
            style={{ ...MONO, borderColor: LINEA, color: ROJO_DEBE }}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-widest" style={{ color: TINTA_SUAVE }}>Pago</span>
          <select value={form.metodoPago} onChange={set('metodoPago')} className={campo} style={{ borderColor: LINEA, color: TINTA }}>
            {METODOS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </label>
        <button
          type="submit"
          disabled={crearGasto.isPending}
          className="col-span-2 h-9 px-4 text-xs font-semibold uppercase tracking-widest text-white transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 md:col-span-1"
          style={{ backgroundColor: TINTA, outlineColor: VERDE_HABER }}
        >
          {crearGasto.isPending ? 'Asentando…' : 'Asentar'}
        </button>
      </div>
      {form.metodoPago === 'efectivo' ? (
        <p className="pt-2 text-[11px]" style={{ color: TINTA_SUAVE }}>
          En efectivo con turno abierto: se descuenta de tu caja automáticamente.
        </p>
      ) : null}
      {mensaje ? (
        <p className="pt-2 text-[11px]" style={{ color: mensaje.tipo === 'ok' ? VERDE_HABER : ROJO_DEBE }}>
          {mensaje.texto}
        </p>
      ) : null}
    </form>
  )
}

function LibroGastos({ periodo }) {
  const { data, isLoading } = useGastos(periodo)
  const anularGasto = useAnularGasto()

  const anular = async (gasto) => {
    const motivo = window.prompt(`Anular gasto de ${etiquetaCategoria(gasto.categoria)} por $${formatoCOP.format(gasto.monto)}. ¿Motivo?`)
    if (!motivo?.trim()) return
    try {
      await anularGasto.mutateAsync({ gastoId: gasto.id, motivoAnulacion: motivo.trim() })
    } catch (err) {
      window.alert(err.response?.data?.message || 'No se pudo anular el gasto')
    }
  }

  return (
    <Hoja
      titulo="Gastos del negocio"
      folio={periodo.fechaInicio?.slice(0, 7)}
      nota={data ? `${data.total} asientos · total $${formatoCOP.format(data.totalMonto || 0)}` : null}
    >
      <AsientoNuevo />
      {isLoading ? (
        <Renglon numero="—"><span className="text-sm" style={{ color: TINTA_SUAVE }}>Abriendo el libro…</span></Renglon>
      ) : !data?.gastos?.length ? (
        <Renglon numero="1">
          <span className="text-sm" style={{ color: TINTA_SUAVE }}>
            Sin gastos este mes. Asienta el primero en el renglón de arriba.
          </span>
        </Renglon>
      ) : (
        data.gastos.map((gasto, i) => (
          <Renglon key={gasto.id} numero={data.total - i} atenuado={gasto.anulado}>
            <span className="w-16 shrink-0 text-[11px]" style={{ ...MONO, color: TINTA_SUAVE }}>
              {gasto.fecha?.slice(5)}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm" style={{ color: TINTA }}>
              <span className="font-medium">{etiquetaCategoria(gasto.categoria)}</span>
              {gasto.descripcion ? <span style={{ color: TINTA_SUAVE }}> — {gasto.descripcion}</span> : null}
              {gasto.anulado ? <span className="text-[11px]" style={{ color: ROJO_DEBE }}> (anulado)</span> : null}
            </span>
            <span className="hidden text-[11px] sm:block" style={{ color: TINTA_SUAVE }}>
              {METODOS.find((m) => m.value === gasto.metodoPago)?.label}
            </span>
            <Monto valor={gasto.monto} tipo="egreso" className="w-28 shrink-0 text-right" />
            {!gasto.anulado ? (
              <button
                type="button"
                onClick={() => anular(gasto)}
                className="text-[11px] underline decoration-dotted underline-offset-2 transition-colors hover:decoration-solid focus-visible:outline focus-visible:outline-1"
                style={{ color: TINTA_SUAVE }}
              >
                anular
              </button>
            ) : null}
          </Renglon>
        ))
      )}
    </Hoja>
  )
}

function FilaDeudor({ cliente }) {
  const [abierto, setAbierto] = useState(false)
  const [abono, setAbono] = useState({ facturaId: null, monto: '', metodoPago: 'efectivo' })
  const registrarAbono = useRegistrarAbono()
  const [error, setError] = useState(null)

  const cobrar = async (factura) => {
    setError(null)
    try {
      await registrarAbono.mutateAsync({
        facturaId: factura.id,
        monto: Number(abono.monto),
        metodoPago: abono.metodoPago,
      })
      setAbono({ facturaId: null, monto: '', metodoPago: 'efectivo' })
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo registrar el abono')
    }
  }

  return (
    <div className="border-b" style={{ borderColor: LINEA }}>
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        className="relative flex w-full items-center gap-3 px-4 py-3 pl-16 text-left transition-colors hover:bg-black/[0.025] focus-visible:outline focus-visible:outline-1"
      >
        <span className="absolute left-0 w-[3.25rem] text-center text-[11px]" style={{ ...MONO, color: TINTA_SUAVE }}>
          {cliente.facturas.length}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium" style={{ color: TINTA }}>{cliente.nombre}</span>
          <span className="block text-[11px]" style={{ color: TINTA_SUAVE }}>
            debe desde {cliente.facturaMasAntigua}{cliente.telefono ? ` · ${cliente.telefono}` : ''}
          </span>
        </span>
        <Monto valor={cliente.totalDeuda} tipo="egreso" className="shrink-0" />
        <span aria-hidden className="text-xs" style={{ color: TINTA_SUAVE }}>{abierto ? '▴' : '▾'}</span>
      </button>

      {abierto ? (
        <div className="pb-3">
          {cliente.facturas.map((f) => (
            <div key={f.id} className="relative flex flex-wrap items-center gap-3 px-4 py-2 pl-16">
              <span className="absolute left-0 w-[3.25rem] text-center text-[10px]" style={{ ...MONO, color: LINEA }}>·</span>
              <span className="text-[11px]" style={{ ...MONO, color: TINTA_SUAVE }}>#{f.numero} · {f.fecha}</span>
              <span className="text-[11px]" style={{ color: TINTA_SUAVE }}>
                de <Monto valor={f.total} className="!text-[11px]" /> quedan
              </span>
              <Monto valor={f.saldoPendiente} tipo="egreso" className="!text-[13px]" />
              {abono.facturaId === f.id ? (
                <span className="flex items-center gap-2">
                  <input
                    autoFocus
                    type="number"
                    min="1"
                    max={f.saldoPendiente}
                    value={abono.monto}
                    onChange={(e) => setAbono((a) => ({ ...a, monto: e.target.value }))}
                    placeholder="valor"
                    className="h-8 w-24 border-b bg-transparent px-1 text-right text-sm outline-none"
                    style={{ ...MONO, borderColor: TINTA, color: VERDE_HABER }}
                  />
                  <select
                    value={abono.metodoPago}
                    onChange={(e) => setAbono((a) => ({ ...a, metodoPago: e.target.value }))}
                    className="h-8 border-b bg-transparent text-xs outline-none"
                    style={{ borderColor: LINEA, color: TINTA }}
                  >
                    <option value="efectivo">Efectivo</option>
                    <option value="transferencia">Transferencia</option>
                    <option value="nequi">Nequi</option>
                    <option value="daviplata">Daviplata</option>
                    <option value="tarjeta_debito">Tarjeta débito</option>
                    <option value="otro">Otro</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => cobrar(f)}
                    disabled={registrarAbono.isPending || !abono.monto}
                    className="h-8 px-3 text-[11px] font-semibold uppercase tracking-widest text-white disabled:opacity-50"
                    style={{ backgroundColor: VERDE_HABER }}
                  >
                    Abonar
                  </button>
                  <button
                    type="button"
                    onClick={() => setAbono({ facturaId: null, monto: '', metodoPago: 'efectivo' })}
                    className="text-[11px] underline decoration-dotted"
                    style={{ color: TINTA_SUAVE }}
                  >
                    cancelar
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setAbono({ facturaId: f.id, monto: '', metodoPago: 'efectivo' })}
                  className="text-[11px] font-semibold underline decoration-dotted underline-offset-2 hover:decoration-solid"
                  style={{ color: VERDE_HABER }}
                >
                  registrar abono
                </button>
              )}
            </div>
          ))}
          {error ? <p className="px-4 pl-16 text-[11px]" style={{ color: ROJO_DEBE }}>{error}</p> : null}
        </div>
      ) : null}
    </div>
  )
}

function CuentasPorCobrar() {
  const { data, isLoading } = useCuentasPorCobrar()

  return (
    <Hoja
      titulo="Cuentas por cobrar"
      nota={data?.totalClientes ? `${data.totalClientes} clientes deben` : null}
      folio="fiado"
    >
      {isLoading ? (
        <Renglon numero="—"><span className="text-sm" style={{ color: TINTA_SUAVE }}>Revisando deudas…</span></Renglon>
      ) : !data?.clientes?.length ? (
        <Renglon numero="0">
          <span className="text-sm" style={{ color: TINTA_SUAVE }}>Nadie debe. El fiado está al día.</span>
        </Renglon>
      ) : (
        <>
          {data.clientes.map((cliente) => (
            <FilaDeudor key={cliente.propietarioId || 'mostrador'} cliente={cliente} />
          ))}
          <div className="flex items-baseline justify-between px-4 py-3 pl-16">
            <span className="text-xs uppercase tracking-wide" style={{ color: TINTA_SUAVE }}>Total por cobrar</span>
            <span className="border-b-4 pb-1" style={{ borderBottomStyle: 'double', borderColor: TINTA }}>
              <Monto valor={data.totalPorCobrar} tipo="egreso" grande />
            </span>
          </div>
        </>
      )}
    </Hoja>
  )
}

export default function AdministracionPage() {
  const [mes, setMes] = useState(() => new Date().toISOString().slice(0, 7))
  const periodo = useMemo(() => rangoDelMes(mes), [mes])
  const rentabilidad = useRentabilidad(periodo)

  return (
    <AdminShell>
      <div className="-m-4 min-h-full p-4 sm:-m-6 sm:p-6 lg:-m-8 lg:p-8" style={{ backgroundColor: FONDO }}>
        <header className="mx-auto mb-6 flex max-w-6xl flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.25em]" style={{ color: TINTA_SUAVE }}>
              Administración
            </p>
            <h1 className="text-3xl" style={{ ...DISPLAY, color: TINTA, fontStyle: 'italic' }}>
              Libro mayor
            </h1>
          </div>
          <label className="flex items-center gap-2 text-xs" style={{ color: TINTA_SUAVE }}>
            Periodo
            <input
              type="month"
              value={mes}
              onChange={(e) => setMes(e.target.value)}
              className="h-9 border-b bg-transparent px-1 text-sm outline-none focus-visible:border-b-2"
              style={{ ...MONO, borderColor: LINEA, color: TINTA }}
            />
          </label>
        </header>

        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1fr_20rem]">
          <div className="space-y-6">
            <LibroGastos periodo={periodo} />
            <CuentasPorCobrar />
          </div>
          <div className="lg:sticky lg:top-6 lg:self-start">
            <Hoja titulo="¿Cómo va el mes?" folio={mes}>
              <SumaDelMes datos={rentabilidad.data} cargando={rentabilidad.isLoading} />
            </Hoja>
          </div>
        </div>
      </div>
    </AdminShell>
  )
}
