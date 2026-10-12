import { interpolate, useCurrentFrame } from 'remotion';

export interface KineticTitleProps {
  text: string;
  color?: string;
  fontSize?: number;
  duration?: number;
  verticalOffset?: number;
  fadeIn?: boolean;
}

export function KineticTitle({
  text,
  color = '#0f172a',
  fontSize = 88,
  duration = 2,
  verticalOffset = 72,
  fadeIn = true,
}: KineticTitleProps) {
  const frame = useCurrentFrame();
  const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 1;
  const safeOffset = Number.isFinite(verticalOffset) ? Math.abs(verticalOffset) : 72;
  const progress = Math.min(Math.max(frame / (safeDuration * 30), 0), 1);
  const opacity = fadeIn ? interpolate(progress, [0, 0.18, 1], [0, 1, 1]) : 1;
  const translateY = interpolate(progress, [0, 0.3, 1], [safeOffset, 0, 0]);

  return (
    <div
      style={{
        opacity,
        transform: `translateY(${translateY}px)`,
        transition: 'transform 0.1s linear',
        color,
        fontSize: `${fontSize}px`,
        fontWeight: 700,
        letterSpacing: '-0.05em',
        lineHeight: 1,
        textAlign: 'center',
      }}
    >
      {text}
    </div>
  );
}

export default KineticTitle;
