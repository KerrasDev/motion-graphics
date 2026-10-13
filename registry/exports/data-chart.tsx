/**
 * Standalone Remotion effect: Data Chart.
 * Source: data-chart/index.tsx.
 * Install dependencies: pnpm add remotion
 * Use inside a Remotion composition: <DataChart />
 * The component implementation below is generated from the original effect source.
 */
// packages/effects/data-chart/index.tsx
import { interpolate, useCurrentFrame } from "remotion";
export interface DataChartProps {
    "title"?: string;
    "data": {
        label: string;
        value: number;
    }[];
    "colors"?: string[];
    "duration"?: number;
    "showLabels"?: boolean;
}
function DataChart({ title = "Performance", data, colors = ["#2563eb", "#60a5fa", "#c084fc", "#fbbf24", "#10b981"], duration = 2, showLabels = true }: DataChartProps) {
    const frame = useCurrentFrame();
    const safeData = Array.isArray(data) && data.length > 0 ? data : [{ label: "A", value: 0 }];
    const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 1;
    const progress = Math.min(Math.max(frame / (safeDuration * 30), 0), 1);
    const maxValue = Math.max(...safeData.map((point) => Number.isFinite(point.value) ? Math.abs(point.value) : 0), 1);
    return <div style={{ display: "grid", gap: "12px", width: "100%", maxWidth: 520, color: "#0f172a" }}><div style={{ fontWeight: 700, fontSize: 24 }}>{title}</div><div style={{ display: "flex", alignItems: "end", gap: 12, minHeight: 200, padding: "8px 0" }}>{safeData.map((point, index) => {
            const barHeight = interpolate(progress, [0, 1], [0, Math.max(point.value, 0) / maxValue * 100], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp"
            });
            const color = colors[index % colors.length];
            return <div key={`${point.label}-${index}`} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}><div style={{ width: "100%", height: 150, display: "flex", alignItems: "end", justifyContent: "center" }}><div style={{
                    width: "80%",
                    height: `${Math.max(barHeight, 0)}%`,
                    background: color,
                    borderRadius: "10px 10px 0 0",
                    boxShadow: "inset 0 -8px 12px rgba(255,255,255,0.2)",
                    transition: "height 0.1s linear"
                }}/></div>{showLabels ? <div style={{ fontSize: 12, color: "#475569" }}>{point.label}</div> : null}</div>;
        })}</div></div>;
}
var data_chart_default = DataChart;
export { DataChart, data_chart_default as default };
