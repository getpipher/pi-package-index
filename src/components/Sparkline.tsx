// Inline SVG sparkline for download trends. Pure presentational component
// (no client JS) — renders server-side inside the detail page RSC.

interface SparklineProps {
  /** weekly download buckets (e.g. 12 values from toWeeklyBuckets) */
  data: number[];
  width?: number;
  height?: number;
}

/**
 * Renders an SVG sparkline with a subtle area fill. Gracefully handles
 * empty, flat, or all-zero series by drawing a muted baseline so the layout
 * stays stable and the "no data" caption (rendered by the caller) makes sense.
 */
export function Sparkline({ data, width = 160, height = 36 }: SparklineProps) {
  const n = data.length;
  const hasData = n > 0 && data.some((v) => v > 0);
  const max = hasData ? Math.max(...data) : 1;
  const pad = 2;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;

  const points = hasData
    ? data.map((v, i) => {
        const x = pad + (n === 1 ? 0 : (i / (n - 1)) * innerW);
        const y = pad + innerH - (v / max) * innerH;
        return [x, y] as const;
      })
    : [];

  const linePath = points
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");

  const areaPath =
    points.length > 0
      ? `${linePath} L${points[points.length - 1]![0].toFixed(1)},${(pad + innerH).toFixed(1)} L${points[0]![0].toFixed(1)},${(pad + innerH).toFixed(1)} Z`
      : "";

  const baselineY = pad + innerH;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={hasData ? "12-week download trend" : "No download data"}
      preserveAspectRatio="none"
      className="text-emerald-400"
    >
      {hasData ? (
        <>
          <path d={areaPath} fill="currentColor" fillOpacity={0.12} />
          <path
            d={linePath}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </>
      ) : (
        <line
          x1={pad}
          y1={baselineY}
          x2={width - pad}
          y2={baselineY}
          stroke="currentColor"
          strokeOpacity={0.3}
          strokeWidth={1}
          strokeDasharray="2 2"
        />
      )}
    </svg>
  );
}