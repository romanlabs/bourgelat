import { useMemo, useState } from 'react'
import { CalendarRange, Receipt, TrendingDown, TrendingUp, Wallet } from 'lucide-react'
import { chartColors } from '@/lib/theme'
import {
  ComparativoPanel,
  DataTable,
  DonutCard,
  KpiGrid,
} from '@/features/dashboard/dashboardComponents'
import {
  formatCurrency,
  formatNumber,
  formatShortDate,
  objectToChartData,
} from '@/features/dashboard/dashboardUtils'
import { useAnalisisPeriodo } from '@/features/finanzas/useAdministracion'
import { CATEGORIAS_GASTO } from '@/features/finanzas/finanzasConstants'
import {
  PRESETS_ANALISIS,
  aniosDisponibles,
  badgeVariacion,
  etiquetaAnterior,
  etiquetaPeriodo,
  rangoDelAnio,
  rangoTrimestreActual,
  rangoUltimos12Meses,
} from '@/features/finanzas/analisisPeriodo'
import { FuncionNoIncluida } from '@/components/shared/FuncionNoIncluida'
import { Select } from '@/components/ui/select'
import { tieneFuncionalidad, FUNCIONALIDAD_REPORTES_COMPLETOS } from '@/lib/suscripcion'
import { useAuthStore } from '@/store/authStore'

// Ingresos y gastos van en petróleo claro y ámbar: son los dos tonos de la
// paleta categórica que se separan para daltónicos y se leen sobre papel y
// sobre la noche. La ganancia va en tinta, que sigue el modo del tema. Como el
// ámbar sobre papel queda bajo 3:1, la gráfica lleva leyenda, tooltip y la
// tabla «Detalle por periodo».
const COLOR_INGRESOS = chartColors.categorica[2]
const COLOR_GASTOS = chartColors.categorica[1]
const COLOR_GANANCIA = 'hsl(var(--foreground))'

// El color sigue a la categoría (orden fijo del ENUM), no a su posición en el
// periodo: «Nómina» es del mismo color en todos los años.
const ETIQUETAS_CATEGORIA = Object.fromEntries(CATEGORIAS_GASTO.map((c) => [c.value, c.label]))
const COLORES_CATEGORIA = Object.fromEntries(
  CATEGORIAS_GASTO.map((c, indice) => [c.value, chartColors.categorica[indice % chartColors.categorica.length]])
)
const ETIQUETAS_TIPO = { servicio: 'Servicios', producto: 'Productos' }
const COLORES_TIPO = { servicio: chartColors.categorica[0], producto: chartColors.categorica[1] }

const formatoEje = (valor) =>
  new Intl.NumberFormat('es-CO', { notation: 'compact', maximumFractionDigits: 1 }).format(Number(valor || 0))

const inputFecha =
  'h-10 rounded-lg border border-input bg-card px-3 text-sm tabular-nums text-foreground outline-none transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

function SelectorPeriodo({ preset, onPreset, anio, onAnio, personalizado, onPersonalizado }) {
  const anios = useMemo(() => aniosDisponibles().map((a) => ({ value: String(a), label: String(a) })), [])

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div role="group" aria-label="Periodo" className="flex max-w-full gap-1 overflow-x-auto rounded-xl bg-muted p-1">
        {PRESETS_ANALISIS.map((opcion) => (
          <button
            key={opcion.id}
            type="button"
            onClick={() => onPreset(opcion.id)}
            aria-pressed={preset === opcion.id}
            className={`h-9 shrink-0 whitespace-nowrap rounded-lg px-3.5 text-[13px] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              preset === opcion.id
                ? 'bg-card font-semibold text-foreground'
                : 'font-medium text-muted-foreground hover:text-foreground'
            }`}
          >
            {opcion.label}
          </button>
        ))}
      </div>

      {preset === 'anio' ? (
        <Select aria-label="Año" value={String(anio)} onValueChange={(valor) => onAnio(Number(valor))} options={anios} />
      ) : null}

      {preset === 'personalizado' ? (
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={personalizado.fechaInicio}
            max={personalizado.fechaFin}
            onChange={(e) => e.target.value && onPersonalizado({ ...personalizado, fechaInicio: e.target.value })}
            aria-label="Fecha inicial del periodo"
            className={inputFecha}
          />
          <span className="text-sm text-muted-foreground">a</span>
          <input
            type="date"
            value={personalizado.fechaFin}
            min={personalizado.fechaInicio}
            onChange={(e) => e.target.value && onPersonalizado({ ...personalizado, fechaFin: e.target.value })}
            aria-label="Fecha final del periodo"
            className={inputFecha}
          />
        </div>
      ) : null}
    </div>
  )
}

