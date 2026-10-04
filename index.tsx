import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

class GlobalErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Critical Runtime Error caught by GlobalErrorBoundary:", error, errorInfo);
  }

  handleReset = () => {
    try {
      sessionStorage.removeItem('bquad_entered');
    } catch {}
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          backgroundColor: '#090d16',
          color: '#f8fafc',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          textAlign: 'center'
        }}>
          <div style={{
            maxWidth: '520px',
            backgroundColor: '#1e293b',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            borderRadius: '16px',
            padding: '28px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              color: '#ef4444',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              margin: '0 auto 16px auto'
            }}>
              ⚠️
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px', color: '#ffffff' }}>
              B-Quadrant OS Encountered an Issue
            </h2>
            <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.6, marginBottom: '16px' }}>
              A client runtime component halted execution. Click below to recover the dashboard or resume your session safely.
            </p>
            {this.state.error?.message && (
              <pre style={{
                textAlign: 'left',
                backgroundColor: '#0f172a',
                padding: '12px',
                borderRadius: '8px',
                fontSize: '11px',
                color: '#f87171',
                overflowX: 'auto',
                maxHeight: '120px',
                marginBottom: '20px'
              }}>
                {String(this.state.error?.message || this.state.error)}
              </pre>
            )}
            <button
              onClick={this.handleReset}
              style={{
                backgroundColor: '#6366f1',
                color: '#ffffff',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '10px',
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)'
              }}
            >
              Reload Operating System
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}


if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.warn('Service worker registration failed:', error);
    });
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <GlobalErrorBoundary>
      <App />
    </GlobalErrorBoundary>
  </React.StrictMode>
);