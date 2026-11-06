import { createPortal } from "react-dom";
import { useTutorial } from "@/contexts/tutorial-context";
import { ErrorBoundary } from "@/components/error-boundary";
import { useMediaQuery } from "@/hooks/use-media-query";
import { SpotlightOverlay } from "./spotlight-overlay";
import { TutorialPopover } from "./tutorial-popover";
import { TUTORIAL_STEPS } from "./steps";
import { useTutorialTarget } from "./use-tutorial-target";

function ActiveTutorial() {
  const { currentStep } = useTutorial();
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const step = TUTORIAL_STEPS[currentStep];
  const targetId =
    !isDesktop && step.mobileTargetId ? step.mobileTargetId : step.targetId;
  const target = useTutorialTarget(targetId, step.route);

  return (
    <>
      <SpotlightOverlay target={target} />
      <TutorialPopover target={target} />
    </>
  );
}

export function TutorialOverlay() {
  const { isActive, abortTutorial } = useTutorial();

  if (!isActive) return null;

  // A tour failure ends the tour and leaves the admin page usable.
  return createPortal(
    <ErrorBoundary fallback={null} onError={abortTutorial}>
      <ActiveTutorial />
    </ErrorBoundary>,
    document.body,
  );
}
