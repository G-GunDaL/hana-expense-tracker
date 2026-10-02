import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '24px', backgroundColor: '#0f172a', color: '#fff', minHeight: '100vh', fontFamily: 'sans-serif' }}>
          <h2 style={{ color: '#ef4444', fontSize: '20px', fontWeight: 'bold' }}>⚠️ 앱 로딩 중 오류가 발생했습니다</h2>
          <div style={{ marginTop: '16px', padding: '16px', backgroundColor: '#1e293b', borderRadius: '8px', overflowX: 'auto' }}>
            <p style={{ color: '#f87171', fontWeight: 'bold' }}>{this.state.error?.toString()}</p>
            <pre style={{ fontSize: '12px', color: '#94a3b8', marginTop: '8px', whiteSpace: 'pre-wrap' }}>
              {this.state.errorInfo?.componentStack}
            </pre>
          </div>
          <button
            onClick={() => {
              try {
                localStorage.clear();
                sessionStorage.clear();
                if ('caches' in window) {
                  caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))));
                }
                if ('serviceWorker' in navigator) {
                  navigator.serviceWorker.getRegistrations().then(regs => {
                    regs.forEach(r => r.unregister());
                  });
                }
              } catch (e) {
                console.warn('Storage clear error:', e);
              }
              window.location.reload();
            }}
            style={{
              marginTop: '20px',
              padding: '12px 20px',
              backgroundColor: '#3b82f6',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            캐시 초기화 후 새로고침
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
