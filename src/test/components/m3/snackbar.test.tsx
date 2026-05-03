import { render, screen, act } from "@testing-library/react";
import { M3Snackbar } from "@/components/m3/snackbar";

describe("M3Snackbar", () => {
  it("renders the live region container but no visible message when message is null", () => {
    const { container } = render(
      <M3Snackbar message={null} onDismiss={vi.fn()} />,
    );
    expect(screen.queryByRole("status")).toBeInTheDocument();
    expect(container.querySelector('[class*="snackbar-enter"]')).toBeNull();
  });

  it("renders message text when message is non-null", () => {
    render(<M3Snackbar message="Card saved" onDismiss={vi.fn()} />);
    expect(screen.getByText("Card saved")).toBeInTheDocument();
  });

  it("calls onDismiss after durationMs", async () => {
    vi.useFakeTimers();
    try {
      const onDismiss = vi.fn();
      render(
        <M3Snackbar message="test" onDismiss={onDismiss} durationMs={1000} />,
      );
      await act(async () => {
        await vi.runAllTimersAsync();
      });
      expect(onDismiss).toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("renders action button when actionLabel is provided", () => {
    render(
      <M3Snackbar
        message="Error"
        onDismiss={vi.fn()}
        actionLabel="Undo"
        onAction={vi.fn()}
      />,
    );
    expect(screen.getByText("Undo")).toBeInTheDocument();
  });
});
