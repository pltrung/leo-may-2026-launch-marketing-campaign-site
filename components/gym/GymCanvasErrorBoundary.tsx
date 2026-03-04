"use client";

import React, { Component, type ErrorInfo, type ReactNode } from "react";
import type { SkyTheme } from "@/components/gym/theme/skyTheme";

interface Props {
  children: ReactNode;
  theme: SkyTheme;
  fallbackClassName?: string;
}

interface State {
  hasError: boolean;
}

/**
 * Catches WebGL/Canvas/Three errors (e.g. on mobile) so the gym page still shows
 * scroll story and overlay; only the 3D view is replaced by the theme gradient.
 */
export default class GymCanvasErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
      console.warn("[GymCanvas] Fallback due to error:", error?.message, errorInfo?.componentStack);
    }
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div
          className={this.props.fallbackClassName}
          style={{
            position: "absolute",
            inset: 0,
            background: this.props.theme.bgGradient,
          }}
          aria-hidden
        />
      );
    }
    return this.props.children;
  }
}
