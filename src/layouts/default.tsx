import { AnchorHTMLAttributes, PointerEvent, useRef, useState } from "react";
import { Navbar } from "@/components/navbar";
import { ArrowRight, Sparkles, X } from "lucide-react";
import { M3Button } from "@/components/m3/button";

const VERSION_3_BANNER_DISMISSED_KEY = "oz-version-3-banner-dismissed";

export default function DefaultLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [showVersionBanner, setShowVersionBanner] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem(VERSION_3_BANNER_DISMISSED_KEY) !== "true";
  });

  const dismissVersionBanner = () => {
    localStorage.setItem(VERSION_3_BANNER_DISMISSED_KEY, "true");
    setShowVersionBanner(false);
  };

  return (
    <div className="relative flex min-h-screen flex-col bg-[var(--md-sys-color-background)] text-[var(--md-sys-color-on-background)]">
      <Navbar />
      {showVersionBanner && (
        <section
          aria-label="Version 3 announcement"
          className="border-b border-[var(--md-sys-color-primary)] bg-[var(--md-sys-color-primary)] px-4 py-3 text-[var(--md-sys-color-on-primary)]"
        >
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[var(--md-sys-color-on-primary)]/12 text-[var(--md-sys-color-on-primary)] ring-1 ring-[var(--md-sys-color-on-primary)]/24">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <p className="text-title-medium">Version 3 is here</p>
                <p className="text-body-medium text-[var(--md-sys-color-on-primary)]/90">
                  Introducing a new version of the booster pack generator, with
                  a cleaner mobile view and new admin features.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <AnimatedAnnouncementLink
                href="/changelog"
                className="inline-flex min-h-10 w-fit items-center gap-2 rounded-full bg-[var(--md-sys-color-on-primary)] px-4 text-label-large text-[var(--md-sys-color-primary)] transition-colors hover:bg-[var(--md-sys-color-on-primary)]/92 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--md-sys-color-on-primary)]"
              >
                View changelog
                <ArrowRight className="h-4 w-4" />
              </AnimatedAnnouncementLink>
              <M3Button
                variant="text"
                size="sm"
                aria-label="Dismiss Version 3 announcement"
                className="h-10 w-10 min-w-10 px-0 text-[var(--md-sys-color-on-primary)] hover:bg-[var(--md-sys-color-on-primary)]/12"
                onPress={dismissVersionBanner}
                style={{
                  color: "var(--md-sys-color-on-primary)",
                }}
              >
                <X className="h-4 w-4" />
              </M3Button>
            </div>
          </div>
        </section>
      )}
      <main className="mx-auto w-full max-w-7xl flex-grow px-4 pt-4 sm:px-6 md:pt-8">
        {children}
      </main>
      <footer className="flex w-full items-center justify-center px-4 py-5">
        <p className="text-label-medium text-[var(--md-sys-color-on-surface-variant)]">
          © {new Date().getFullYear()} Oakland Zoo. All rights reserved.
        </p>
      </footer>
    </div>
  );
}

function AnimatedAnnouncementLink({
  children,
  className,
  onPointerDown,
  onPointerUp,
  onPointerLeave,
  onPointerCancel,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement>) {
  const isPressedRef = useRef(false);

  const press = (event: PointerEvent<HTMLAnchorElement>) => {
    onPointerDown?.(event);
    const element = event.currentTarget;
    const rect = element.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
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
    element.appendChild(ripple);
    setTimeout(() => {
      if (ripple.isConnected) ripple.remove();
    }, 650);

    isPressedRef.current = true;
    element.style.transition =
      "border-radius 100ms cubic-bezier(0.4, 0, 1, 1), transform 100ms cubic-bezier(0.4, 0, 1, 1)";
    element.style.borderRadius = "14px";
    element.style.transform = "scale(0.97)";
  };

  const release = (event: PointerEvent<HTMLAnchorElement>) => {
    if (event.type === "pointerup") onPointerUp?.(event);
    if (event.type === "pointerleave") onPointerLeave?.(event);
    if (event.type === "pointercancel") onPointerCancel?.(event);
    if (!isPressedRef.current) return;

    isPressedRef.current = false;
    const element = event.currentTarget;
    element.style.transition =
      "border-radius 400ms cubic-bezier(0.34, 1.56, 0.64, 1), transform 400ms cubic-bezier(0.34, 1.56, 0.64, 1)";
    element.style.borderRadius = "";
    element.style.transform = "";
  };

  return (
    <a
      {...props}
      className={`group relative select-none overflow-hidden ${className ?? ""}`}
      onPointerDown={press}
      onPointerUp={release}
      onPointerLeave={release}
      onPointerCancel={release}
    >
      <span
        aria-hidden="true"
        className="absolute inset-0 opacity-0 transition-opacity group-hover:opacity-[0.08] group-focus-visible:opacity-[0.12]"
        style={{ background: "currentColor" }}
      />
      {children}
    </a>
  );
}
