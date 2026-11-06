import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

export interface TargetRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type TargetStatus = "pending" | "ready" | "unavailable";

export interface TutorialTarget {
  status: TargetStatus;
  rect: TargetRect | null;
}

/** How long a step waits before offering the unavailable state. */
export const TARGET_TIMEOUT_MS = 4000;
/** Remeasure once page entry animation has settled. */
const SETTLE_MS = 450;

function isVisible(el: Element): boolean {
  const rect = el.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return false;
  const style = window.getComputedStyle(el);
  return style.visibility !== "hidden" && style.display !== "none";
}

/** Desktop and mobile drawers share ids, so take the first visible match. */
function findTarget(targetId: string): Element | null {
  const matches = document.querySelectorAll(`[data-tutorial-id="${targetId}"]`);
  return Array.from(matches).find(isVisible) ?? null;
}

const sameRect = (a: TargetRect | null, b: TargetRect | null) =>
  a === b ||
  (!!a &&
    !!b &&
    a.x === b.x &&
    a.y === b.y &&
    a.width === b.width &&
    a.height === b.height);

/**
 * Single source of truth for where a tour step points. The spotlight and the
 * popover both read this, so they cannot disagree. A step is only ready once
 * the expected route is active and its target is visible with real bounds.
 * Observation continues after the timeout so a late target still resolves.
 */
export function useTutorialTarget(
  targetId: string | null,
  route: string,
): TutorialTarget {
  const { pathname } = useLocation();
  const onRoute = pathname === route;
  const [target, setTarget] = useState<TutorialTarget>({
    status: "pending",
    rect: null,
  });

  useEffect(() => {
    if (!onRoute) {
      setTarget({ status: "pending", rect: null });
      return;
    }
    if (!targetId) {
      setTarget({ status: "ready", rect: null });
      return;
    }

    let timedOut = false;
    let frame = 0;
    let observedEl: Element | null = null;
    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(() => schedule());

    const measure = () => {
      frame = 0;
      const el = findTarget(targetId);
      if (el !== observedEl) {
        if (observedEl) resizeObserver?.unobserve(observedEl);
        if (el) resizeObserver?.observe(el);
        if (el && !observedEl) el.scrollIntoView?.({ block: "nearest" });
        observedEl = el;
      }
      const box = el?.getBoundingClientRect();
      const rect = box
        ? { x: box.x, y: box.y, width: box.width, height: box.height }
        : null;
      const status: TargetStatus = rect
        ? "ready"
        : timedOut
          ? "unavailable"
          : "pending";
      setTarget((prev) =>
        prev.status === status && sameRect(prev.rect, rect)
          ? prev
          : { status, rect },
      );
    };

    function schedule() {
      if (!frame) frame = requestAnimationFrame(measure);
    }

    setTarget({ status: "pending", rect: null });
    measure();

    const mutationObserver = new MutationObserver(schedule);
    mutationObserver.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", schedule, true);
    const settleTimer = setTimeout(schedule, SETTLE_MS);
    const timeoutTimer = setTimeout(() => {
      timedOut = true;
      schedule();
    }, TARGET_TIMEOUT_MS);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      clearTimeout(settleTimer);
      clearTimeout(timeoutTimer);
      mutationObserver.disconnect();
      resizeObserver?.disconnect();
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule, true);
    };
  }, [targetId, onRoute]);

  return target;
}
