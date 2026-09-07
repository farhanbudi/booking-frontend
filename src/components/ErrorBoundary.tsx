import { Component, type ReactNode } from "react";
import { logger } from "../utils/logger";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    logger.error("Unhandled error di React component", {
      message: error.message,
      stack: error.stack,
      componentStack: info.componentStack,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-md mx-auto mt-20 text-center">
          <h1 className="text-xl font-semibold mb-2">Ada yang tidak beres</h1>
          <p className="text-muted text-sm mb-4">
            Terjadi kesalahan yang tidak terduga. Coba muat ulang halaman.
          </p>
          <button onClick={() => window.location.reload()} className="btn-primary">
            Muat ulang
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
