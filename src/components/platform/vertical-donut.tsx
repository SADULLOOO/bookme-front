"use client";

import { useState } from "react";
import { useT } from "@/lib/i18n/use-t";

export interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

export function VerticalDonut({ segments, size = 132, thickness = 20 }: { segments: DonutSegment[]; size?: number; thickness?: number }) {
  const t = useT();
  const total = segments.reduce((sum, s) => sum + s.value, 0) || 1;
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const arcs = segments.reduce<Array<DonutSegment & { dash: number; offset: number; idx: number; pct: number }>>(
    (acc, s, i) => {
      const frac = s.value / total;
      const dash = frac * circumference;
      const prevOffset = acc.length > 0 ? acc[acc.length - 1].offset + acc[acc.length - 1].dash : 0;
      acc.push({ ...s, dash, offset: prevOffset, idx: i, pct: Math.round(frac * 100) });
      return acc;
    },
    [],
  );

  return (
    <div className="flex items-center gap-5">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0 overflow-visible">
        <title>{t("platform.businessesByVertical")}</title>
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--glass-border)" strokeWidth={thickness} />
          {arcs.map((a) => (
            <circle
              key={a.label}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={a.color}
              strokeDasharray={`${a.dash} ${circumference - a.dash}`}
              strokeDashoffset={-a.offset}
              strokeLinecap={arcs.length > 1 ? "round" : "round"}
              opacity={hoverIdx === null || hoverIdx === a.idx ? 1 : 0.3}
              onMouseEnter={() => setHoverIdx(a.idx)}
              onMouseLeave={() => setHoverIdx(null)}
              className="cursor-pointer transition-[opacity,stroke-width] duration-150"
              style={{ strokeWidth: hoverIdx === a.idx ? thickness + 5 : thickness }}
            />
          ))}
        </g>
        <text x="50%" y="47%" textAnchor="middle" className="fill-ink font-mono text-[22px] font-bold">
          {total}
        </text>
        <text x="50%" y="61%" textAnchor="middle" className="fill-sub-2 text-[9px]">
          {t("platform.total")}
        </text>
      </svg>
      <ul className="flex flex-1 flex-col gap-2">
        {arcs.map((a, i) => (
          <li
            key={a.label}
            onMouseEnter={() => setHoverIdx(i)}
            onMouseLeave={() => setHoverIdx(null)}
            className="flex cursor-pointer items-center justify-between gap-2 rounded-md px-1 py-0.5 text-[12.5px] transition-colors"
            style={{ background: hoverIdx === i ? "var(--glass-fill)" : "transparent" }}
          >
            <span className="flex min-w-0 items-center gap-2">
              <span className="size-2.5 shrink-0 rounded-full" style={{ background: a.color }} />
              <span className="truncate text-ink">{a.label}</span>
            </span>
            <span className="shrink-0 font-mono font-semibold text-sub">{a.pct}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
