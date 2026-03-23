import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, useSignIn } from "@clerk/clerk-react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Eye, EyeOff, Mail } from "lucide-react";

import { M3Spinner } from "@/components/m3/spinner";

const M3_EMPHASIZED_DECELERATE: [number, number, number, number] = [
  0.05, 0.7, 0.1, 1.0,
];

const INPUT_CLASSNAMES = {
  inputWrapper: [
    "!bg-transparent",
    "data-[hover=true]:!bg-transparent",
    "group-data-[focus=true]:!bg-transparent",
    "!shadow-none",
    "group-data-[focus=true]:!shadow-none",
    "group-data-[focus-visible=true]:!ring-0",
    "group-data-[focus-visible=true]:!ring-offset-0",
  ].join(" "),
  innerWrapper: "!bg-transparent",
  input: "!bg-transparent",
} as const;

type ViewState =
  | { view: "idle" }
  | { view: "loading" }
  | { view: "error"; message: string }
  | { view: "email-code" }
  | { view: "email-code-error"; message: string }
  | { view: "forgot-email" }
  | { view: "forgot-email-error"; message: string }
  | { view: "forgot-code" }
  | { view: "forgot-code-error"; message: string }
  | { view: "forgot-success" };

type PanelKey =
  | "sign-in"
  | "email-code"
  | "forgot-email"
  | "forgot-code"
  | "forgot-success";

function getPanelKey(view: ViewState["view"]): PanelKey {
  if (view === "idle" || view === "loading" || view === "error")
    return "sign-in";
  if (view === "email-code" || view === "email-code-error") return "email-code";
  if (view === "forgot-email" || view === "forgot-email-error")
    return "forgot-email";
  if (view === "forgot-code" || view === "forgot-code-error")
    return "forgot-code";
  return "forgot-success";
}

function extractClerkError(err: unknown): string {
  if (
    err !== null &&
    typeof err === "object" &&
    "errors" in err &&
    Array.isArray((err as { errors: unknown[] }).errors) &&
    (err as { errors: { longMessage?: string }[] }).errors.length > 0
  ) {
    return (
      (err as { errors: { longMessage?: string }[] }).errors[0].longMessage ??
      "An error occurred. Please try again."
    );
  }
  return "An unexpected error occurred. Please try again.";
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="rounded-2xl px-4 py-3 text-sm mb-5 flex items-start gap-2"
      style={{
        background: "var(--md-sys-color-error-container)",
        color: "var(--md-sys-color-on-error-container)",
      }}
    >
      <span className="mt-0.5 shrink-0">⚠</span>
      <span>{message}</span>
    </div>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-sm mb-6 flex items-center gap-1 font-medium"
      style={{ color: "var(--md-sys-color-primary)" }}
    >
      ← Back to Sign In
    </button>
  );
}

