"use client";

import React, { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** Fallback when an error is caught. Can be a render function that receives retry. */
  fallback?: ReactNode | ((retry: () => void) => ReactNode);
  /** Called when error is caught (for logging). */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Catches client-side JavaScript errors in the tree below so the rest of the app
 * doesn’t unmount. Use around route content to avoid full "application error" on
 * locale switch + refresh or WebGL/nav hook issues.
 */
export default class ClientErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.props.onError?.(error, errorInfo);
  }

  retry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      const { fallback } = this.props;
      if (fallback !== undefined) {
        return typeof fallback === "function" ? fallback(this.retry) : fallback;
      }
      return (
        <div
          className="min-h-[50vh] flex flex-col items-center justify-center gap-4 p-6 text-center"
          style={{ background: "#0a0a0a", color: "#e5e5e5" }}
          role="alert"
        >
          <p className="text-sm opacity-80">Something went wrong.</p>
          <button
            type="button"
            onClick={this.retry}
            className="px-4 py-2 rounded-full border border-white/40 text-white/90 text-sm font-medium hover:bg-white/10"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
