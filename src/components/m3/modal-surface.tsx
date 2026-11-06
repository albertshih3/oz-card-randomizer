import { useEffect, useRef, type KeyboardEvent, type ReactNode } from "react";
import { FocusScope } from "@react-aria/focus";
import { ariaHideOutside, usePreventScroll } from "@react-aria/overlays";

interface ModalSurfaceProps {
  /** Called on Escape. Omit to make Escape do nothing, such as during a save. */
  onEscape?: () => void;
  children: ReactNode;
}

/**
 * Modal behavior for custom M3 surfaces: traps focus, restores it to the
 * trigger, locks background scrolling, hides the background from assistive
 * technology, and handles Escape. Mount it only while the surface is open.
 *
 * Escape is handled through React bubbling so an open popover inside the
 * surface can consume the key first.
 */
export function ModalSurface({ onEscape, children }: ModalSurfaceProps) {
  const ref = useRef<HTMLDivElement>(null);
  usePreventScroll();

  useEffect(() => {
    if (ref.current) return ariaHideOutside([ref.current]);
  }, []);

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape" && onEscape) {
      event.stopPropagation();
      onEscape();
    }
  };

  return (
    // eslint-disable-next-line jsx-a11y/no-autofocus -- moving focus in is required for a modal
    <FocusScope contain restoreFocus autoFocus>
      <div ref={ref} role="presentation" onKeyDown={handleKeyDown}>
        {children}
      </div>
    </FocusScope>
  );
}
