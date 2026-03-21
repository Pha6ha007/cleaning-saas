// dubai-control/src/components/maintenance/ProgressRing.tsx
// Circular progress ring for data visualization

import { cn } from "@/lib/utils";

interface ProgressRingProps {
  /** Value 0-100 */
  value: number;
  /** Size in pixels */
  size?: number;
  /** Stroke width */
  strokeWidth?: number;
  /** Color for the filled portion */
  color?: string;
  /** Color for the background track */
  trackColor?: string;
  className?: string;
}

export function ProgressRing({
  value,
  size = 48,
  strokeWidth = 4,
  color = "hsl(188 45% 24%)",
  trackColor = "hsl(var(--muted))",
  className,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const clamped = Math.min(100, Math.max(0, value));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <svg
      width={size}
      height={size}
      className={cn("shrink-0 -rotate-90", className)}
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      role="progressbar"
    >
      {/* Background track */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={trackColor}
        strokeWidth={strokeWidth}
      />
      {/* Filled portion */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-[stroke-dashoffset] duration-700 ease-out"
      />
    </svg>
  );
}
