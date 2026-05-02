import { useEffect, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTutorial } from "@/contexts/tutorial-context";
import { TUTORIAL_STEPS } from "./steps";
import { useMediaQuery } from "@/hooks/use-media-query";
import { M3Button } from "@/components/m3/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Position {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
  transform?: string;
}

const popoverVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

export function TutorialPopover() {
  const {
    currentStep,
    totalSteps,
    nextStep,
    prevStep,
    skipTutorial,
    completeTutorial,
  } = useTutorial();
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const [position, setPosition] = useState<Position>({});

  const step = TUTORIAL_STEPS[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === totalSteps - 1;
  const effectiveTargetId =
    !isDesktop && step.mobileTargetId ? step.mobileTargetId : step.targetId;
  const effectiveDescription =
    !isDesktop && step.mobileDescription
      ? step.mobileDescription
      : step.description;

  const computePosition = useCallback(() => {
    if (!isDesktop) return;
    if (!effectiveTargetId) {
      setPosition({
        top: window.innerHeight / 2,
        left: window.innerWidth / 2,
        transform: "translate(-50%, -50%)",
      });
      return;
    }
    const el = document.querySelector(
      `[data-tutorial-id="${effectiveTargetId}"]`,
    );
    if (!el) {
      setPosition({
        top: window.innerHeight / 2,
        left: window.innerWidth / 2,
        transform: "translate(-50%, -50%)",
      });
      return;
    }
    const r = el.getBoundingClientRect();
    const popoverWidth = 320;
    const gap = 16;

    // Right placement: position popover to the right of the target
    if (step.placement === "right") {
      const left = Math.min(
        r.right + gap,
        window.innerWidth - popoverWidth - 16,
      );
      const top = Math.max(16, Math.min(r.top + 16, window.innerHeight - 250));
      setPosition({ top, left });
      return;
    }

    const spaceBelow = window.innerHeight - r.bottom;
    let top: number;
    if (spaceBelow > 200) {
      top = r.bottom + gap;
    } else {
      top = r.top - gap - 200;
    }
    let left = r.left + r.width / 2 - popoverWidth / 2;
    left = Math.max(16, Math.min(left, window.innerWidth - popoverWidth - 16));
    top = Math.max(16, top);
    setPosition({ top, left });
  }, [isDesktop, effectiveTargetId, step.placement]);

  useEffect(() => {
    const timer = setTimeout(computePosition, 250);
    return () => clearTimeout(timer);
  }, [computePosition]);

  useEffect(() => {
    window.addEventListener("resize", computePosition);
    return () => window.removeEventListener("resize", computePosition);
  }, [computePosition]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isLast) {
          completeTutorial();
        } else {
          skipTutorial();
        }
      } else if (e.key === "ArrowRight") {
        nextStep();
      } else if (e.key === "ArrowLeft") {
        prevStep();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isLast, completeTutorial, skipTutorial, nextStep, prevStep]);

  const mobileStyle: React.CSSProperties = {
    position: "fixed",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 51,
    borderRadius: "28px 28px 0 0",
    padding: "24px",
    paddingBottom: "calc(24px + env(safe-area-inset-bottom))",
    background: "var(--md-sys-color-surface)",
    boxShadow: "0 -4px 16px rgba(0,0,0,0.15)",
  };

  const desktopStyle: React.CSSProperties = {
    position: "fixed",
    zIndex: 51,
    width: 320,
    borderRadius: 28,
    padding: 24,
    background: "var(--md-sys-color-surface)",
    ...position,
  };

  return (
    <div
      role="dialog"
      aria-label="Admin tutorial"
      aria-modal="true"
      style={{ pointerEvents: "auto" }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          variants={popoverVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.2 }}
          className="shadow-elevation-2"
          style={isDesktop ? desktopStyle : mobileStyle}
        >
          <p
            className="text-label-small mb-2"
            style={{ color: "var(--md-sys-color-on-surface-variant)" }}
            aria-live="polite"
          >
            Step {currentStep + 1} of {totalSteps}
          </p>
          <h2
            className="text-title-medium mb-1"
            style={{ color: "var(--md-sys-color-on-surface)" }}
          >
            {step.title}
          </h2>
          <p
            className="text-body-medium mb-6"
            style={{ color: "var(--md-sys-color-on-surface-variant)" }}
          >
            {effectiveDescription}
          </p>
          <div className="flex items-center justify-between">
            <div>
              {!isLast && (
                <M3Button variant="text" size="sm" onPress={skipTutorial}>
                  Skip
                </M3Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              {!isFirst && (
                <M3Button
                  variant="tonal"
                  size="sm"
                  onPress={prevStep}
                  startContent={<ChevronLeft size={16} />}
                >
                  Back
                </M3Button>
              )}
              {isLast ? (
                <M3Button variant="filled" size="sm" onPress={completeTutorial}>
                  Finish
                </M3Button>
              ) : (
                <M3Button
                  variant="filled"
                  size="sm"
                  onPress={nextStep}
                  endContent={<ChevronRight size={16} />}
                >
                  Next
                </M3Button>
              )}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
