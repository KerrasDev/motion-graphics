/**
 * Standalone Remotion effect: Number Counter.
 * Source: number-counter/index.tsx.
 * Install dependencies: pnpm add remotion
 * Use inside a Remotion composition: <NumberCounter />
 * The component implementation below is generated from the original effect source.
 */
// packages/effects/number-counter/index.tsx
import { interpolate, useCurrentFrame } from "remotion";
export interface NumberCounterProps {
    "start"?: number;
    "end": number;
    "duration"?: number;
    "precision"?: number;
    "prefix"?: string;
    "suffix"?: string;
}
function NumberCounter({ start = 0, end, duration = 2, precision = 0, prefix = "", suffix = "" }: NumberCounterProps) {
    const frame = useCurrentFrame();
    const safePrecision = Number.isFinite(precision) && precision >= 0 ? Math.min(Math.floor(precision), 4) : 0;
    const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 1e-3;
    const progress = Math.min(Math.max(frame / (safeDuration * 30), 0), 1);
    const normalized = interpolate(progress, [0, 1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    const current = start + (end - start) * normalized;
    const factor = 10 ** safePrecision;
    const value = Math.round(current * factor) / factor;
    return <span style={{ fontSize: "4rem", fontWeight: 700, color: "#0f172a" }}>{prefix}{value.toFixed(safePrecision)}{suffix}</span>;
}
var number_counter_default = NumberCounter;
export { NumberCounter, number_counter_default as default };
