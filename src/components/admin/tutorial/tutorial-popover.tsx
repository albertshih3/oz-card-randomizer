import { useEffect, useLayoutEffect, useState, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useTutorial } from "@/contexts/tutorial-context";
import { TUTORIAL_STEPS } from "./steps";
import type { TutorialTarget } from "./use-tutorial-target";
import { useMediaQuery } from "@/hooks/use-media-query";
import { M3Button } from "@/components/m3/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Position {
  top?: number;
  left?: number;
  transform?: string;
}

const VIEWPORT_MARGIN = 16;
const GAP = 16;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const isEditable = (el: EventTarget | null) =>
  el instanceof HTMLElement &&
  (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));

const centered = (): Position => ({
  top: window.innerHeight / 2,
  left: window.innerWidth / 2,
  transform: "translate(-50%, -50%)",
});

export function TutorialPopover({ target }: { target: TutorialTarget }) {
  const {
    currentStep,
    totalSteps,
    nextStep,
    prevStep,
    skipTutorial,
    completeTutorial,
  } = useTutorial();
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const shouldReduceMotion = useReducedMotion();
  const [position, setPosition] = useState<Position>(centered);
  const popoverRef = useRef<HTMLDivElement>(null);

  const step = TUTORIAL_STEPS[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === totalSteps - 1;
  const isPending = target.status === "pending";
  const description =
    !isDesktop && step.mobileDescription
      ? step.mobileDescription
      : step.description;
  const { rect } = target;

  useLayoutEffect(() => {
    if (!isDesktop) return;
    const place = () => {
      if (!rect) {
        setPosition(centered());
        return;
      }
      const width = popoverRef.current?.offsetWidth || 320;
      const height = popoverRef.current?.offsetHeight || 240;
      const maxLeft = window.innerWidth - width - VIEWPORT_MARGIN;
      const maxTop = Math.max(
        VIEWPORT_MARGIN,
        window.innerHeight - height - VIEWPORT_MARGIN,
      );

      if (step.placement === "right") {
        setPosition({
          top: clamp(rect.y + VIEWPORT_MARGIN, VIEWPORT_MARGIN, maxTop),
          left: clamp(rect.x + rect.width + GAP, VIEWPORT_MARGIN, maxLeft),
        });
        return;
      }

      const bottom = rect.y + rect.height;
      const fitsBelow =
        window.innerHeight - bottom >= height + GAP + VIEWPORT_MARGIN;
      setPosition({
        top: clamp(
          fitsBelow ? bottom + GAP : rect.y - GAP - height,
          VIEWPORT_MARGIN,
          maxTop,
        ),
        left: clamp(
          rect.x + rect.width / 2 - width / 2,
          VIEWPORT_MARGIN,
          maxLeft,
        ),
      });
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [isDesktop, rect, step.placement, currentStep]);

  // Move focus into the tour so keyboard and screen reader users follow it.
  useEffect(() => {
    popoverRef.current?.focus({ preventScroll: true });
  }, [currentStep]);

  // Keyboard navigation. Arrow keys belong to any field being edited, and are
  // ignored while a step is still loading so input cannot outrun the route.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isLast) {
          completeTutorial();
        } else {
          skipTutorial();
        }
        return;
      }
      if (isPending || e.repeat || isEditable(e.target)) return;
      if (e.key === "ArrowRight") {
        nextStep();
      } else if (e.key === "ArrowLeft") {
        prevStep();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isLast, isPending, completeTutorial, skipTutorial, nextStep, prevStep]);

  // Positioning lives on a plain wrapper: Framer Motion owns the transform of
  // the animated card, so a centering transform there would be overwritten.
  const wrapperStyle: React.CSSProperties = isDesktop
    ? { position: "fixed", zIndex: 51, width: 320, ...position }
    : { position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 51 };

  const mobileStyle: React.CSSProperties = {
    borderRadius: "28px 28px 0 0",
    padding: "24px",
    paddingBottom: "calc(24px + env(safe-area-inset-bottom))",
    background: "var(--md-sys-color-surface)",
    boxShadow: "0 -4px 16px rgba(0,0,0,0.15)",
  };

  const desktopStyle: React.CSSProperties = {
    maxHeight: "calc(100vh - 32px)",
    overflowY: "auto",
    borderRadius: 28,
    padding: 24,
    background: "var(--md-sys-color-surface)",
  };

  return (
    <div
      role="dialog"
      aria-label="Admin tutorial"
      aria-modal="true"
      style={wrapperStyle}
    >
      <motion.div
        ref={popoverRef}
        key={currentStep}
        tabIndex={-1}
        initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="shadow-elevation-2 outline-none"
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
          {description}
        </p>
        {target.status !== "ready" && (
          <p
            className="text-body-medium mb-6"
            role="status"
            style={{ color: "var(--md-sys-color-on-surface-variant)" }}
          >
            {isPending
              ? "Loading this page…"
              : "This section isn’t available right now. You can continue the tour or skip it."}
          </p>
        )}
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
                isDisabled={isPending}
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
                isDisabled={isPending}
                endContent={<ChevronRight size={16} />}
              >
                Next
              </M3Button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