const columnaPesos = (key, label, tono = '') => ({
  key,
  label,
  render: (row) => <span className={`tabular-nums ${tono}`}>{formatCurrency(row[key])}</span>,
})

// `sinCatalogo`: total de las líneas escritas a mano (sin producto o servicio
// del catálogo). Va como última fila para que la tabla cuadre con «Ventas por tipo».
function TopLineas({ title, subtitle, filas, sinCatalogo, etiquetaSinCatalogo, vacio }) {
  const rows = sinCatalogo > 0
    ? [...filas, { id: 'sin-catalogo', nombre: etiquetaSinCatalogo, cantidad: null, total: sinCatalogo, sinCatalogo: true }]
    : filas

  return (
    <DataTable
      title={title}
      subtitle={subtitle}
      rows={rows}
      columns={[
        {
          key: 'nombre',
          label: 'Nombre',
          render: (row) =>
            row.sinCatalogo ? (
              <span className="text-muted-foreground">{row.nombre}</span>
            ) : (
              <span className="font-semibold">{row.nombre}</span>
            ),
        },
        {
          key: 'cantidad',
          label: 'Cantidad',
          render: (row) => (row.sinCatalogo ? null : <span className="tabular-nums">{formatNumber(row.cantidad)}</span>),
        },
        columnaPesos('total', 'Facturado'),
      ]}
      emptyTitle={vacio}
      emptyBody="Cuando haya ventas en el periodo aparecerán aquí."
    />
  )
}

