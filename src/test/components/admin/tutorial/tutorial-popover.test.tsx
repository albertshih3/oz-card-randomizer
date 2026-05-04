import React from "react";
import { act, render, screen, fireEvent } from "@testing-library/react";

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

describe("TutorialPopover", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it("renders step title, description, and step counter on first step", () => {
    render(<TutorialPopover />);
    expect(screen.getByText("First Step")).toBeInTheDocument();
    expect(screen.getByText("Description of step one.")).toBeInTheDocument();
    expect(screen.getByText("Step 1 of 3")).toBeInTheDocument();
  });

  it("hides Back button on first step", () => {
    render(<TutorialPopover />);
    expect(screen.queryByText("Back")).not.toBeInTheDocument();
  });

  it("shows Skip button on first step and calls skipTutorial on click", () => {
    render(<TutorialPopover />);
    const skipBtn = screen.getByText("Skip");
    expect(skipBtn).toBeInTheDocument();
    fireEvent.click(skipBtn);
    expect(mockSkipTutorial).toHaveBeenCalledTimes(1);
  });

  it("shows Next button and calls nextStep on click", () => {
    render(<TutorialPopover />);
    const nextBtn = screen.getByText("Next");
    expect(nextBtn).toBeInTheDocument();
    fireEvent.click(nextBtn);
    expect(mockNextStep).toHaveBeenCalledTimes(1);
  });

  it("on last step: Skip hidden, Finish shown, calls completeTutorial", () => {
    mockCurrentStep = 2;
    render(<TutorialPopover />);
    expect(screen.queryByText("Skip")).not.toBeInTheDocument();
    expect(screen.queryByText("Next")).not.toBeInTheDocument();
    const finishBtn = screen.getByText("Finish");
    expect(finishBtn).toBeInTheDocument();
    fireEvent.click(finishBtn);
    expect(mockCompleteTutorial).toHaveBeenCalledTimes(1);
  });

  it("shows Back button on non-first step and calls prevStep on click", () => {
    mockCurrentStep = 1;
    render(<TutorialPopover />);
    const backBtn = screen.getByText("Back");
    expect(backBtn).toBeInTheDocument();
    fireEvent.click(backBtn);
    expect(mockPrevStep).toHaveBeenCalledTimes(1);
  });

  it("keeps the popover controls inside the viewport when the target is low on the page", () => {
    vi.useFakeTimers();
    mockCurrentStep = 1;
    const target = document.createElement("div");
    target.dataset.tutorialId = "some-target";
    target.getBoundingClientRect = vi.fn(
      () =>
        ({
          x: 500,
          y: 500,
          top: 500,
          right: 620,
          bottom: 540,
          left: 500,
          width: 120,
          height: 40,
          toJSON: vi.fn(),
        }) as DOMRect,
    );
    document.body.appendChild(target);
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

    render(<TutorialPopover />);
    act(() => {
      vi.advanceTimersByTime(250);
    });

    const dialogCard = screen.getByRole("dialog").firstElementChild;
    expect(dialogCard).toHaveStyle({ top: "124px" });

    target.remove();
  });

  it("remeasures after a routed step target appears late", () => {
    vi.useFakeTimers();
    mockCurrentStep = 1;
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 800,
    });
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 900,
    });

    render(<TutorialPopover />);
    act(() => {
      vi.advanceTimersByTime(250);
    });

    const dialogCard = screen.getByRole("dialog").firstElementChild;
    expect(dialogCard).toHaveStyle({
      top: "400px",
      left: "450px",
      transform: "translate(-50%, -50%)",
    });

    const target = document.createElement("div");
    target.dataset.tutorialId = "some-target";
    target.getBoundingClientRect = vi.fn(
      () =>
        ({
          x: 100,
          y: 120,
          top: 120,
          right: 220,
          bottom: 160,
          left: 100,
          width: 120,
          height: 40,
          toJSON: vi.fn(),
        }) as DOMRect,
    );
    document.body.appendChild(target);

    act(() => {
      vi.advanceTimersByTime(150);
    });

    expect(dialogCard).toHaveStyle({
      top: "176px",
      left: "16px",
      transform: "",
    });

    target.remove();
  });
});
