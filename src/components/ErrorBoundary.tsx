import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  name?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`Error in ${this.props.name || 'ErrorBoundary'}:`, error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="p-6 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-2xl m-4">
          <h2 className="text-red-800 dark:text-red-300 font-bold text-lg mb-2">Something went wrong</h2>
          <p className="text-red-600 dark:text-red-400 text-sm mb-4">
            {this.props.name ? `The ${this.props.name} encountered an error.` : 'An error occurred in this component.'}
          </p>
          <pre className="text-xs bg-red-100 dark:bg-red-900/40 p-4 rounded-lg overflow-auto max-h-40 text-red-900 dark:text-red-200 font-mono">
            {this.state.error?.message}
          </pre>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition-colors"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
