"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Radar, AlertTriangle, CheckCircle2 } from "lucide-react";

export type PieSlice = {
  label: string;
  value: number;
  color: string;
};

export type RadarAxis = {
  label: string;
  value: number; // 0-100 (coverage %)
  target?: number; // 100 by default
};

// ---------- Pie Chart (SVG, no external lib) ----------

export function RationPieChart({ slices, title, unit }: { slices: PieSlice[]; title: string; unit?: string }) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  const radius = 80;
  const cx = 100;
  const cy = 100;
  const innerRadius = 45; // donut

  const segments = useMemo(() => {
    if (total <= 0) return [];
    let cumAngle = -Math.PI / 2; // start at top
    return slices.map((s) => {
      const angle = (s.value / total) * 2 * Math.PI;
      const startAngle = cumAngle;
      const endAngle = cumAngle + angle;
      cumAngle = endAngle;

      const x1 = cx + radius * Math.cos(startAngle);
      const y1 = cy + radius * Math.sin(startAngle);
      const x2 = cx + radius * Math.cos(endAngle);
      const y2 = cy + radius * Math.sin(endAngle);
      const xi1 = cx + innerRadius * Math.cos(startAngle);
      const yi1 = cy + innerRadius * Math.sin(startAngle);
      const xi2 = cx + innerRadius * Math.cos(endAngle);
      const yi2 = cy + innerRadius * Math.sin(endAngle);

      const largeArc = angle > Math.PI ? 1 : 0;
      const pct = (s.value / total) * 100;

      // Path for donut segment
      const d = `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} L ${xi2} ${yi2} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${xi1} ${yi1} Z`;

      // Label position (midpoint of arc)
      const midAngle = (startAngle + endAngle) / 2;
      const labelR = (radius + innerRadius) / 2;
      const lx = cx + labelR * Math.cos(midAngle);
      const ly = cy + labelR * Math.sin(midAngle);

      return { ...s, d, pct, lx, ly, angle };
    });
  }, [slices, total]);

  return (
    <Card className="border-stone-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-semibold text-stone-700 flex items-center gap-2">
          <PieChart className="h-3.5 w-3.5 text-stone-500" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {total <= 0 ? (
          <div className="text-center text-xs text-stone-400 py-8">
            Aucune donnée à afficher.
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <svg viewBox="0 0 200 200" className="w-40 h-40 flex-shrink-0">
              {segments.map((seg, i) => (
                <path
                  key={i}
                  d={seg.d}
                  fill={seg.color}
                  stroke="white"
                  strokeWidth="1.5"
                  className="hover:opacity-80 transition-opacity"
                />
              ))}
              {/* Center text */}
              <text x={cx} y={cy - 4} textAnchor="middle" className="text-[10px] fill-stone-500 font-medium">
                Total
              </text>
              <text x={cx} y={cy + 10} textAnchor="middle" className="text-sm fill-stone-900 font-bold">
                {total.toFixed(2)}
              </text>
              {unit && (
                <text x={cx} y={cy + 22} textAnchor="middle" className="text-[8px] fill-stone-400">
                  {unit}
                </text>
              )}
            </svg>
            {/* Legend */}
            <div className="flex-1 space-y-1.5 w-full">
              {segments.map((seg, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className="w-3 h-3 rounded flex-shrink-0" style={{ backgroundColor: seg.color }} />
                  <span className="flex-1 text-stone-700 truncate">{seg.label}</span>
                  <span className="font-medium text-stone-900 tabular-nums">{seg.value.toFixed(2)}</span>
                  <span className="text-stone-400 tabular-nums w-10 text-right">{seg.pct.toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------- Radar Chart (SVG, no external lib) ----------

export function NutrientRadarChart({ axes, title }: { axes: RadarAxis[]; title: string }) {
  const size = 240;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = 90;
  const n = axes.length;

  // Grid rings at 25%, 50%, 75%, 100%
  const rings = [25, 50, 75, 100];

  // Axis points (vertices of regular polygon)
  const axisPoints = axes.map((_, i) => {
    const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
    return {
      x: cx + maxR * Math.cos(angle),
      y: cy + maxR * Math.sin(angle),
      angle,
    };
  });

  // Data polygon
  const dataPoints = axes.map((a, i) => {
    const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
    const r = Math.min(100, Math.max(0, a.value)) / 100 * maxR;
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
      value: a.value,
      label: a.label,
    };
  });

  const dataPath = dataPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z";

  // Target polygon (100% on all axes)
  const targetPath = axisPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z";

  return (
    <Card className="border-stone-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-semibold text-stone-700 flex items-center gap-2">
          <Radar className="h-3.5 w-3.5 text-stone-500" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <svg viewBox={`0 0 ${size} ${size}`} className="w-56 h-56 flex-shrink-0">
            {/* Grid rings (as polygons) */}
            {rings.map((ring, ri) => {
              const pts = axes.map((_, i) => {
                const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
                const r = (ring / 100) * maxR;
                return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
              }).join(" ");
              return (
                <polygon
                  key={ri}
                  points={pts}
                  fill="none"
                  stroke="#e7e5e4"
                  strokeWidth="1"
                  strokeDasharray={ring === 100 ? "0" : "2,2"}
                />
              );
            })}
            {/* Axes lines */}
            {axisPoints.map((p, i) => (
              <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#e7e5e4" strokeWidth="1" />
            ))}
            {/* Target polygon (100%) */}
            <polygon points={axisPoints.map((p) => `${p.x},${p.y}`).join(" ")} fill="none" stroke="#10b981" strokeWidth="1.5" strokeDasharray="3,3" />
            {/* Data polygon */}
            <polygon points={dataPoints.map((p) => `${p.x},${p.y}`).join(" ")} fill="rgba(16, 185, 129, 0.2)" stroke="#10b981" strokeWidth="2" />
            {/* Data points */}
            {dataPoints.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r="3" fill={p.value >= 95 && p.value <= 105 ? "#10b981" : p.value < 95 ? "#ef4444" : "#f59e0b"} stroke="white" strokeWidth="1" />
            ))}
            {/* Labels */}
            {axisPoints.map((p, i) => {
              const labelR = maxR + 18;
              const lx = cx + labelR * Math.cos(p.angle);
              const ly = cy + labelR * Math.sin(p.angle);
              const labelAnchor = Math.abs(Math.cos(p.angle)) < 0.3 ? "middle" : Math.cos(p.angle) > 0 ? "start" : "end";
              return (
                <text key={i} x={lx} y={ly} textAnchor={labelAnchor} dominantBaseline="middle" className="text-[9px] fill-stone-700 font-medium">
                  {axes[i].label}
                </text>
              );
            })}
            {/* Ring labels */}
            {rings.map((ring, ri) => (
              <text key={ri} x={cx + 2} y={cy - (ring / 100) * maxR + 3} className="text-[7px] fill-stone-400">
                {ring}%
              </text>
            ))}
          </svg>
          {/* Legend / status */}
          <div className="flex-1 space-y-1.5 w-full">
            <div className="flex items-center gap-2 text-xs text-stone-600 mb-2">
              <span className="w-3 h-3 rounded-sm bg-emerald-500/30 border-2 border-emerald-500" />
              Couverture actuelle
              <span className="w-3 h-3 rounded-sm border-2 border-emerald-500 border-dashed ml-2" />
              Objectif (100%)
            </div>
            {dataPoints.map((p, i) => {
              const v = p.value;
              const status = v >= 95 && v <= 105
                ? { color: "text-emerald-700", bg: "bg-emerald-50", icon: <CheckCircle2 className="h-3 w-3" />, label: "Équilibré" }
                : v < 95
                  ? { color: "text-rose-700", bg: "bg-rose-50", icon: <AlertTriangle className="h-3 w-3" />, label: "Déficit" }
                  : { color: "text-amber-700", bg: "bg-amber-50", icon: <AlertTriangle className="h-3 w-3" />, label: "Excès" };
              return (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className={`flex items-center gap-1 ${status.color}`}>
                    {status.icon}
                  </span>
                  <span className="flex-1 text-stone-700">{p.label}</span>
                  <span className={`font-medium tabular-nums ${status.color}`}>{v.toFixed(0)}%</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded ${status.bg} ${status.color} flex-shrink-0`}>{status.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
