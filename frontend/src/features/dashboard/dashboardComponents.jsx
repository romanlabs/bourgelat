import { createElement } from 'react'
import { Link } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
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
    <div className="border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
      {label ? <p className="mb-1 font-semibold text-slate-900">{label}</p> : null}
      {payload.map((item) => (
        <div key={item.dataKey} className="flex items-center justify-between gap-4 text-slate-600">
          <span>{item.name}</span>
          <span className="font-semibold text-slate-900">
            {formatter ? formatter(item.value) : item.value}
          </span>
        </div>
      ))}
    </div>
  )
}

export function DashboardPanel({ title, subtitle, action, children, className = '' }) {
  return (
    <section className={`border border-slate-200 bg-white shadow-sm ${className}`}>
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
      className={`flex w-full items-center justify-between border px-3 py-3 text-left text-sm transition ${
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
    <div className={`border bg-white px-4 py-4 shadow-sm ${borderTone}`}>
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
    <span className={`inline-flex max-w-full items-center border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${tone} whitespace-normal break-words [overflow-wrap:anywhere]`}>
      {children}
    </span>
  )
}

export function DonutCard({ title, subtitle, data, centerLabel, centerValue, formatter, emptyMessage }) {
  const hasData = data.some((item) => item.value > 0)

  return (
    <div className="border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{title}</p>
        {subtitle ? <p className="mt-2 text-sm leading-6 text-slate-600">{subtitle}</p> : null}
      </div>
      <div className="grid gap-5 p-5 2xl:grid-cols-[220px_minmax(0,1fr)]">
        <div className="relative mx-auto h-[220px] w-full max-w-[220px]">
          {hasData ? (
            <>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={64}
                    outerRadius={96}
                    paddingAngle={2}
                    stroke="none"
                  >
                    {data.map((item) => (
                      <Cell key={item.key || item.name} fill={item.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip formatter={formatter} />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  {centerLabel}
                </span>
                <span className="mt-2 text-2xl font-semibold text-slate-950">{centerValue}</span>
              </div>
            </>
          ) : (
            <div className="flex h-full items-center justify-center border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
              {emptyMessage}
            </div>
          )}
        </div>

        <div className="space-y-3">
          {data.map((item) => (
            <div
              key={item.key || item.name}
              className="flex flex-col gap-2 border border-slate-200 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="h-3 w-3" style={{ backgroundColor: item.color }} />
                <span className="min-w-0 break-words text-sm text-slate-700 [overflow-wrap:anywhere]">
                  {item.name}
                </span>
              </div>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-950 [overflow-wrap:anywhere] sm:text-right">
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
  const hasData = data.some((item) => Number(item[dataKey] || 0) > 0)

  return (
    <div className="border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{title}</p>
        {subtitle ? <p className="mt-2 text-sm leading-6 text-slate-600">{subtitle}</p> : null}
      </div>
      <div className="h-[320px] p-4">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ left: 8, right: 8, top: 12, bottom: 8 }}>
              <CartesianGrid stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="fecha" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis
                tickLine={false}
                axisLine={false}
                fontSize={12}
                tickFormatter={(value) => (formatter ? formatter(value) : value)}
              />
              <Tooltip content={<ChartTooltip formatter={formatter} />} />
              <Line
                type="monotone"
                dataKey={dataKey}
                stroke={color}
                strokeWidth={3}
                dot={{ r: 0 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
            {emptyMessage}
          </div>
        )}
      </div>
    </div>
  )
}

export function BarPanel({ title, subtitle, data, dataKey, color = '#0f766e', formatter, emptyMessage }) {
  const hasData = data.some((item) => Number(item[dataKey] || 0) > 0)

  return (
    <div className="border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{title}</p>
        {subtitle ? <p className="mt-2 text-sm leading-6 text-slate-600">{subtitle}</p> : null}
      </div>
      <div className="h-[320px] p-4">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ left: 8, right: 8, top: 12, bottom: 8 }}>
              <CartesianGrid stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis
                tickLine={false}
                axisLine={false}
                fontSize={12}
                tickFormatter={(value) => (formatter ? formatter(value) : value)}
              />
              <Tooltip content={<ChartTooltip formatter={formatter} />} />
              <Bar dataKey={dataKey} fill={color} radius={0} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
            {emptyMessage}
          </div>
        )}
      </div>
    </div>
  )
}

export function DataTable({ title, subtitle, columns, rows, emptyTitle, emptyBody, action }) {
  return (
    <div className="border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{title}</p>
          {subtitle ? <p className="mt-2 text-sm leading-6 text-slate-600">{subtitle}</p> : null}
        </div>
        {action}
      </div>

      {rows.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500"
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {rows.map((row) => (
                <tr key={row.id || row.key} className="hover:bg-slate-50">
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
          <div className="border border-dashed border-slate-200 bg-slate-50 px-4 py-6">
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
    <div className="border border-slate-200 bg-white px-5 py-8 shadow-sm">
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
