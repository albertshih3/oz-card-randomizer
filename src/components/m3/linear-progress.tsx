interface LinearProgressProps {
  visible: boolean;
  color?: string;
  trackColor?: string;
  className?: string;
}

export function LinearProgress({
  visible,
  color = "var(--md-sys-color-primary)",
  trackColor = "var(--md-sys-color-surface-variant)",
  className,
}: LinearProgressProps) {
  return (
    <div
      role="progressbar"
      aria-label="Loading"
      aria-hidden={!visible}
      className={`h-1 transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"} ${className ?? ""}`}
    >
      <div
        style={{
          backgroundColor: trackColor,
          position: "relative",
          overflow: "hidden",
          height: "100%",
        }}
      >
        <div className="m3-linear-bar1" style={{ backgroundColor: color }} />
        <div className="m3-linear-bar2" style={{ backgroundColor: color }} />
      </div>
    </div>
  );
}
