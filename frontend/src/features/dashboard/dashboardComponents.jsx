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
    <div className="min-w-[120px] rounded-2xl border border-slate-100 bg-white px-3.5 py-2.5 shadow-[0_8px_30px_rgba(15,23,42,0.12)]">
      {label ? (
        <p className="mb-2 border-b border-slate-100 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
          {label}
        </p>
      ) : null}
      {payload.map((item) => (
        <div key={item.dataKey} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color || item.stroke }} />
            {item.name}
          </span>
          <span className="text-xs font-semibold text-slate-900">
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
      className={`overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.06)] ${className}`}
    >
      <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            {title}
          </p>
          {subtitle ? <p className="mt-2 text-sm leading-6 text-slate-600">{subtitle}</p> : null}
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
          ? 'border-cyan-500 bg-cyan-500/10 text-white'
          : 'border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-700 hover:bg-slate-900'
      }`}
    >
      <span className="flex items-center gap-3">
        <span className={`flex h-9 w-9 items-center justify-center border ${active ? 'border-cyan-400 bg-cyan-500/10 text-cyan-200' : 'border-slate-700 bg-slate-900 text-slate-300'}`}>
          {createElement(icon, { className: 'h-4 w-4' })}
        </span>
        <span className="min-w-0 break-words text-left font-medium [overflow-wrap:anywhere]">{label}</span>
      </span>
      {badge ? (
        <span className={`shrink-0 border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${active ? 'border-cyan-400/40 text-cyan-100' : 'border-slate-700 text-slate-400'}`}>
          {badge}
        </span>
      ) : null}
    </button>
  )
}

export function KpiCard({ icon, label, value, helper, tone = 'text-cyan-700', borderTone = 'border-slate-200' }) {
  return (
    <div
      className={`rounded-[24px] border bg-white px-4 py-4 shadow-[0_16px_40px_rgba(15,23,42,0.05)] ${borderTone}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            {label}
          </p>
          <p className="mt-4 text-3xl font-semibold leading-tight tabular-nums text-slate-950 [overflow-wrap:anywhere]">
            {value}
          </p>
        </div>
        <span className={`flex h-11 w-11 items-center justify-center border border-slate-200 bg-slate-50 ${tone}`}>
          {createElement(icon, { className: 'h-5 w-5' })}
        </span>
      </div>
      {helper ? <p className="mt-4 text-sm leading-6 text-slate-600">{helper}</p> : null}
    </div>
  )
}

export function StatusPill({ children, tone = 'border-slate-200 bg-slate-100 text-slate-700' }) {
  return (
    <span
      className={`inline-flex max-w-full items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${tone} whitespace-normal break-words [overflow-wrap:anywhere]`}
    >
      {children}
    </span>
  )
}

export function DonutCard({ title, subtitle, data, centerLabel, centerValue, formatter, emptyMessage }) {
  const hasData = data.some((item) => item.value > 0)

  return (
    <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.06)]">
      <div className="border-b border-slate-200 px-5 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{title}</p>
        {subtitle ? <p className="mt-2 text-sm leading-6 text-slate-600">{subtitle}</p> : null}
      </div>

      <div className="flex flex-col gap-6 p-5 2xl:flex-row 2xl:items-center">
        <div className="relative mx-auto h-[200px] w-full max-w-[200px] shrink-0">
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
                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  {centerLabel}
                </span>
                <span className="mt-1.5 text-2xl font-bold tabular-nums text-slate-950">{centerValue}</span>
              </div>
            </>
          ) : (
            <div className="flex h-full items-center justify-center rounded-full border-2 border-dashed border-slate-200 bg-slate-50 text-xs font-medium text-slate-400">
              {emptyMessage}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2.5 2xl:flex-1">
          {data.map((item) => (
            <div key={item.key || item.name} className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="min-w-0 truncate text-sm text-slate-600">{item.name}</span>
              </div>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-900">
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
            <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              {centerLabel}
            </span>
            <span className="mt-1 text-[13px] font-semibold leading-none text-slate-950">
              {centerValue}
            </span>
          </div>
        </>
      ) : (
        <div className="flex h-full w-full items-center justify-center rounded-full border border-dashed border-slate-200 bg-slate-50 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
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
    <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.06)]">
      <div className="border-b border-slate-200 px-5 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{title}</p>
        {subtitle ? <p className="mt-2 text-sm leading-6 text-slate-600">{subtitle}</p> : null}
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
              <CartesianGrid stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="fecha"
                tickLine={false}
                axisLine={false}
                fontSize={11}
                tick={{ fill: '#94a3b8' }}
                dy={6}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                fontSize={11}
                tick={{ fill: '#94a3b8' }}
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
                activeDot={{ r: 4, fill: color, strokeWidth: 2, stroke: '#fff' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-400">
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
    <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.06)]">
      <div className="border-b border-slate-200 px-5 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{title}</p>
        {subtitle ? <p className="mt-2 text-sm leading-6 text-slate-600">{subtitle}</p> : null}
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
              <CartesianGrid stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="name"
                tickLine={false}
                axisLine={false}
                fontSize={11}
                tick={{ fill: '#94a3b8' }}
                dy={6}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                fontSize={11}
                tick={{ fill: '#94a3b8' }}
                tickFormatter={(value) => (formatter ? formatter(value) : value)}
                width={72}
              />
              <Tooltip content={<ChartTooltip formatter={formatter} />} cursor={{ fill: '#f8fafc' }} />
              <Bar dataKey={dataKey} fill={`url(#${gradientId})`} radius={[4, 4, 0, 0]} maxBarSize={48} shape={<GradientBar fill={`url(#${gradientId})`} />} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-400">
            {emptyMessage}
          </div>
        )}
      </div>
    </div>
  )
}

export function DataTable({ title, subtitle, columns, rows, emptyTitle, emptyBody, action }) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.06)]">
      <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{title}</p>
          {subtitle ? <p className="mt-2 text-sm leading-6 text-slate-600">{subtitle}</p> : null}
        </div>
        {action}
      </div>

      {rows.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400"
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.id || row.key} className="transition hover:bg-slate-50/80">
                  {columns.map((column) => (
                    <td key={column.key} className="px-4 py-3 align-top text-slate-700 break-words [overflow-wrap:anywhere]">
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
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6">
            <p className="text-sm font-semibold text-slate-900">{emptyTitle}</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">{emptyBody}</p>
          </div>
        </div>
      )}
    </div>
  )
}

export function EmptyModuleState({ title, body, ctaLabel, ctaTo = '/planes' }) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white px-5 py-8 shadow-[0_18px_55px_rgba(15,23,42,0.06)]">
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">{body}</p>
      {ctaLabel ? (
        <Link
          to={ctaTo}
          className="mt-5 inline-flex items-center gap-2 border border-slate-200 bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          {ctaLabel}
        </Link>
      ) : null}
    </div>
  )
}
