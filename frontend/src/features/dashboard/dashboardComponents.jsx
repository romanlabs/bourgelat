import { createElement, useId } from 'react'
import { Link } from 'react-router-dom'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

function ChartTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null

  return (
    <div className="min-w-[120px] rounded-2xl border border-border bg-card px-3.5 py-2.5 shadow-dropdown">
      {label ? (
        <p className="mb-2 border-b border-border pb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {label}
        </p>
      ) : null}
      {payload.map((item) => (
        <div key={item.dataKey} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color || item.stroke }} />
            {item.name}
          </span>
          <span className="text-xs font-semibold text-card-foreground">
            {formatter ? formatter(item.value) : item.value}
          </span>
        </div>
      ))}
    </div>
  )
}

export function DashboardPanel({ title, subtitle, action, children, className = '' }) {
  return (
    <section
      className={`overflow-hidden rounded-[28px] border border-border bg-card shadow-[0_8px_32px_rgba(8,25,39,0.07)] ${className}`}
    >
      <div className="flex flex-col gap-3 border-b border-border px-5 py-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {title}
          </p>
          {subtitle ? <p className="mt-2 text-sm leading-6 text-muted-foreground">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  )
}

export function SidebarTabButton({ icon, label, active = false, onClick, badge }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded-[18px] border px-3 py-3 text-left text-sm transition ${
        active
          ? 'border-sidebar-primary/60 bg-sidebar-primary/15 text-sidebar-foreground'
          : 'border-sidebar-border bg-sidebar/80 text-sidebar-foreground hover:border-sidebar-border hover:bg-sidebar-accent'
      }`}
    >
      <span className="flex items-center gap-3">
        <span
          className={`flex h-9 w-9 items-center justify-center border ${
            active
              ? 'border-sidebar-primary/40 bg-sidebar-primary/10 text-sidebar-primary'
              : 'border-sidebar-border bg-sidebar text-sidebar-foreground/70'
          }`}
        >
          {createElement(icon, { className: 'h-4 w-4' })}
        </span>
        <span className="min-w-0 break-words text-left font-medium [overflow-wrap:anywhere]">{label}</span>
      </span>
      {badge ? (
        <span
          className={`shrink-0 border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${
            active
              ? 'border-sidebar-primary/40 text-sidebar-foreground'
              : 'border-sidebar-border text-sidebar-foreground/60'
          }`}
        >
          {badge}
        </span>
      ) : null}
    </button>
  )
}

export function KpiCard({
  icon,
  label,
  value,
  helper,
  tone = 'text-primary',
  borderTone = 'border-border',
  className = '',
}) {
  return (
    <div
      className={`flex h-full flex-col rounded-[24px] border bg-card px-4 py-4 shadow-card ${borderTone} ${className}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {label}
          </p>
          <p className="mt-4 text-3xl font-semibold leading-tight tabular-nums text-card-foreground [overflow-wrap:anywhere]">
            {value}
          </p>
        </div>
        <span className={`flex h-11 w-11 items-center justify-center border border-border bg-muted ${tone}`}>
          {createElement(icon, { className: 'h-5 w-5' })}
        </span>
      </div>
      {helper ? <p className="mt-4 text-sm leading-6 text-muted-foreground">{helper}</p> : null}
    </div>
  )
}

export function StatusPill({ children, tone = 'border-border bg-muted text-foreground' }) {
  return (
    <span
      className={`inline-flex max-w-full items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${tone} whitespace-normal break-words [overflow-wrap:anywhere]`}
    >
      {children}
    </span>
  )
}

