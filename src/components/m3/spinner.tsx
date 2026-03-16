import clsx from "clsx";

const SIZE_MAP = { sm: 24, md: 36, lg: 48 } as const;

interface M3SpinnerProps {
  size?: "sm" | "md" | "lg";
  color?: string;
  className?: string;
  label?: string;
}

export function M3Spinner({
  size = "md",
  color = "var(--md-sys-color-primary)",
  className,
  label,
}: M3SpinnerProps) {
  const px = SIZE_MAP[size];

  const svg = (
    <svg
      width={px}
      height={px}
      viewBox="0 0 48 48"
      className={clsx("m3-spinner-rotate", className)}
      role="status"
      aria-label="Loading"
    >
      <circle
        className="m3-spinner-arc"
        cx="24"
        cy="24"
        r="20"
        fill="none"
        stroke={color}
        strokeWidth={4}
        strokeLinecap="round"
        strokeDasharray="1, 200"
        strokeDashoffset="0"
      />
    </svg>
  );

  if (!label) return svg;

  return (
    <div className="flex flex-col items-center gap-2">
      {svg}
      <p
        className="text-sm"
        style={{ color: "var(--md-sys-color-on-surface-variant)" }}
      >
        {label}
      </p>
    </div>
  );
}
