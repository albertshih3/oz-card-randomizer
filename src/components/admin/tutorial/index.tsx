import { createPortal } from "react-dom";
import { useTutorial } from "@/contexts/tutorial-context";
import { SpotlightOverlay } from "./spotlight-overlay";
import { TutorialPopover } from "./tutorial-popover";
import { TUTORIAL_STEPS } from "./steps";
import { useMediaQuery } from "@/hooks/use-media-query";

export function TutorialOverlay() {
  const { isActive, currentStep } = useTutorial();
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  if (!isActive) return null;

  const step = TUTORIAL_STEPS[currentStep];
  const effectiveTargetId =
    !isDesktop && step.mobileTargetId ? step.mobileTargetId : step.targetId;

  return createPortal(
    <>
      <SpotlightOverlay targetId={effectiveTargetId} />
      <TutorialPopover />
    </>,
    document.body,
  );
}
