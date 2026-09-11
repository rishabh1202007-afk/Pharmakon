import { useMemo, useState } from 'react';

export interface TrendPoint {
  label: string;
  value: number;
}

export interface TrendSeries {
  key: string;
  name: string;
  colorClass: string;
  mode: 'realtime' | 'historical';
  points: TrendPoint[];
  riskPointIndexes?: number[];
}

interface TrendChartProps {
  title: string;
  yAxisLabel: string;
  series: TrendSeries[];
}

interface HoverState {
  seriesName: string;
  xLabel: string;
  value: number;
}

const CHART_WIDTH = 860;
const CHART_HEIGHT = 260;
const PADDING_LEFT = 52;
const PADDING_RIGHT = 16;
const PADDING_TOP = 20;
const PADDING_BOTTOM = 34;

function toPath(points: { x: number; y: number }[]): string {
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x} ${point.y}`).join(' ');
}

function buildRiskSegments(points: { x: number; y: number }[], riskPointIndexes?: number[]): string[] {
  if (!riskPointIndexes?.length) {
    return [];
  }

  const sortedIndexes = [...new Set(riskPointIndexes)]
    .filter((index) => index >= 0 && index < points.length)
    .sort((left, right) => left - right);

  const segments: string[] = [];

  for (let index = 0; index < sortedIndexes.length - 1; index += 1) {
    const current = sortedIndexes[index];
    const next = sortedIndexes[index + 1];

    if (next === current + 1) {
      segments.push(`M${points[current].x} ${points[current].y} L${points[next].x} ${points[next].y}`);
    }
  }

  return segments;
}

export function TrendChart({ title, yAxisLabel, series }: TrendChartProps) {
  const [hover, setHover] = useState<HoverState | null>(null);

  const plottedSeries = useMemo(() => {
    const allValues = series.flatMap((entry) => entry.points.map((point) => point.value));
    const max = Math.max(...allValues);
    const min = Math.min(...allValues);
    const span = Math.max(1, max - min);

    const sampleCount = series[0]?.points.length ?? 0;
    const xStep = sampleCount > 1 ? (CHART_WIDTH - PADDING_LEFT - PADDING_RIGHT) / (sampleCount - 1) : 0;

    const scaled = series.map((entry) => {
      const points = entry.points.map((point, index) => {
        const x = PADDING_LEFT + xStep * index;
        const yNorm = (point.value - min) / span;
        const y = PADDING_TOP + (1 - yNorm) * (CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM);
        return { x, y, source: point };
      });

      return {
        ...entry,
        points,
        path: toPath(points),
        riskSegments: buildRiskSegments(points, entry.riskPointIndexes),
      };
    });

    const yTicks = Array.from({ length: 5 }).map((_, index) => {
      const value = min + (span / 4) * (4 - index);
      const y = PADDING_TOP + (index / 4) * (CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM);
      return { y, value: Number(value.toFixed(1)) };
    });

    return {
      min,
      max,
      xLabels: series[0]?.points.map((point) => point.label) ?? [],
      xStep,
      data: scaled,
      yTicks,
    };
  }, [series]);

  return (
    <section className="trend-chart-shell">
      <header className="trend-chart-header">
        <div>
          <h3>{title}</h3>
          <p>{yAxisLabel}</p>
        </div>
        <div className="trend-hover-readout">
          {hover ? (
            <>
              <span>{hover.seriesName}</span>
              <strong>{hover.value}</strong>
              <small>{hover.xLabel}</small>
            </>
          ) : (
            <>
              <span>Hover point</span>
              <strong>—</strong>
              <small>Awaiting cursor</small>
            </>
          )}
        </div>
      </header>

      <svg viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} className="trend-chart" role="img" aria-label={title}>
        {plottedSeries.yTicks.map((tick) => (
          <g key={tick.y}>
            <line x1={PADDING_LEFT} x2={CHART_WIDTH - PADDING_RIGHT} y1={tick.y} y2={tick.y} className="grid-line" />
            <text x={PADDING_LEFT - 8} y={tick.y + 4} textAnchor="end" className="axis-label">
              {tick.value}
            </text>
          </g>
        ))}

        {plottedSeries.data.map((entry) => (
          <path
            key={entry.key}
            d={entry.path}
            className={`series-line ${entry.colorClass} ${entry.mode === 'historical' ? 'series-historical' : 'series-realtime'}`}
          />
        ))}

        {plottedSeries.data.map((entry) =>
          entry.riskSegments.map((segment, index) => (
            <path key={`${entry.key}-risk-${index}`} d={segment} className={`series-risk-focus ${entry.colorClass}`} />
          )),
        )}

        {plottedSeries.data.map((entry) =>
          entry.points.map((point, index) => (
            <circle
              key={`${entry.key}-${index}`}
              cx={point.x}
              cy={point.y}
              r={3}
              className={`series-point ${entry.colorClass} ${entry.riskPointIndexes?.includes(index) ? 'series-point-risk' : ''}`}
              onMouseEnter={() =>
                setHover({
                  seriesName: entry.name,
                  value: Number(point.source.value.toFixed(2)),
                  xLabel: point.source.label,
                })
              }
              onMouseLeave={() => setHover(null)}
            />
          )),
        )}

        {plottedSeries.xLabels.map((label, index) => {
          const x = PADDING_LEFT + plottedSeries.xStep * index;
          return (
            <text key={label} x={x} y={CHART_HEIGHT - 10} textAnchor="middle" className="axis-label">
              {label}
            </text>
          );
        })}
      </svg>

      <footer className="trend-chart-legend">
        <span className="legend-mode realtime">Real-time (solid)</span>
        <span className="legend-mode historical">Historical baseline (dashed)</span>
      </footer>
    </section>
  );
}