export default function AnalisisPeriodoPanel() {
  const suscripcion = useAuthStore((state) => state.suscripcion)
  const incluido = tieneFuncionalidad(suscripcion, FUNCIONALIDAD_REPORTES_COMPLETOS)

  const [preset, setPreset] = useState('anio')
  const [anio, setAnio] = useState(() => new Date().getFullYear())
  const [personalizado, setPersonalizado] = useState(() => rangoUltimos12Meses())
  const [verTabla, setVerTabla] = useState(false)

  const rango = useMemo(() => {
    if (preset === '12m') return rangoUltimos12Meses()
    if (preset === 'trimestre') return rangoTrimestreActual()
    if (preset === 'personalizado') return personalizado
    return rangoDelAnio(anio)
  }, [preset, anio, personalizado])

  const query = useAnalisisPeriodo(rango, { enabled: incluido })
  const data = query.data
  const cargando = query.isLoading

  const serie = useMemo(
    () => (data?.serie || []).map((fila) => ({ ...fila, name: etiquetaPeriodo(fila.periodo) })),
    [data]
  )
  const gastosPorCategoria = useMemo(
    () =>
      objectToChartData(data?.gastosPorCategoria, ETIQUETAS_CATEGORIA, COLORES_CATEGORIA)
        .filter((item) => item.value > 0)
        .sort((a, b) => b.value - a.value),
    [data]
  )
  const ingresosPorTipo = useMemo(
    () => objectToChartData(data?.ingresosPorTipo, ETIQUETAS_TIPO, COLORES_TIPO),
    [data]
  )

  if (!incluido) {
    return (
      <FuncionNoIncluida
        titulo="El análisis del periodo es del plan Clínica"
        descripcion="Compara ingresos, gastos y ganancia mes a mes, encuentra tus mejores meses y lo que más vendes. Está incluido en el plan Clínica."
      />
    )
  }

  const resumen = data?.resumen
  const anterior = data?.anterior
  const nombreAnterior = etiquetaAnterior(preset, data?.periodo?.anterior)
  const porMes = data?.periodo?.granularidad !== 'dia'
  const tramo = porMes ? 'mes' : 'día'
  const ganancia = Number(resumen?.ganancia || 0)
  const positiva = ganancia >= 0
  const valor = (cifra) => (cargando ? '—' : formatCurrency(cifra || 0))

  const kpis = [
    {
      id: 'ingresos',
      icon: Wallet,
      label: 'Ingresos',
      value: valor(resumen?.ingresos),
      helper: 'Facturas emitidas, pagadas o con abonos en el periodo (incluye fiado).',
      tone: 'text-success',
      ...(data ? badgeVariacion(resumen.ingresos, anterior.ingresos, nombreAnterior) : {}),
    },
    {
      id: 'gastos',
      icon: TrendingDown,
      label: 'Gastos',
      value: valor(resumen?.gastos),
      helper: 'Gastos registrados y no anulados, incluidos los insumos consumidos en consultas.',
      tone: 'text-danger',
      ...(data ? badgeVariacion(resumen.gastos, anterior.gastos, nombreAnterior, { mayorEsMejor: false }) : {}),
    },
    {
      id: 'ganancia',
      icon: positiva ? TrendingUp : TrendingDown,
      label: positiva ? 'Ganancia' : 'Pérdida',
      value: valor(ganancia),
      helper:
        resumen?.margen !== null && resumen?.margen !== undefined
          ? `Margen de ${resumen.margen.toLocaleString('es-CO')} % sobre los ingresos.`
          : 'Ingresos menos gastos del periodo.',
      tone: positiva ? 'text-success' : 'text-danger',
      ...(data ? badgeVariacion(resumen.ganancia, anterior.ganancia, nombreAnterior) : {}),
    },
    {
      id: 'ticket',
      icon: Receipt,
      label: 'Ticket promedio',
      value: valor(resumen?.ticketPromedio),
      helper: `${formatNumber(resumen?.ventas || 0)} ventas en el periodo.`,
      tone: 'text-info',
      ...(data ? badgeVariacion(resumen.ticketPromedio, anterior.ticketPromedio, nombreAnterior) : {}),
    },
  ]

  const destacado = (item, vacio) =>
    item ? { value: etiquetaPeriodo(item.periodo), badge: formatCurrency(item.valor) } : { value: vacio }

  const destacados = [
    {
      id: 'mejor',
      icon: TrendingUp,
      label: `Mejor ${tramo}`,
      tone: 'text-success',
      helper: `El ${tramo} con más ganancia.`,
      badgeTone: 'bg-success-soft text-success',
      ...destacado(data?.destacados?.mejor, '—'),
    },
    {
      id: 'peor',
      icon: TrendingDown,
      label: `${porMes ? 'Mes' : 'Día'} más flojo`,
      tone: 'text-warning',
      helper: `El ${tramo} con menos ganancia (solo cuenta los que tuvieron movimiento).`,
      badgeTone: 'bg-warning-soft text-warning',
      ...destacado(data?.destacados?.peor, '—'),
    },
    {
      id: 'mas-gasto',
      icon: CalendarRange,
      label: `${porMes ? 'Mes' : 'Día'} de más gasto`,
      tone: 'text-danger',
      helper: `El ${tramo} en que más se gastó.`,
      badgeTone: 'bg-danger-soft text-danger',
      ...destacado(data?.destacados?.masGasto, '—'),
    },
    {
      id: 'por-cobrar',
      icon: Wallet,
      label: 'Facturado sin cobrar',
      value: valor(resumen?.porCobrar),
      tone: 'text-warning',
      helper: 'Saldo de fiado que aún deben las ventas de este periodo.',
    },
  ]

  return (
    <div className="space-y-5">
      <SelectorPeriodo
        preset={preset}
        onPreset={setPreset}
        anio={anio}
        onAnio={setAnio}
        personalizado={personalizado}
        onPersonalizado={setPersonalizado}
      />

      {query.isError ? (
        <div className="rounded-xl bg-danger-soft px-4 py-4 text-sm leading-6 text-danger">
          {query.error?.response?.data?.message || 'No fue posible cargar el análisis del periodo.'}
        </div>
      ) : null}

      <KpiGrid items={kpis} />

      <ComparativoPanel
        title={`Ingresos vs gastos por ${tramo}`}
        subtitle={
          data
            ? `Del ${formatShortDate(data.periodo.fechaInicio)} al ${formatShortDate(data.periodo.fechaFin)}. La línea es la ganancia de cada ${tramo}.`
            : 'Cargando el periodo…'
        }
        data={serie}
        barras={[
          { dataKey: 'ingresos', name: 'Ingresos', color: COLOR_INGRESOS },
          { dataKey: 'gastos', name: 'Gastos', color: COLOR_GASTOS },
        ]}
        linea={{ dataKey: 'ganancia', name: 'Ganancia', color: COLOR_GANANCIA }}
        formatter={formatCurrency}
        axisFormatter={formatoEje}
        emptyMessage="No hay ingresos ni gastos en este periodo."
        action={
          <button
            type="button"
            onClick={() => setVerTabla((v) => !v)}
            aria-expanded={verTabla}
            className="inline-flex h-9 items-center rounded-lg bg-secondary px-3.5 text-[13px] font-semibold text-secondary-foreground transition hover:brightness-95 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {verTabla ? 'Ocultar tabla' : 'Ver como tabla'}
          </button>
        }
      />

      {verTabla ? (
        <DataTable
          title={`Detalle por ${tramo}`}
          subtitle="Las mismas cifras de la gráfica."
          rows={serie.map((fila) => ({ ...fila, id: fila.periodo }))}
          columns={[
            { key: 'name', label: porMes ? 'Mes' : 'Día' },
            columnaPesos('ingresos', 'Ingresos'),
            columnaPesos('gastos', 'Gastos'),
            {
              key: 'ganancia',
              label: 'Ganancia',
              render: (row) => (
                <span className={`font-semibold tabular-nums ${row.ganancia < 0 ? 'text-danger' : 'text-foreground'}`}>
                  {formatCurrency(row.ganancia)}
                </span>
              ),
            },
            { key: 'ventas', label: 'Ventas', render: (row) => <span className="tabular-nums">{formatNumber(row.ventas)}</span> },
          ]}
          emptyTitle="Sin datos"
          emptyBody="No hay movimientos en el periodo."
        />
      ) : null}

      <KpiGrid items={destacados} />

      <div className="grid gap-5 lg:grid-cols-2">
        <DonutCard
          title="Gastos por categoría"
          subtitle="En qué se fue el dinero del periodo."
          data={gastosPorCategoria}
          centerLabel="Gastos"
          centerValue={formatoEje(resumen?.gastos)}
          formatter={formatCurrency}
          emptyMessage="Sin gastos"
        />
        <DonutCard
          title="Ventas por tipo"
          subtitle="Lo facturado en servicios y en productos, antes de descuentos generales."
          data={ingresosPorTipo}
          centerLabel="Vendido"
          centerValue={formatoEje(ingresosPorTipo.reduce((suma, item) => suma + item.value, 0))}
          formatter={formatCurrency}
          emptyMessage="Sin ventas"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <TopLineas
          title="Servicios que más facturan"
          subtitle="Los cinco con más ingreso en el periodo."
          filas={data?.topServicios || []}
          sinCatalogo={data?.sinCatalogo?.servicio || 0}
          etiquetaSinCatalogo="Otros servicios sin catálogo"
          vacio="Sin servicios vendidos"
        />
        <TopLineas
          title="Productos más vendidos"
          subtitle="Los cinco con más ingreso en el periodo."
          filas={data?.topProductos || []}
          sinCatalogo={data?.sinCatalogo?.producto || 0}
          etiquetaSinCatalogo="Otros productos sin catálogo"
          vacio="Sin productos vendidos"
        />
      </div>
    </div>
  )
}
