import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  compact?: boolean;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Catches unexpected render/runtime errors so React never unmounts to an empty
 * blank screen. Supports both full-page and compact card fallbacks.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    const { compact } = this.props;
    return (
      <div
        role="alert"
        style={{
          position: 'relative',
          zIndex: 1,
          minHeight: compact ? 180 : '100vh',
          background: '#f8fafc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: compact ? 20 : 32,
          fontFamily: 'Satoshi, system-ui, sans-serif',
          color: '#0f172a',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 460,
            background: '#ffffff',
            borderRadius: 16,
            padding: compact ? 20 : 28,
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 20px rgba(15,23,42,0.06)',
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>
            Something went wrong while rendering this view
          </div>
          <p style={{ fontSize: 13, color: '#475569', margin: '0 0 14px', lineHeight: 1.5 }}>
            {this.state.error.message || 'An unexpected UI error occurred.'}
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              onClick={() => this.setState({ error: null })}
              className="cursor-pointer"
              style={{
                padding: '8px 14px',
                borderRadius: 9,
                border: '1px solid #e2e8f0',
                background: '#ffffff',
                color: '#0f172a',
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              Retry
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="cursor-pointer"
              style={{
                padding: '8px 14px',
                borderRadius: 9,
                border: 'none',
                background: '#00C27A',
                color: '#ffffff',
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              Reload Page
            </button>
          </div>
        </div>
      </div>
    );
  }
}
