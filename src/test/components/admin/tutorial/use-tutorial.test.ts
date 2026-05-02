import { renderHook, act } from "@testing-library/react";
import React from "react";

const mockNavigate = vi.fn();
let mockPathname = "/admin";

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: mockPathname }),
}));

import { TutorialProvider, useTutorial } from "@/contexts/tutorial-context";
import { TUTORIAL_STEPS } from "@/components/admin/tutorial/steps";

const STORAGE_KEY = "oz-admin-tutorial-v1";

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(TutorialProvider, null, children);
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  mockPathname = "/admin";
  vi.useRealTimers();
});

describe("useTutorial", () => {
  it("startTutorial sets isActive=true, currentStep=0", () => {
    localStorage.setItem(STORAGE_KEY, "completed");
    const { result } = renderHook(() => useTutorial(), { wrapper });
    expect(result.current.isActive).toBe(false);
    act(() => result.current.startTutorial());
    expect(result.current.isActive).toBe(true);
    expect(result.current.currentStep).toBe(0);
  });

  it("nextStep increments currentStep", () => {
    localStorage.setItem(STORAGE_KEY, "completed");
    const { result } = renderHook(() => useTutorial(), { wrapper });
    act(() => result.current.startTutorial());
    act(() => result.current.nextStep());
    expect(result.current.currentStep).toBe(1);
  });

  it("nextStep at last step calls completeTutorial", () => {
    localStorage.setItem(STORAGE_KEY, "completed");
    const { result } = renderHook(() => useTutorial(), { wrapper });
    act(() => result.current.startTutorial());
    // Advance to last step
    for (let i = 0; i < TUTORIAL_STEPS.length - 1; i++) {
      mockPathname = TUTORIAL_STEPS[i + 1].route;
      act(() => result.current.nextStep());
    }
    expect(result.current.currentStep).toBe(TUTORIAL_STEPS.length - 1);
    act(() => result.current.nextStep());
    expect(result.current.isActive).toBe(false);
    expect(localStorage.getItem(STORAGE_KEY)).toBe("completed");
  });

  it("prevStep decrements currentStep", () => {
    localStorage.setItem(STORAGE_KEY, "completed");
    const { result } = renderHook(() => useTutorial(), { wrapper });
    act(() => result.current.startTutorial());
    act(() => result.current.nextStep());
    expect(result.current.currentStep).toBe(1);
    act(() => result.current.prevStep());
    expect(result.current.currentStep).toBe(0);
  });

  it("prevStep at step 0 stays at 0", () => {
    localStorage.setItem(STORAGE_KEY, "completed");
    const { result } = renderHook(() => useTutorial(), { wrapper });
    act(() => result.current.startTutorial());
    act(() => result.current.prevStep());
    expect(result.current.currentStep).toBe(0);
  });

  it("skipTutorial sets isActive=false, writes dismissed to localStorage", () => {
    localStorage.setItem(STORAGE_KEY, "completed");
    const { result } = renderHook(() => useTutorial(), { wrapper });
    act(() => result.current.startTutorial());
    act(() => result.current.skipTutorial());
    expect(result.current.isActive).toBe(false);
    expect(localStorage.getItem(STORAGE_KEY)).toBe("dismissed");
  });

  it("completeTutorial sets isActive=false, writes completed to localStorage", () => {
    localStorage.setItem(STORAGE_KEY, "dismissed");
    const { result } = renderHook(() => useTutorial(), { wrapper });
    act(() => result.current.startTutorial());
    act(() => result.current.completeTutorial());
    expect(result.current.isActive).toBe(false);
    expect(localStorage.getItem(STORAGE_KEY)).toBe("completed");
  });

  it("auto-shows on first visit when localStorage is null", async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useTutorial(), { wrapper });
    expect(result.current.isActive).toBe(false);
    await act(async () => {
      vi.runAllTimersAsync();
    });
    expect(result.current.isActive).toBe(true);
  });

  it("does not auto-show when localStorage is completed", async () => {
    vi.useFakeTimers();
    localStorage.setItem(STORAGE_KEY, "completed");
    const { result } = renderHook(() => useTutorial(), { wrapper });
    await act(async () => {
      vi.runAllTimersAsync();
    });
    expect(result.current.isActive).toBe(false);
  });

  it("does not auto-show when localStorage is in-progress (remount guard)", async () => {
    vi.useFakeTimers();
    localStorage.setItem(STORAGE_KEY, "in-progress");
    const { result } = renderHook(() => useTutorial(), { wrapper });
    await act(async () => {
      vi.runAllTimersAsync();
    });
    expect(result.current.isActive).toBe(false);
  });

  it("auto-show writes in-progress to localStorage", async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useTutorial(), { wrapper });
    await act(async () => {
      vi.runAllTimersAsync();
    });
    expect(result.current.isActive).toBe(true);
    expect(localStorage.getItem(STORAGE_KEY)).toBe("in-progress");
  });

  it("startTutorial resets currentStep to 0 even when called mid-tour", () => {
    localStorage.setItem(STORAGE_KEY, "completed");
    const { result } = renderHook(() => useTutorial(), { wrapper });
    act(() => result.current.startTutorial());
    act(() => result.current.nextStep());
    expect(result.current.currentStep).toBe(1);
    act(() => result.current.startTutorial());
    expect(result.current.currentStep).toBe(0);
    expect(result.current.isActive).toBe(true);
  });
});