export function DonutCard({
  title,
  subtitle,
  data,
  centerLabel,
  centerValue,
  formatter,
  emptyMessage,
  className = '',
  contentClassName = '',
  chartSize = 220,
}) {
  const hasData = data.some((item) => item.value > 0)

  return (
    <div
      className={`overflow-hidden rounded-[28px] border border-border bg-card shadow-card ${className}`}
    >
      <div className="border-b border-border px-5 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{title}</p>
        {subtitle ? <p className="mt-2 text-sm leading-6 text-muted-foreground">{subtitle}</p> : null}
      </div>
      <div className={`grid gap-5 p-5 2xl:grid-cols-[220px_minmax(0,1fr)] ${contentClassName}`.trim()}>
        <div className="relative mx-auto w-full" style={{ maxWidth: `${chartSize}px`, height: `${chartSize}px` }}>
          {hasData ? (
            <>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={62}
                    outerRadius={90}
                    paddingAngle={3}
                    stroke="none"
                    startAngle={90}
                    endAngle={-270}
                  >
                    {data.map((item) => (
                      <Cell key={item.key || item.name} fill={item.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip formatter={formatter} />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  {centerLabel}
                </span>
                <span className="mt-1.5 text-2xl font-bold tabular-nums text-card-foreground">{centerValue}</span>
              </div>
            </>
          ) : (
            <div className="flex h-full items-center justify-center rounded-full border-2 border-dashed border-border bg-muted text-xs font-medium text-muted-foreground">
              {emptyMessage}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2.5 2xl:flex-1">
          {data.map((item) => (
            <div key={item.key || item.name} className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="min-w-0 truncate text-sm text-muted-foreground">{item.name}</span>
              </div>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-card-foreground">
                {formatter ? formatter(item.value) : item.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function MiniDonutChart({
  data,
  centerLabel,
  centerValue,
  size = 92,
  thickness = 14,
  className = '',
}) {
  const hasData = data.some((item) => item.value > 0)
  const outerRadius = size / 2
  const innerRadius = outerRadius - thickness

  return (
    <div className={`relative shrink-0 ${className}`} style={{ width: size, height: size }}>
      {hasData ? (
        <>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius={innerRadius}
                outerRadius={outerRadius}
                paddingAngle={2}
                stroke="none"
              >
                {data.map((item) => (
                  <Cell key={item.key || item.name} fill={item.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {centerLabel}
            </span>
            <span className="mt-1 text-[13px] font-semibold leading-none text-card-foreground">
              {centerValue}
            </span>
          </div>
        </>
      ) : (
        <div className="flex h-full w-full items-center justify-center rounded-full border border-dashed border-border bg-muted text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Sin
        </div>
      )}
    </div>
  )
}

export function LinePanel({ title, subtitle, data, dataKey, color = '#0f4c81', formatter, emptyMessage }) {
  const gradientId = useId().replaceAll(':', '')
  const hasData = data.some((item) => Number(item[dataKey] || 0) > 0)

  return (
    <div className="overflow-hidden rounded-[28px] border border-border bg-card shadow-card">
      <div className="border-b border-border px-5 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{title}</p>
        {subtitle ? <p className="mt-2 text-sm leading-6 text-muted-foreground">{subtitle}</p> : null}
      </div>
      <div className="h-[300px] px-2 py-4">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ left: 4, right: 16, top: 8, bottom: 4 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.18} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="fecha"
                tickLine={false}
                axisLine={false}
                fontSize={11}
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                dy={6}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                fontSize={11}
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={(value) => (formatter ? formatter(value) : value)}
                width={72}
              />
              <Tooltip content={<ChartTooltip formatter={formatter} />} cursor={{ stroke: color, strokeWidth: 1, strokeDasharray: '4 4' }} />
              <Area
                type="monotone"
                dataKey={dataKey}
                stroke={color}
                strokeWidth={2.5}
                fill={`url(#${gradientId})`}
                dot={false}
                activeDot={{ r: 4, fill: color, strokeWidth: 2, stroke: 'hsl(var(--card))' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-border bg-muted text-sm text-muted-foreground">
            {emptyMessage}
          </div>
        )}
      </div>
    </div>
  )
}

function GradientBar({ fill, x, y, width, height }) {
  if (!height || height <= 0) return null
  return <rect x={x} y={y} width={width} height={height} fill={fill} rx={4} ry={4} />
}

export function BarPanel({ title, subtitle, data, dataKey, color = '#0f766e', formatter, emptyMessage }) {
  const gradientId = useId().replaceAll(':', '')
  const hasData = data.some((item) => Number(item[dataKey] || 0) > 0)

  return (
    <div className="overflow-hidden rounded-[28px] border border-border bg-card shadow-card">
      <div className="border-b border-border px-5 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{title}</p>
        {subtitle ? <p className="mt-2 text-sm leading-6 text-muted-foreground">{subtitle}</p> : null}
      </div>
      <div className="h-[300px] px-2 py-4">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ left: 4, right: 16, top: 8, bottom: 4 }} barCategoryGap="38%">
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={1} />
                  <stop offset="100%" stopColor={color} stopOpacity={0.55} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="name"
                tickLine={false}
                axisLine={false}
                fontSize={11}
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                dy={6}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                fontSize={11}
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={(value) => (formatter ? formatter(value) : value)}
                width={72}
              />
              <Tooltip content={<ChartTooltip formatter={formatter} />} cursor={{ fill: 'hsl(var(--muted))' }} />
              <Bar dataKey={dataKey} fill={`url(#${gradientId})`} radius={[4, 4, 0, 0]} maxBarSize={48} shape={<GradientBar fill={`url(#${gradientId})`} />} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-border bg-muted text-sm text-muted-foreground">
            {emptyMessage}
          </div>
        )}
      </div>
    </div>
  )
}

export function DataTable({ title, subtitle, columns, rows, emptyTitle, emptyBody, action }) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-border bg-card shadow-card">
      <div className="flex flex-col gap-3 border-b border-border px-5 py-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{title}</p>
          {subtitle ? <p className="mt-2 text-sm leading-6 text-muted-foreground">{subtitle}</p> : null}
        </div>
        {action}
      </div>

      {rows.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground"
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => (
                <tr key={row.id || row.key} className="transition hover:bg-muted/50">
                  {columns.map((column) => (
                    <td key={column.key} className="px-4 py-3 align-top text-foreground break-words [overflow-wrap:anywhere]">
                      {column.render ? column.render(row) : row[column.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="px-5 py-8">
          <div className="rounded-2xl border border-dashed border-border bg-muted px-4 py-6">
            <p className="text-sm font-semibold text-card-foreground">{emptyTitle}</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{emptyBody}</p>
          </div>
        </div>
      )}
    </div>
  )
}

export function EmptyModuleState({ title, body, ctaLabel, ctaTo = '/planes' }) {
  return (
    <div className="rounded-[28px] border border-border bg-card px-5 py-8 shadow-card">
      <p className="text-sm font-semibold text-card-foreground">{title}</p>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">{body}</p>
      {ctaLabel ? (
        <Link
          to={ctaTo}
          className="mt-5 inline-flex items-center gap-2 border border-border bg-foreground px-4 py-3 text-sm font-semibold text-background transition hover:bg-foreground/90"
        >
          {ctaLabel}
        </Link>
      ) : null}
    </div>
  )
}