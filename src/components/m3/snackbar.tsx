import { useEffect, useRef } from "react";

interface M3SnackbarProps {
  message: string | null;
  onDismiss: () => void;
  actionLabel?: string;
  onAction?: () => void;
  durationMs?: number;
}

export function M3Snackbar({
  message,
  onDismiss,
  actionLabel,
  onAction,
  durationMs = 4000,
}: M3SnackbarProps) {
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    if (!message) return;
    const id = setTimeout(() => onDismissRef.current(), durationMs);
    return () => clearTimeout(id);
  }, [message, durationMs]);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50"
    >
      {message && (
        <div
          className="m3-snackbar-enter flex items-center justify-between gap-4 min-w-[288px] max-w-[600px] rounded-[4px] px-4 py-3 shadow-elevation-2"
          style={{
            background: "var(--md-sys-color-inverse-surface)",
            color: "var(--md-sys-color-inverse-on-surface)",
          }}
        >
          <span className="text-sm">{message}</span>
          {actionLabel && onAction && (
            <button
              onClick={onAction}
              className="text-sm font-medium shrink-0"
              style={{ color: "var(--md-sys-color-primary-container)" }}
            >
              {actionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
