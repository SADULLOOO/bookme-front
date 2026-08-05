"use client";

import { useId, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { useLocaleStore, LOCALE_INTL_TAG } from "@/lib/stores/locale-store";
import { useT } from "@/lib/i18n/use-t";

interface Point {
  month: string;
  count: number;
}

function fillMonths(series: Point[], monthsBack = 6): Point[] {
  const map = new Map(series.map((s) => [s.month, s.count]));
  const out: Point[] = [];
  const now = new Date();
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    out.push({ month: key, count: map.get(key) ?? 0 });
  }
  return out;
}

function monthLabel(key: string, intlTag: string) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(intlTag, { month: "short" });
}

/** Catmull-Rom through the data points, converted to cubic beziers — an
 * organic curve instead of straight segments zig-zagging between months. */
function smoothPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M${points[0].x},${points[0].y}`;
  let d = `M${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return d;
}

export function GrowthChart({ data, color, total }: { data: Point[]; color: string; total?: number }) {
  const t = useT();
  const intlTag = LOCALE_INTL_TAG[useLocaleStore((s) => s.locale)];
  const gradientId = useId();
  const filled = fillMonths(data);
  const width = 600;
  const height = 220;
  const padTop = 36;
  const padBottom = 28;
  const padX = 8;

  const max = Math.max(...filled.map((d) => d.count), 1);
  const gridSteps = 3;
  const gridValues = Array.from({ length: gridSteps + 1 }, (_, i) => Math.round((max / gridSteps) * i));

  const stepX = filled.length > 1 ? (width - padX * 2) / (filled.length - 1) : 0;
  const points = filled.map((d, i) => ({
    x: padX + i * stepX,
    y: height - padBottom - (d.count / max) * (height - padTop - padBottom),
    ...d,
  }));

  const linePath = smoothPath(points);
  const last = points[points.length - 1];
  const areaPath = `${linePath} L${last.x.toFixed(1)},${height - padBottom} L${points[0].x.toFixed(1)},${height - padBottom} Z`;

  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  function handleMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * width;
    let closest = 0;
    let closestDist = Infinity;
    points.forEach((p, i) => {
      const dist = Math.abs(p.x - x);
      if (dist < closestDist) {
        closest = i;
        closestDist = dist;
      }
    });
    setHoverIdx(closest);
  }

  const hovered = hoverIdx != null ? points[hoverIdx] : null;
  const totalValue = total ?? last.count;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full cursor-crosshair"
        onMouseMove={handleMove}
        onMouseLeave={() => setHoverIdx(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.32} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>

        {gridValues.map((v, i) => {
          const y = height - padBottom - (v / max) * (height - padTop - padBottom);
          return (
            <g key={i}>
              <line x1={padX} y1={y} x2={width - padX} y2={y} stroke="var(--glass-border)" strokeWidth={1} />
              <text x={0} y={y - 4} className="fill-sub-2" style={{ font: "10px ui-monospace, monospace" }}>
                {v}
              </text>
            </g>
          );
        })}

        <path d={areaPath} fill={`url(#${gradientId})`} />
        <path d={linePath} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />

        {hovered && (
          <>
            <line
              x1={hovered.x}
              y1={padTop}
              x2={hovered.x}
              y2={height - padBottom}
              stroke={color}
              strokeOpacity={0.25}
              strokeDasharray="3 3"
            />
            <circle cx={hovered.x} cy={hovered.y} r={5} fill={color} stroke="var(--bg-1)" strokeWidth={2.5} />
          </>
        )}

        <circle cx={last.x} cy={last.y} r={4} fill={color} />
      </svg>

      {/* Endpoint marker + total, floating over the SVG like the reference's badge */}
      <div
        className="pointer-events-none absolute flex -translate-y-1/2 items-center gap-2"
        style={{ left: `${(last.x / width) * 100}%`, top: `${(last.y / height) * 100}%` }}
      >
        <span
          className="flex size-7 shrink-0 -translate-x-1/2 items-center justify-center rounded-full text-white shadow-[0_4px_12px_-2px_rgba(0,0,0,0.35)]"
          style={{ background: color }}
        >
          <ArrowUpRight className="size-3.5" />
        </span>
        <span className="glass -ml-1 rounded-lg px-2.5 py-1 whitespace-nowrap">
          <span className="block font-mono text-[13px] font-bold text-ink">{totalValue}</span>
          <span className="block text-[9px] text-sub-2">{t("platform.total")}</span>
        </span>
      </div>

      <div className="mt-1 flex justify-between px-0.5 font-mono text-[10px] text-sub-2">
        {filled.map((d) => (
          <span key={d.month}>{monthLabel(d.month, intlTag)}</span>
        ))}
      </div>

      {hovered && (
        <div
          className="glass pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[calc(100%+10px)] rounded-lg px-3 py-1.5 whitespace-nowrap"
          style={{ left: `${(hovered.x / width) * 100}%`, top: `${(hovered.y / height) * 100}%` }}
        >
          <div className="font-mono text-[13px] font-bold text-ink">{hovered.count}</div>
          <div className="text-[10px] text-sub-2">{monthLabel(hovered.month, intlTag)}</div>
        </div>
      )}
    </div>
  );
}
