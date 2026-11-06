import { motion, useReducedMotion } from "framer-motion";
import type { TutorialTarget } from "./use-tutorial-target";

const PADDING = 8;

export function SpotlightOverlay({ target }: { target: TutorialTarget }) {
  const shouldReduceMotion = useReducedMotion();
  const { rect, status } = target;
  const hole = rect && {
    x: rect.x - PADDING,
    y: rect.y - PADDING,
    width: rect.width + PADDING * 2,
    height: rect.height + PADDING * 2,
  };

  return (
    <div
      data-testid="tutorial-spotlight"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        // With nothing to point at, let the page underneath stay usable: it may
        // be showing an empty state or a retry control.
        pointerEvents: status === "unavailable" ? "none" : "auto",
      }}
    >
      <svg width="100%" height="100%">
        {hole ? (
          <>
            <defs>
              <mask id="spotlight-mask">
                <rect fill="white" width="100%" height="100%" />
                <motion.rect
                  fill="black"
                  rx={10}
                  initial={hole}
                  animate={hole}
                  transition={
                    shouldReduceMotion
                      ? { duration: 0 }
                      : { type: "spring", stiffness: 300, damping: 30 }
                  }
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
