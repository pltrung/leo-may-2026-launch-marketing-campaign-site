"use client";

import React, { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Top-level error boundary wrapping the entire app in root layout.
 * Catches any unhandled client-side errors and shows a minimal branded fallback.
 * Prevents full app crash while maintaining user experience.
 */
export default class GlobalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    if (typeof window !== "undefined") {
      console.error("[GlobalErrorBoundary] Unhandled error:", error, errorInfo);
    }
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div
          className="fixed inset-0 min-h-screen flex flex-col items-center justify-center gap-6 p-6 text-center"
          style={{ background: "#0B0B0F", color: "#e5e5e5" }}
          role="alert"
        >
          <div className="space-y-3">
            <h1 className="text-xl font-semibold">Leo Mây</h1>
            <p className="text-sm opacity-80">Something went wrong. Please refresh the page.</p>
          </div>
          <button
            type="button"
            onClick={this.handleRetry}
            className="px-6 py-3 rounded-full border border-white/40 text-white/90 text-sm font-medium hover:bg-white/10 transition-colors"
          >
            Refresh Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
