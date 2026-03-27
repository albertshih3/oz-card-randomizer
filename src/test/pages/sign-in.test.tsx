import React from "react";

// --- Auth state control ---
let mockIsSignedIn = false;

// --- Sign-in mock control ---
let mockSignInCreate = vi.fn();
let mockSignInAttemptFirstFactor = vi.fn();
let mockSignInResetPassword = vi.fn();
let mockSetActive = vi.fn();
let mockSignInLoaded = true;

vi.mock("@clerk/clerk-react", () => ({
  useAuth: () => ({
    isLoaded: true,
    isSignedIn: mockIsSignedIn,
  }),
  useSignIn: () => ({
    isLoaded: mockSignInLoaded,
    signIn: {
      create: mockSignInCreate,
      attemptFirstFactor: mockSignInAttemptFirstFactor,
      resetPassword: mockSignInResetPassword,
    },
    setActive: mockSetActive,
  }),
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("@heroui/button", () => ({
  Button: ({
    children,
    onPress,
    type,
    isLoading,
    isDisabled,
    startContent: _startContent,
  }: {
    children: React.ReactNode;
    onPress?: () => void;
    type?: string;
    isLoading?: boolean;
    isDisabled?: boolean;
    startContent?: React.ReactNode;
  }) => (
    <button
      type={(type as "submit" | "button" | "reset") ?? "button"}
      onClick={onPress}
      disabled={isDisabled}
      aria-busy={isLoading}
    >
      {isLoading ? "Loading..." : children}
    </button>
  ),
}));

vi.mock("@heroui/input", () => ({
  Input: ({
    label,
    value,
    onValueChange,
    type,
    endContent,
  }: {
    label: string;
    value: string;
    onValueChange: (v: string) => void;
    type?: string;
    endContent?: React.ReactNode;
  }) => (
    <div>
      <input
        aria-label={label}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        type={type ?? "text"}
      />
      {endContent}
    </div>
  ),
}));

vi.mock("@/components/m3/spinner", () => ({
  M3Spinner: () => <div data-testid="m3-spinner" />,
}));

vi.mock("@/lib/gtag", () => ({ event: vi.fn() }));

// Mock framer-motion so AnimatePresence renders children immediately without animations
vi.mock("framer-motion", () => {
  const MotionDiv = React.forwardRef(
    (
      props: React.HTMLAttributes<HTMLDivElement> & Record<string, unknown>,
      ref: React.Ref<HTMLDivElement>,
    ) => {
      const {
        variants: _variants,
        initial: _initial,
        animate: _animate,
        exit: _exit,
        transition: _transition,
        custom: _custom,
        ...rest
      } = props;
      return <div ref={ref} {...rest} />;
    },
  );
  MotionDiv.displayName = "MotionDiv";
  return {
    AnimatePresence: ({ children }: { children: React.ReactNode }) => (
      <>{children}</>
    ),
    motion: { div: MotionDiv },
  };
});

// Import under test (must be after vi.mock calls)
import {
  act,
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import SignInPage from "@/pages/sign-in";

beforeEach(() => {
  mockIsSignedIn = false;
  mockSignInLoaded = true;
  mockSignInCreate = vi.fn();
  mockSignInAttemptFirstFactor = vi.fn();
  mockSignInResetPassword = vi.fn();
  mockSetActive = vi.fn();
  mockNavigate.mockClear();
  vi.clearAllMocks();
});

describe("SignInPage — OAK-51", () => {
  it("renders email and password fields", () => {
    render(<SignInPage />);
    expect(screen.getByRole("textbox", { name: /email/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
  });

  it("redirects to /admin when already authenticated", () => {
    mockIsSignedIn = true;
    render(<SignInPage />);
    expect(mockNavigate).toHaveBeenCalledWith("/admin", { replace: true });
  });

  it("shows Clerk error message on failed sign-in", async () => {
    const clerkError = {
      errors: [{ longMessage: "Incorrect email or password." }],
    };
    mockSignInCreate.mockRejectedValueOnce(clerkError);

    render(<SignInPage />);
    fireEvent.change(screen.getByRole("textbox", { name: /email/i }), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: "wrongpassword" },
    });
    fireEvent.submit(
      screen.getByRole("button", { name: /sign in/i }).closest("form")!,
    );

    await waitFor(() => {
      expect(
        screen.getByText("Incorrect email or password."),
      ).toBeInTheDocument();
    });
  });

  it("navigates to /admin on successful sign-in", async () => {
    mockSignInCreate.mockResolvedValueOnce({
      status: "complete",
      createdSessionId: "sess_123",
    });
    mockSetActive.mockResolvedValueOnce(undefined);

    render(<SignInPage />);
    fireEvent.change(screen.getByRole("textbox", { name: /email/i }), {
      target: { value: "admin@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: "correctpassword" },
    });
    fireEvent.submit(
      screen.getByRole("button", { name: /sign in/i }).closest("form")!,
    );

    await waitFor(() => {
      expect(mockSetActive).toHaveBeenCalledWith({ session: "sess_123" });
      expect(mockNavigate).toHaveBeenCalledWith("/admin");
    });

    const { event } = await import("@/lib/gtag");
    expect(vi.mocked(event)).toHaveBeenCalledWith("login", {
      method: "password",
    });
  });
});

describe("SignInPage — OAK-52", () => {
  it("clicking 'Forgot password?' transitions to forgot-email view", () => {
    render(<SignInPage />);
    const forgotBtn = screen.getByRole("button", { name: /forgot password/i });
    fireEvent.click(forgotBtn);
    expect(screen.getByText(/reset password/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /send reset code/i }),
    ).toBeInTheDocument();
  });

  it("submitting email in forgot-email transitions to forgot-code view", async () => {
    mockSignInCreate.mockResolvedValueOnce({ status: "needs_first_factor" });

    render(<SignInPage />);
    fireEvent.click(screen.getByRole("button", { name: /forgot password/i }));

    fireEvent.change(screen.getByRole("textbox", { name: /email/i }), {
      target: { value: "admin@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send reset code/i }));

    await waitFor(() => {
      expect(screen.getByText(/enter reset code/i)).toBeInTheDocument();
    });
  });

  it("submitting correct code and new password shows success panel then completes reset", async () => {
    mockSignInCreate.mockResolvedValueOnce({ status: "needs_first_factor" });
    mockSignInAttemptFirstFactor.mockResolvedValueOnce({
      status: "needs_new_password",
    });
    mockSignInResetPassword.mockResolvedValueOnce({
      status: "complete",
      createdSessionId: "sess_456",
    });
    mockSetActive.mockResolvedValueOnce(undefined);

    render(<SignInPage />);
    fireEvent.click(screen.getByRole("button", { name: /forgot password/i }));
    fireEvent.change(screen.getByRole("textbox", { name: /email/i }), {
      target: { value: "admin@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send reset code/i }));

    await waitFor(() => screen.getByText(/enter reset code/i));

    fireEvent.change(screen.getByLabelText(/verification code/i), {
      target: { value: "123456" },
    });
    fireEvent.change(screen.getByLabelText(/new password/i), {
      target: { value: "NewPass123!" },
    });

    // Enable fake timers BEFORE clicking submit so the 3s setTimeout is captured
    vi.useFakeTimers();
    try {
      fireEvent.click(screen.getByRole("button", { name: /reset password/i }));

      // Flush the async handler (attemptFirstFactor + resetPassword promises)
      await act(async () => {
        await Promise.resolve();
      });
      await act(async () => {
        await Promise.resolve();
      });
      await act(async () => {
        await Promise.resolve();
      });
      await act(async () => {
        await Promise.resolve();
      });

      // Success panel should be visible before setActive is called
      expect(screen.getByText(/password updated/i)).toBeInTheDocument();

      // setActive must NOT have been called yet — it's inside the 3s timeout
      expect(mockSetActive).not.toHaveBeenCalled();

      // Advance timers and flush the async timeout callback
      await act(async () => {
        await vi.runAllTimersAsync();
      });

      expect(mockSetActive).toHaveBeenCalledWith({ session: "sess_456" });
      expect(mockNavigate).toHaveBeenCalledWith("/admin");

      const { event } = await import("@/lib/gtag");
      expect(vi.mocked(event)).toHaveBeenCalledWith("password_reset", {});
      expect(vi.mocked(event)).toHaveBeenCalledWith("login", {
        method: "email_code",
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it("'Back to Sign In' from forgot-email returns to sign-in view", () => {
    render(<SignInPage />);
    fireEvent.click(screen.getByRole("button", { name: /forgot password/i }));
    expect(screen.getByText(/reset password/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /back to sign in/i }));
    expect(
      screen.getByRole("button", { name: /^sign in$/i }),
    ).toBeInTheDocument();
  });

  it("'Back to Sign In' from forgot-code returns to sign-in view", async () => {
    mockSignInCreate.mockResolvedValueOnce({ status: "needs_first_factor" });

    render(<SignInPage />);
    fireEvent.click(screen.getByRole("button", { name: /forgot password/i }));
    fireEvent.change(screen.getByRole("textbox", { name: /email/i }), {
      target: { value: "admin@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send reset code/i }));
    await waitFor(() => screen.getByText(/enter reset code/i));

    fireEvent.click(screen.getByRole("button", { name: /back to sign in/i }));
    expect(
      screen.getByRole("button", { name: /^sign in$/i }),
    ).toBeInTheDocument();
  });
});

describe("SignInPage — email code sign-in", () => {
  it("'Send me a sign-in code' transitions to email-code panel", async () => {
    mockSignInCreate.mockResolvedValueOnce({ status: "needs_first_factor" });

    render(<SignInPage />);
    fireEvent.change(screen.getByRole("textbox", { name: /email/i }), {
      target: { value: "admin@example.com" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /send me a sign-in code/i }),
    );

    await waitFor(() => {
      expect(screen.getByText(/check your email/i)).toBeInTheDocument();
    });
  });

  it("verifying email code navigates to /admin on success", async () => {
    mockSignInCreate.mockResolvedValueOnce({ status: "needs_first_factor" });
    mockSignInAttemptFirstFactor.mockResolvedValueOnce({
      status: "complete",
      createdSessionId: "sess_789",
    });
    mockSetActive.mockResolvedValueOnce(undefined);

    render(<SignInPage />);
    fireEvent.change(screen.getByRole("textbox", { name: /email/i }), {
      target: { value: "admin@example.com" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /send me a sign-in code/i }),
    );

    await waitFor(() => screen.getByText(/check your email/i));

    "654321".split("").forEach((digit, i) => {
      fireEvent.change(screen.getByLabelText(`Digit ${i + 1}`), {
        target: { value: digit },
      });
    });
    fireEvent.submit(
      screen.getByRole("button", { name: /verify code/i }).closest("form")!,
    );

    await waitFor(() => {
      expect(mockSetActive).toHaveBeenCalledWith({ session: "sess_789" });
      expect(mockNavigate).toHaveBeenCalledWith("/admin");
    });

    const { event } = await import("@/lib/gtag");
    expect(vi.mocked(event)).toHaveBeenCalledWith("login", {
      method: "email_code",
    });
  });
});