function OtpInput({
  length = 6,
  value,
  onChange,
}: {
  length?: number;
  value: string;
  onChange: (v: string) => void;
}) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  const chars = Array.from({ length }, (_, i) => value[i] ?? "");

  const update = (next: string[]) => onChange(next.join(""));

  const handleChange = (i: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const digit = e.target.value.replace(/\D/g, "").slice(-1);
    const next = [...chars];
    next[i] = digit;
    update(next);
    if (digit && i < length - 1) {
      inputRefs.current[i + 1]?.focus();
    }
  };

  const handleKeyDown = (
    i: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      if (chars[i]) {
        const next = [...chars];
        next[i] = "";
        update(next);
      } else if (i > 0) {
        inputRefs.current[i - 1]?.focus();
        const next = [...chars];
        next[i - 1] = "";
        update(next);
      }
    } else if (e.key === "ArrowLeft" && i > 0) {
      inputRefs.current[i - 1]?.focus();
    } else if (e.key === "ArrowRight" && i < length - 1) {
      inputRefs.current[i + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, length);
    const next = Array.from({ length }, (_, i) => pasted[i] ?? "");
    update(next);
    const lastFilled = Math.min(pasted.length, length - 1);
    inputRefs.current[lastFilled]?.focus();
  };

  return (
    <div
      className="flex gap-2 justify-center"
      role="group"
      aria-label="Verification code"
    >
      {Array.from({ length }, (_, i) => (
        <input
          key={i}
          ref={(el) => {
            inputRefs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={chars[i]}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={() => setFocusedIndex(i)}
          onBlur={() => setFocusedIndex(null)}
          aria-label={`Digit ${i + 1}`}
          className="w-11 h-14 text-center text-xl font-semibold rounded-xl border-2 outline-none transition-all duration-150"
          style={{
            backgroundColor: "transparent",
            borderColor:
              focusedIndex === i
                ? "var(--md-sys-color-primary)"
                : chars[i]
                  ? "var(--md-sys-color-secondary)"
                  : "var(--md-sys-color-outline-variant)",
            color: "var(--md-sys-color-on-surface)",
            caretColor: "transparent",
          }}
        />
      ))}
    </div>
  );
}

export default function SignInPage() {
  const { isLoaded: authLoaded, isSignedIn } = useAuth();
  const { isLoaded: signInLoaded, signIn, setActive } = useSignIn();
  const navigate = useNavigate();

  const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (authLoaded && isSignedIn) navigate("/admin", { replace: true });
  }, [authLoaded, isSignedIn, navigate]);

  useEffect(() => {
    return () => {
      if (successTimeoutRef.current !== null) {
        clearTimeout(successTimeoutRef.current);
      }
    };
  }, []);

  const [state, setState] = useState<ViewState>({ view: "idle" });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Email code sign-in
  const [emailCode, setEmailCode] = useState("");

  // Forgot password
  const [forgotEmail, setForgotEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [xDirection, setXDirection] = useState<1 | -1>(1);

  const panelKey = getPanelKey(state.view);
  const isLoading = state.view === "loading";

  // --- Handlers ---

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signInLoaded || !signIn) return;
    setState({ view: "loading" });
    try {
      const result = await signIn.create({
        strategy: "password",
        identifier: email,
        password,
      });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        navigate("/admin");
      } else {
        setState({
          view: "error",
          message: "Sign in could not be completed. Please contact support.",
        });
      }
    } catch (err) {
      setState({ view: "error", message: extractClerkError(err) });
    }
  };

  const handleSendEmailCode = async () => {
    if (!signInLoaded || !signIn || !email) return;
    setXDirection(1);
    setState({ view: "loading" });
    try {
      await signIn.create({ strategy: "email_code", identifier: email });
      setState({ view: "email-code" });
    } catch (err) {
      setState({ view: "error", message: extractClerkError(err) });
    }
  };

  const handleVerifyEmailCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signInLoaded || !signIn) return;
    setState({ view: "loading" });
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: "email_code",
        code: emailCode,
      });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        navigate("/admin");
      } else {
        setState({
          view: "email-code-error",
          message: "Could not complete sign in. Please try again.",
        });
      }
    } catch (err) {
      setState({
        view: "email-code-error",
        message: extractClerkError(err),
      });
    }
  };

  const handleForgotPasswordClick = () => {
    setXDirection(1);
    setForgotEmail(email);
    setState({ view: "forgot-email" });
  };

  const handleBackToSignIn = () => {
    setXDirection(-1);
    setState({ view: "idle" });
    setEmailCode("");
    setCode("");
    setNewPassword("");
    setShowNewPassword(false);
  };

  const handleSendResetCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signInLoaded || !signIn) return;
    setState({ view: "loading" });
    try {
      await signIn.create({
        strategy: "reset_password_email_code",
        identifier: forgotEmail,
      });
      setState({ view: "forgot-code" });
    } catch (err) {
      setState({
        view: "forgot-email-error",
        message: extractClerkError(err),
      });
    }
  };

  const handleVerifyCodeAndReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signInLoaded || !signIn) return;
    setState({ view: "loading" });
    try {
      await signIn.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code,
      });
      const result = await signIn.resetPassword({
        password: newPassword,
        signOutOfOtherSessions: true,
      });
      if (result.status === "complete") {
        const sessionId = result.createdSessionId;
        setState({ view: "forgot-success" });
        successTimeoutRef.current = setTimeout(async () => {
          await setActive({ session: sessionId });
          navigate("/admin");
        }, 3000);
      } else {
        setState({
          view: "forgot-code-error",
          message: "Could not complete password reset. Please try again.",
        });
      }
    } catch (err) {
      setState({
        view: "forgot-code-error",
        message: extractClerkError(err),
      });
    }
  };

  // --- Render ---

  if (!authLoaded || !signInLoaded) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "var(--md-sys-color-surface)" }}
      >
        <M3Spinner size="lg" />
      </div>
    );
  }

  return (
    <div
      className="sign-in-page relative min-h-screen flex items-center justify-center px-4 py-12 overflow-hidden"
      style={{
        backgroundImage: "url('/flower_background.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Overlay for readability */}
      <div className="absolute inset-0 bg-white/30" />

      {/* Card container */}
      <div className="relative w-full max-w-sm z-10">
        <AnimatePresence mode="wait" initial={false} custom={xDirection}>
          <motion.div
            key={panelKey}
            custom={xDirection}
            variants={{
              enter: (dir: number) => ({ x: dir * 48, opacity: 0 }),
              center: { x: 0, opacity: 1 },
              exit: (dir: number) => ({ x: dir * -48, opacity: 0 }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.35, ease: M3_EMPHASIZED_DECELERATE }}
            className="rounded-3xl p-8 border sign-in-light-surface"
            data-theme="light"
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.82)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              borderColor: "rgba(255, 255, 255, 0.55)",
              boxShadow:
                "0 4px 6px rgba(0,0,0,0.06), 0 20px 40px rgba(0,0,0,0.14)",
            }}
          >
            {/* ── Sign-in panel ── */}
            {panelKey === "sign-in" && (
              <>
                <div className="text-center mb-8">
                  <img
                    src="/csclogo.svg"
                    alt="Oakland Zoo"
                    className="h-14 w-auto mx-auto mb-4"
                  />
                  <h1
                    className="text-2xl font-bold tracking-tight"
                    style={{ color: "var(--md-sys-color-on-surface)" }}
                  >
                    Admin Sign In
                  </h1>
                  <p
                    className="text-sm mt-1"
                    style={{ color: "var(--md-sys-color-on-surface-variant)" }}
                  >
                    Oakland Zoo Booster Pack Generator
                  </p>
                </div>

                {state.view === "error" && (
                  <ErrorBanner message={state.message} />
                )}

                <form onSubmit={handleSignIn} className="flex flex-col gap-3">
                  <Input
                    type="email"
                    label="Email address"
                    variant="bordered"
                    classNames={INPUT_CLASSNAMES}
                    value={email}
                    onValueChange={setEmail}
                    isRequired
                    autoComplete="email"
                  />
                  <Input
                    type={showPassword ? "text" : "password"}
                    label="Password"
                    variant="bordered"
                    classNames={INPUT_CLASSNAMES}
                    value={password}
                    onValueChange={setPassword}
                    isRequired
                    autoComplete="current-password"
                    endContent={
                      <button
                        type="button"
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                        onClick={() => setShowPassword((v) => !v)}
                        className="focus:outline-none"
                      >
                        {showPassword ? (
                          <EyeOff size={16} />
                        ) : (
                          <Eye size={16} />
                        )}
                      </button>
                    }
                  />

                  <div className="flex justify-end -mt-1">
                    <button
                      type="button"
                      onClick={handleForgotPasswordClick}
                      className="text-xs font-medium"
                      style={{ color: "var(--md-sys-color-primary)" }}
                    >
                      Forgot password?
                    </button>
                  </div>

                  <Button
                    type="submit"
                    color="primary"
                    className="w-full font-semibold mt-1"
                    isLoading={isLoading}
                    isDisabled={isLoading || !signInLoaded}
                  >
                    Sign In
                  </Button>
                </form>

                {/* Divider */}
                <div className="flex items-center gap-3 my-5">
                  <div
                    className="flex-1 border-t"
                    style={{
                      borderColor: "var(--md-sys-color-outline-variant)",
                    }}
                  />
                  <span
                    className="text-xs"
                    style={{ color: "var(--md-sys-color-on-surface-variant)" }}
                  >
                    or
                  </span>
                  <div
                    className="flex-1 border-t"
                    style={{
                      borderColor: "var(--md-sys-color-outline-variant)",
                    }}
                  />
                </div>

                {/* Email code option */}
                <Button
                  type="button"
                  variant="bordered"
                  className="w-full"
                  isDisabled={isLoading || !signInLoaded || !email}
                  onPress={handleSendEmailCode}
                  startContent={<Mail size={16} />}
                >
                  Send me a sign-in code
                </Button>
                {!email && (
                  <p
                    className="text-center text-xs mt-2"
                    style={{ color: "var(--md-sys-color-on-surface-variant)" }}
                  >
                    Enter your email above first
                  </p>
                )}
              </>
            )}

            {/* ── Email code entry panel ── */}
            {panelKey === "email-code" && (
              <>
                <BackButton onClick={handleBackToSignIn} />
                <div className="mb-6">
                  <h1
                    className="text-xl font-bold mb-1"
                    style={{ color: "var(--md-sys-color-on-surface)" }}
                  >
                    Check your email
                  </h1>
                  <p
                    className="text-sm"
                    style={{ color: "var(--md-sys-color-on-surface-variant)" }}
                  >
                    We sent a sign-in code to{" "}
                    <strong className="font-medium">{email}</strong>.
                  </p>
                </div>
                {state.view === "email-code-error" && (
                  <ErrorBanner message={state.message} />
                )}
                <form
                  onSubmit={handleVerifyEmailCode}
                  className="flex flex-col gap-4"
                >
                  <OtpInput value={emailCode} onChange={setEmailCode} />
                  <Button
                    type="submit"
                    color="primary"
                    className="w-full font-semibold"
                    isLoading={isLoading}
                    isDisabled={isLoading || !signInLoaded}
                  >
                    Verify code
                  </Button>
                </form>
              </>
            )}

            {/* ── Forgot-email panel ── */}
            {panelKey === "forgot-email" && (
              <>
                <BackButton onClick={handleBackToSignIn} />
                <div className="mb-6">
                  <h1
                    className="text-xl font-bold mb-1"
                    style={{ color: "var(--md-sys-color-on-surface)" }}
                  >
                    Reset password
                  </h1>
                  <p
                    className="text-sm"
                    style={{ color: "var(--md-sys-color-on-surface-variant)" }}
                  >
                    Enter your email and we&apos;ll send you a reset code.
                  </p>
                </div>
                {state.view === "forgot-email-error" && (
                  <ErrorBanner message={state.message} />
                )}
                <form
                  onSubmit={handleSendResetCode}
                  className="flex flex-col gap-4"
                >
                  <Input
                    type="email"
                    label="Email address"
                    variant="bordered"
                    classNames={INPUT_CLASSNAMES}
                    value={forgotEmail}
                    onValueChange={setForgotEmail}
                    isRequired
                    autoComplete="email"
                  />
                  <Button
                    type="submit"
                    color="primary"
                    className="w-full font-semibold"
                    isLoading={isLoading}
                    isDisabled={isLoading || !signInLoaded}
                  >
                    Send reset code
                  </Button>
                </form>
              </>
            )}

            {/* ── Forgot-code panel ── */}
            {panelKey === "forgot-code" && (
              <>
                <BackButton onClick={handleBackToSignIn} />
                <div className="mb-6">
                  <h1
                    className="text-xl font-bold mb-1"
                    style={{ color: "var(--md-sys-color-on-surface)" }}
                  >
                    Enter reset code
                  </h1>
                  <p
                    className="text-sm"
                    style={{ color: "var(--md-sys-color-on-surface-variant)" }}
                  >
                    A reset code was sent to {forgotEmail}.
                  </p>
                </div>
                {state.view === "forgot-code-error" && (
                  <ErrorBanner message={state.message} />
                )}
                <form
                  onSubmit={handleVerifyCodeAndReset}
                  className="flex flex-col gap-4"
                >
                  <Input
                    type="text"
                    label="Verification code"
                    variant="bordered"
                    classNames={INPUT_CLASSNAMES}
                    value={code}
                    onValueChange={setCode}
                    isRequired
                    autoComplete="one-time-code"
                    inputMode="numeric"
                  />
                  <Input
                    type={showNewPassword ? "text" : "password"}
                    label="New password"
                    variant="bordered"
                    classNames={INPUT_CLASSNAMES}
                    value={newPassword}
                    onValueChange={setNewPassword}
                    isRequired
                    autoComplete="new-password"
                    endContent={
                      <button
                        type="button"
                        aria-label={
                          showNewPassword ? "Hide password" : "Show password"
                        }
                        onClick={() => setShowNewPassword((v) => !v)}
                        className="focus:outline-none"
                      >
                        {showNewPassword ? (
                          <EyeOff size={16} />
                        ) : (
                          <Eye size={16} />
                        )}
                      </button>
                    }
                  />
                  <Button
                    type="submit"
                    color="primary"
                    className="w-full font-semibold"
                    isLoading={isLoading}
                    isDisabled={isLoading || !signInLoaded}
                  >
                    Reset password
                  </Button>
                </form>
              </>
            )}

            {/* ── Success panel ── */}
            {panelKey === "forgot-success" && (
              <div className="text-center py-8">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{
                    background: "var(--md-sys-color-primary)",
                    color: "var(--md-sys-color-on-primary)",
                  }}
                >
                  <span className="text-2xl">✓</span>
                </div>
                <h1
                  className="text-xl font-bold mb-2"
                  style={{ color: "var(--md-sys-color-on-surface)" }}
                >
                  Password updated
                </h1>
                <p
                  className="text-sm"
                  style={{ color: "var(--md-sys-color-on-surface-variant)" }}
                >
                  Redirecting you to admin…
                </p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
