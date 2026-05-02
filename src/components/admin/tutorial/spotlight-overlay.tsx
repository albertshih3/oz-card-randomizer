import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface SpotlightOverlayProps {
  targetId: string | null;
}

export function SpotlightOverlay({ targetId }: SpotlightOverlayProps) {
  const [rect, setRect] = useState<Rect | null>(null);

  const measure = useCallback(() => {
    if (!targetId) {
      setRect(null);
      return;
    }
    const el = document.querySelector(`[data-tutorial-id="${targetId}"]`);
    if (!el) {
      setRect(null);
      return;
    }
    const r = el.getBoundingClientRect();
    setRect({ x: r.x, y: r.y, width: r.width, height: r.height });
  }, [targetId]);

  useEffect(() => {
    const timer = setTimeout(measure, 200);
    return () => clearTimeout(timer);
  }, [measure]);

  useEffect(() => {
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);

  const padding = 8;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        pointerEvents: "none",
      }}
    >
      <svg width="100%" height="100%">
        {rect ? (
          <>
            <defs>
              <mask id="spotlight-mask">
                <rect fill="white" width="100%" height="100%" />
                <motion.rect
                  fill="black"
                  rx={10}
                  animate={{
                    x: rect.x - padding,
                    y: rect.y - padding,
                    width: rect.width + padding * 2,
                    height: rect.height + padding * 2,
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 30,
                  }}
                />
              </mask>
            </defs>
            <rect
              fill="rgba(0,0,0,0.55)"
              width="100%"
              height="100%"
              mask="url(#spotlight-mask)"
            />
          </>
        ) : (
          <rect fill="rgba(0,0,0,0.55)" width="100%" height="100%" />
        )}
      </svg>
    </div>
  );
}
