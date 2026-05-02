import { forwardRef, ReactNode, ButtonHTMLAttributes, useRef } from "react";
import clsx from "clsx";
import { M3Spinner } from "./spinner";

type Variant = "filled" | "tonal" | "outlined" | "text" | "elevated";
type Color = "primary" | "error";
type Size = "sm" | "md" | "lg";

export interface M3ButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "color"
> {
  variant?: Variant;
  color?: Color;
  size?: Size;
  isLoading?: boolean;
  isDisabled?: boolean;
  onPress?: () => void;
  startContent?: ReactNode;
  endContent?: ReactNode;
  /** Ignored — M3Button always renders its own M3Spinner when loading */
  spinner?: ReactNode;
}

// M3 Expressive: target border-radius when pressed (pill → rect squish)
const PRESS_RADIUS: Record<Size, string> = {
  sm: "10px",
  md: "12px",
  lg: "14px",
};

// Fast decelerate press, spring-like overshoot release (cubic-bezier approximation)
const MORPH_PRESS =
  "border-radius 100ms cubic-bezier(0.4, 0, 1, 1), transform 100ms cubic-bezier(0.4, 0, 1, 1)";
const MORPH_RELEASE =
  "border-radius 400ms cubic-bezier(0.34, 1.56, 0.64, 1), transform 400ms cubic-bezier(0.34, 1.56, 0.64, 1)";

const SIZE_CLASSES: Record<Size, string> = {
  sm: "h-8 px-3 text-label-medium gap-1.5",
  md: "h-10 px-6 text-label-large gap-2",
  lg: "h-12 px-8 text-label-large gap-2",
};

function getVariantStyles(
  variant: Variant,
  color?: Color,
): React.CSSProperties {
  switch (variant) {
    case "filled":
      if (color === "error") {
        return {
          background: "var(--md-sys-color-error)",
          color: "var(--md-sys-color-on-error)",
        };
      }
      return {
        background: "var(--md-sys-color-primary)",
        color: "var(--md-sys-color-on-primary)",
      };
    case "tonal":
      if (color === "error") {
        return {
          background: "var(--md-sys-color-error-container)",
          color: "var(--md-sys-color-on-error-container)",
        };
      }
      if (color === "primary") {
        return {
          background: "var(--md-sys-color-primary-container)",
          color: "var(--md-sys-color-on-primary-container)",
        };
      }
      return {
        background: "var(--md-sys-color-secondary-container)",
        color: "var(--md-sys-color-on-secondary-container)",
      };
    case "outlined":
      if (color === "error") {
        return {
          background: "transparent",
          color: "var(--md-sys-color-error)",
          border: "1px solid var(--md-sys-color-error)",
        };
      }
      if (color === "primary") {
        return {
          background: "transparent",
          color: "var(--md-sys-color-primary)",
          border: "1px solid var(--md-sys-color-outline)",
        };
      }
      return {
        background: "transparent",
        color: "var(--md-sys-color-on-surface)",
        border: "1px solid var(--md-sys-color-outline)",
      };
    case "text":
      if (color === "error") {
        return {
          background: "transparent",
          color: "var(--md-sys-color-error)",
        };
      }
      if (color === "primary") {
        return {
          background: "transparent",
          color: "var(--md-sys-color-primary)",
        };
      }
      return {
        background: "transparent",
        color: "var(--md-sys-color-on-surface)",
      };
    case "elevated":
      return {
        background: "var(--md-sys-color-surface)",
        color: "var(--md-sys-color-primary)",
        boxShadow:
          "0px 1px 2px rgba(0,0,0,0.3), 0px 1px 3px 1px rgba(0,0,0,0.15)",
      };
  }
}

export const M3Button = forwardRef<HTMLButtonElement, M3ButtonProps>(
  function M3Button(
    {
      variant = "filled",
      color,
      size = "md",
      isLoading = false,
      isDisabled = false,
      disabled,
      onPress,
      onClick,
      onPointerDown: userOnPointerDown,
      startContent,
      endContent,
      spinner: _spinner,
      className,
      children,
      type = "button",
      style,
      ...rest
    },
    ref,
  ) {
    const isDisabledFinal = isDisabled || disabled || isLoading;
    // Track press state without React state (avoids re-render during gesture)
    const isPressedRef = useRef(false);

    const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
      userOnPointerDown?.(e);
      if (isDisabledFinal) return;

      const el = e.currentTarget;

      // --- Ripple: DOM-direct, no setState → no re-render → no style reconciliation ---
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const rippleSize = Math.sqrt(rect.width ** 2 + rect.height ** 2) * 2;
      const ripple = document.createElement("span");
      ripple.setAttribute("aria-hidden", "true");
      ripple.className = "absolute rounded-full m3-ripple";
      Object.assign(ripple.style, {
        left: `${x - rippleSize / 2}px`,
        top: `${y - rippleSize / 2}px`,
        width: `${rippleSize}px`,
        height: `${rippleSize}px`,
        background: "currentColor",
        pointerEvents: "none",
      });
      el.appendChild(ripple);
      setTimeout(() => {
        if (ripple.isConnected) ripple.remove();
      }, 650);

      // --- Shape morph: pill → rect, fast decelerate ---
      // borderRadius and transform are NOT in React's style prop, so reconciliation
      // will never overwrite these direct DOM changes between re-renders.
      isPressedRef.current = true;
      el.style.transition = MORPH_PRESS;
      el.style.borderRadius = PRESS_RADIUS[size];
      el.style.transform = "scale(0.97)";
    };

    const handleRelease = (e: React.PointerEvent<HTMLButtonElement>) => {
      if (!isPressedRef.current) return;
      isPressedRef.current = false;
      const el = e.currentTarget;
      // Spring-like overshoot back to pill
      el.style.transition = MORPH_RELEASE;
      el.style.borderRadius = ""; // clears override; rounded-full class restores pill
      el.style.transform = "";
    };

    const handleClick: React.MouseEventHandler<HTMLButtonElement> = (e) => {
      if (isDisabledFinal) return;
      onClick?.(e);
      onPress?.();
    };

    const variantStyles = getVariantStyles(variant, color);

    const effectiveStart = isLoading ? (
      <M3Spinner size="sm" color="currentColor" />
    ) : (
      startContent
    );

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabledFinal}
        onClick={handleClick}
        onPointerDown={handlePointerDown}
        onPointerUp={handleRelease}
        onPointerLeave={handleRelease}
        onPointerCancel={handleRelease}
        className={clsx(
          // rounded-full lives in className (not style) so React never reconciles
          // borderRadius — our direct DOM manipulation on that property is preserved.
          "group relative inline-flex items-center justify-center rounded-full font-medium select-none overflow-hidden",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current",
          SIZE_CLASSES[size],
          isDisabledFinal
            ? "opacity-[0.38] cursor-not-allowed"
            : "cursor-pointer",
          className,
        )}
        style={{ ...variantStyles, ...style }}
        {...rest}
      >
        {/* M3 state layer — hover 8%, keyboard-focus 12% */}
        {!isDisabledFinal && (
          <span
            aria-hidden="true"
            className="absolute inset-0 opacity-0 group-hover:opacity-[0.08] group-focus-visible:opacity-[0.12] transition-opacity pointer-events-none"
            style={{ background: "currentColor" }}
          />
        )}

        {effectiveStart}
        {children}
        {!isLoading && endContent}
      </button>
    );
  },
);
