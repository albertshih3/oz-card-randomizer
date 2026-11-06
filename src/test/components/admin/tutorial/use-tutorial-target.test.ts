import { act, renderHook } from "@testing-library/react";

let mockPathname = "/admin";
vi.mock("react-router-dom", () => ({
  useLocation: () => ({ pathname: mockPathname }),
}));

import {
  TARGET_TIMEOUT_MS,
  useTutorialTarget,
} from "@/components/admin/tutorial/use-tutorial-target";

function addTarget(width = 100, height = 40) {
  const el = document.createElement("div");
  el.dataset.tutorialId = "t";
  el.getBoundingClientRect = () =>
    ({ x: 10, y: 20, width, height }) as unknown as DOMRect;
  document.body.appendChild(el);
  return el;
}

describe("useTutorialTarget", () => {
  beforeEach(() => {
    mockPathname = "/admin";
    vi.useFakeTimers({
      toFake: [
        "setTimeout",
        "clearTimeout",
        "requestAnimationFrame",
        "cancelAnimationFrame",
      ],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = "";
  });

  it("is ready immediately for a step with no target on its route", () => {
    const { result } = renderHook(() => useTutorialTarget(null, "/admin"));
    expect(result.current).toEqual({ status: "ready", rect: null });
  });

  it("stays pending until the expected route is active", () => {
    addTarget();
    const { result } = renderHook(() => useTutorialTarget("t", "/admin/users"));
    expect(result.current.status).toBe("pending");
  });

  it("skips hidden duplicates and measures the visible match", () => {
    addTarget(0, 0);
    addTarget(100, 40);
    const { result } = renderHook(() => useTutorialTarget("t", "/admin"));
    expect(result.current).toEqual({
      status: "ready",
      rect: { x: 10, y: 20, width: 100, height: 40 },
    });
  });

  it("becomes unavailable after the timeout, then recovers if the target arrives", async () => {
    const { result } = renderHook(() => useTutorialTarget("t", "/admin"));
    expect(result.current.status).toBe("pending");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(TARGET_TIMEOUT_MS + 50);
    });
    expect(result.current.status).toBe("unavailable");

    addTarget();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });
    expect(result.current.status).toBe("ready");
  });

  it("stops observing on unmount", async () => {
    const disconnect = vi.spyOn(MutationObserver.prototype, "disconnect");
    const { unmount } = renderHook(() => useTutorialTarget("t", "/admin"));
    unmount();
    expect(disconnect).toHaveBeenCalled();
  });
});
