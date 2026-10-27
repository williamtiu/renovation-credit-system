'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'

const JOINT_COLORS = [
  '#f59e0b', '#10b981', '#f43f5e', '#a78bfa',
  '#14b8a6', '#eab308', '#fb923c',
]

const chartConfig = {
  J1: { label: 'J1 肩俯仰', color: JOINT_COLORS[0] },
  J2: { label: 'J2 肩側擺', color: JOINT_COLORS[1] },
  J3: { label: 'J3 肩旋轉', color: JOINT_COLORS[2] },
  J4: { label: 'J4 肘屈伸', color: JOINT_COLORS[3] },
  J5: { label: 'J5 前臂旋轉', color: JOINT_COLORS[4] },
  J6: { label: 'J6 腕俯仰', color: JOINT_COLORS[5] },
  J7: { label: 'J7 腕旋轉', color: JOINT_COLORS[6] },
} satisfies ChartConfig

interface TelemetryChartProps {
  history: Array<Record<string, number>>
  /** 顯示嘅關節 id 列表（1-7）；空 = 全部 */
  visibleJoints?: number[]
}

export function TelemetryChart({ history, visibleJoints }: TelemetryChartProps) {
  const visible = visibleJoints ?? [1, 2, 3, 4, 5, 6, 7]
  const domain: [number, number] =
    visible.length === 1 && history.length > 0
      ? (() => {
          const vals = history.map((h) => h[`J${visible[0]}`] ?? 0)
          const lo = Math.min(...vals), hi = Math.max(...vals)
          const pad = Math.max(0.15, (hi - lo) * 0.2)
          return [lo - pad, hi + pad]
        })()
      : [-3.2, 3.2]

  return (
    <ChartContainer config={chartConfig} className="h-[220px] w-full">
      <LineChart data={history} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
        <CartesianGrid stroke="#27272a" strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="t"
          tick={false}
          tickLine={false}
          axisLine={{ stroke: '#3f3f46' }}
          label={{ value: '時間 →', position: 'insideBottomRight', fill: '#71717a', fontSize: 10, offset: -2 }}
        />
        <YAxis
          domain={domain}
          tick={{ fill: '#71717a', fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => v.toFixed(1)}
        />
        <ChartTooltip
          cursor={{ stroke: '#52525b', strokeDasharray: '4 4' }}
          content={
            <ChartTooltipContent
              indicator="line"
              labelFormatter={(_, p) =>
                p && p.length ? `t = ${((p[0].payload?.t as number) ?? 0) / 10} s 前` : ''
              }
              formatter={(value, name) => (
                <div className="flex w-full items-center justify-between gap-2">
                  <span className="text-xs text-zinc-400">{name}</span>
                  <span className="font-mono text-xs text-zinc-100">
                    {(value as number).toFixed(3)} rad
                  </span>
                </div>
              )}
            />
          }
        />
        {visible.map((j) => (
          <Line
            key={j}
            type="monotone"
            dataKey={`J${j}`}
            stroke={JOINT_COLORS[j - 1]}
            strokeWidth={1.6}
            dot={false}
            isAnimationActive={false}
            connectNulls
          />
        ))}
      </LineChart>
    </ChartContainer>
  )
}
