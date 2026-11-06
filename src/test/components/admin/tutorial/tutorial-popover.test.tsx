import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

const mockNextStep = vi.fn();
const mockPrevStep = vi.fn();
const mockSkipTutorial = vi.fn();
const mockCompleteTutorial = vi.fn();
let mockCurrentStep = 0;

vi.mock("@/contexts/tutorial-context", () => ({
  useTutorial: () => ({
    isActive: true,
    currentStep: mockCurrentStep,
    totalSteps: 3,
    nextStep: mockNextStep,
    prevStep: mockPrevStep,
    skipTutorial: mockSkipTutorial,
    completeTutorial: mockCompleteTutorial,
    startTutorial: vi.fn(),
  }),
}));

vi.mock("@/components/admin/tutorial/steps", () => ({
  TUTORIAL_STEPS: [
    {
      id: "step-1",
      targetId: null,
      route: "/admin",
      title: "First Step",
      description: "Description of step one.",
    },
    {
      id: "step-2",
      targetId: "some-target",
      route: "/admin",
      title: "Second Step",
      description: "Description of step two.",
    },
    {
      id: "step-3",
      targetId: null,
      route: "/admin",
      title: "Last Step",
      description: "Description of last step.",
    },
  ],
}));

vi.mock("framer-motion", () => ({
  useReducedMotion: () => false,
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  motion: {
    div: React.forwardRef(function MotionDiv(
      {
        children,
        ...props
      }: { children?: React.ReactNode; [key: string]: unknown },
      ref: React.Ref<HTMLDivElement>,
    ) {
      return (
        <div ref={ref} {...props}>
          {children}
        </div>
      );
    }),
    button: React.forwardRef(function MotionButton(
      {
        children,
        whileTap: _wt,
        animate: _a,
        transition: _tr,
        initial: _i,
        ...props
      }: { children?: React.ReactNode; [key: string]: unknown },
      ref: React.Ref<HTMLButtonElement>,
    ) {
      return (
        <button
          ref={ref}
          {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}
        >
          {children}
        </button>
      );
    }),
  },
}));

vi.mock("@heroui/button", () => ({
  Button: ({
    children,
    onPress,
    ...props
  }: {
    children: React.ReactNode;
    onPress?: () => void;
    [key: string]: unknown;
  }) => (
    <button onClick={onPress} {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@/hooks/use-media-query", () => ({
  useMediaQuery: () => true,
}));

vi.mock("lucide-react", () => ({
  ChevronLeft: () => <span>{"<"}</span>,
  ChevronRight: () => <span>{">"}</span>,
}));

import { TutorialPopover } from "@/components/admin/tutorial/tutorial-popover";

beforeEach(() => {
  vi.clearAllMocks();
  mockCurrentStep = 0;
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query === "(min-width: 1024px)",
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
});

const READY = { status: "ready", rect: null } as const;

describe("TutorialPopover", () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("renders step title, description, and step counter on first step", () => {
    render(<TutorialPopover target={READY} />);
    expect(screen.getByText("First Step")).toBeInTheDocument();
    expect(screen.getByText("Description of step one.")).toBeInTheDocument();
    expect(screen.getByText("Step 1 of 3")).toBeInTheDocument();
  });

  it("hides Back button on first step", () => {
    render(<TutorialPopover target={READY} />);
    expect(screen.queryByText("Back")).not.toBeInTheDocument();
  });

  it("shows Skip button on first step and calls skipTutorial on click", () => {
    render(<TutorialPopover target={READY} />);
    const skipBtn = screen.getByText("Skip");
    expect(skipBtn).toBeInTheDocument();
    fireEvent.click(skipBtn);
    expect(mockSkipTutorial).toHaveBeenCalledTimes(1);
  });

  it("shows Next button and calls nextStep on click", () => {
    render(<TutorialPopover target={READY} />);
    const nextBtn = screen.getByText("Next");
    expect(nextBtn).toBeInTheDocument();
    fireEvent.click(nextBtn);
    expect(mockNextStep).toHaveBeenCalledTimes(1);
  });

  it("on last step: Skip hidden, Finish shown, calls completeTutorial", () => {
    mockCurrentStep = 2;
    render(<TutorialPopover target={READY} />);
    expect(screen.queryByText("Skip")).not.toBeInTheDocument();
    expect(screen.queryByText("Next")).not.toBeInTheDocument();
    const finishBtn = screen.getByText("Finish");
    expect(finishBtn).toBeInTheDocument();
    fireEvent.click(finishBtn);
    expect(mockCompleteTutorial).toHaveBeenCalledTimes(1);
  });

  it("shows Back button on non-first step and calls prevStep on click", () => {
    mockCurrentStep = 1;
    render(<TutorialPopover target={READY} />);
    const backBtn = screen.getByText("Back");
    expect(backBtn).toBeInTheDocument();
    fireEvent.click(backBtn);
    expect(mockPrevStep).toHaveBeenCalledTimes(1);
  });

  it("keeps the popover controls inside the viewport when the target is low on the page", () => {
    mockCurrentStep = 1;
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 600,
    });
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 900,
    });
    Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
      configurable: true,
      get: () => 360,
    });

    render(
      <TutorialPopover
        target={{
          status: "ready",
          rect: { x: 500, y: 500, width: 120, height: 40 },
        }}
      />,
    );

    expect(screen.getByRole("dialog")).toHaveStyle({ top: "124px" });
  });

  it("centers on a wrapper, leaving the card transform to Framer Motion", () => {
    mockCurrentStep = 1;
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 800,
    });
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 900,
    });

    render(<TutorialPopover target={{ status: "pending", rect: null }} />);

    expect(screen.getByRole("dialog")).toHaveStyle({
      top: "400px",
      left: "450px",
      transform: "translate(-50%, -50%)",
    });
  });

  it("blocks Next and Back while a step loads but keeps Skip available", () => {
    mockCurrentStep = 1;
    render(<TutorialPopover target={{ status: "pending", rect: null }} />);

    expect(screen.getByRole("status")).toHaveTextContent("Loading this page");
    expect(screen.getByRole("button", { name: /next/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /back/i })).toBeDisabled();

    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(mockNextStep).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /skip/i }));
    expect(mockSkipTutorial).toHaveBeenCalled();
  });

  it("explains an unavailable target and lets the tour continue", () => {
    mockCurrentStep = 1;
    render(<TutorialPopover target={{ status: "unavailable", rect: null }} />);

    expect(screen.getByRole("status")).toHaveTextContent("isn’t available");
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    expect(mockNextStep).toHaveBeenCalled();
  });

  it("leaves arrow keys to fields being edited", () => {
    mockCurrentStep = 1;
    render(<TutorialPopover target={READY} />);
    const input = document.createElement("input");
    document.body.appendChild(input);

    fireEvent.keyDown(input, { key: "ArrowRight" });
    expect(mockNextStep).not.toHaveBeenCalled();

    input.remove();
  });

  it("ignores key repeat so a held arrow cannot race the route", () => {
    mockCurrentStep = 1;
    render(<TutorialPopover target={READY} />);

    fireEvent.keyDown(window, { key: "ArrowRight", repeat: true });
    expect(mockNextStep).not.toHaveBeenCalled();
  });
});
