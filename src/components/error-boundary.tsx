import { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@heroui/button";
import { AlertTriangle } from "lucide-react";

function ErrorFallback({
  error,
  onReset,
}: {
  error: Error;
  onReset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 px-4">
      <div className="flex flex-col items-center gap-4 text-center max-w-md">
        <AlertTriangle className="w-12 h-12 text-warning" />
        <h2 className="text-xl font-semibold tracking-tight">
          Something went wrong
        </h2>
        <p className="text-sm text-default-500">
          An unexpected error occurred. Try reloading the page.
        </p>
        <code className="text-xs text-default-400 break-all">
          {error.message}
        </code>
        <Button
          color="primary"
          variant="flat"
          onPress={() => {
            onReset();
            window.location.reload();
          }}
        >
          Reload page
        </Button>
      </div>
    </div>
  );
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  // handleReset clears boundary state, but the only current call site always
  // follows with window.location.reload(). React's lazy-module cache is not
  // cleared by a state reset, so calling handleReset alone after a lazy-load
  // failure would immediately re-catch the same error. A full reload is
  // required for recovery from chunk-load failures.
  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <ErrorFallback error={this.state.error} onReset={this.handleReset} />
      );
    }
    return this.props.children;
  }
}
