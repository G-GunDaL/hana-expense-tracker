import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
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
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      console.warn('Storage clear error:', e);
    }
    if (this.props.onReset) {
      this.props.onReset();
    }
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-5">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">
            {this.props.fallbackTitle || '화면을 불러오는 중 문제가 발생했습니다'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mb-6 leading-relaxed">
            모바일 브라우저 환경에서 데이터 렌더링 중 오류가 발생했습니다.<br />
            아래 버튼을 눌러 새로고침하거나 캐시를 초기화해 복구할 수 있습니다.
          </p>

          {this.state.error && (
            <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-left mb-6 overflow-x-auto text-[11px] text-rose-300 font-mono">
              {this.state.error.message || String(this.state.error)}
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={this.handleReload}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm flex items-center justify-center space-x-2 transition-colors shadow-lg shadow-brand-500/20"
            >
              <RefreshCw className="w-4 h-4" />
              <span>화면 새로고침</span>
            </button>
            <button
              onClick={this.handleReset}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-sm flex items-center justify-center space-x-2 transition-colors border border-slate-700"
            >
              <RotateCcw className="w-4 h-4" />
              <span>캐시 초기화 후 재시작</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
