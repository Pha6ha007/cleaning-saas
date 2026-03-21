import React from "react";

interface Props {
  children: React.ReactNode;
  /** Display name shown in the error fallback UI */
  pageName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Page-level error boundary — catches render errors within a single route
 * instead of crashing the entire app. Users can retry or navigate away
 * while the rest of the app keeps working.
 */
export class PageErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(
      `[PageErrorBoundary${this.props.pageName ? ` — ${this.props.pageName}` : ""}]`,
      error,
      errorInfo.componentStack,
    );
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-1 items-center justify-center p-8">
          <div className="text-center space-y-4 max-w-md">
            <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mx-auto">
              <svg
                className="h-6 w-6 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-foreground">
              {this.props.pageName
                ? `${this.props.pageName} encountered an error`
                : "Something went wrong"}
            </h2>
            <p className="text-sm text-muted-foreground">
              This page couldn't load properly. You can try again or navigate to a different section.
            </p>
            {this.state.error && (
              <p className="text-xs text-muted-foreground/70 font-mono bg-muted px-3 py-2 rounded-md break-all">
                {this.state.error.message}
              </p>
            )}
            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={this.handleRetry}
                className="inline-flex items-center px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Try again
              </button>
              <button
                onClick={() => (window.location.href = "/dashboard")}
                className="inline-flex items-center px-4 py-2 rounded-md border border-input bg-background text-sm font-medium hover:bg-accent transition-colors"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
