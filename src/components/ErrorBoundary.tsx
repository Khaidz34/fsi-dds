import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });

    // Tự động reload trang nếu lỗi do module/chunk không tìm thấy (thường xảy ra khi server vừa deploy bản mới)
    const isChunkError = 
      error?.message?.includes('Failed to fetch dynamically imported module') ||
      error?.message?.includes('Importing a module script failed') ||
      error?.message?.includes('Loading chunk');

    if (isChunkError) {
      const alreadyReloaded = sessionStorage.getItem('chunk_reload_attempted');
      if (!alreadyReloaded) {
        sessionStorage.setItem('chunk_reload_attempted', 'true');
        console.warn('🔄 Phát hiện phiên bản ứng dụng mới (chunk hash mismatch), tự động tải lại trang...');
        window.location.reload();
      }
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  private handleReload = () => {
    window.location.reload();
  };

  private toggleDetails = () => {
    this.setState(prev => ({ showDetails: !prev.showDetails }));
  };

  public render() {
    if (this.state.hasError) {
      const title = this.props.fallbackTitle || 'Đã xảy ra sự cố không mong muốn';
      const message = this.props.fallbackMessage || 
        'Thao tác này gặp sự cố hiển thị. Vui lòng bấm thử lại hoặc tải lại trang.';

      return (
        <div className="min-h-[260px] p-6 flex flex-col items-center justify-center bg-white rounded-2xl border border-emerald-100 shadow-sm text-center">
          <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mb-4 shadow-sm border border-amber-100">
            <AlertTriangle className="w-7 h-7" />
          </div>

          <h3 className="text-lg font-bold text-slate-800 mb-1">{title}</h3>
          <p className="text-sm text-slate-600 max-w-md mb-6">{message}</p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-xl transition-colors shadow-sm"
            >
              <RotateCcw className="w-4 h-4" />
              Thử lại
            </button>
            <button
              onClick={this.handleReload}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Tải lại trang
            </button>
          </div>

          {this.state.error && (
            <div className="mt-4 text-left w-full max-w-lg">
              <button
                type="button"
                onClick={this.toggleDetails}
                className="text-xs text-slate-500 hover:text-slate-700 underline focus:outline-none"
              >
                {this.state.showDetails ? 'Ẩn chi tiết kỹ thuật' : 'Xem chi tiết lỗi'}
              </button>
              {this.state.showDetails && (
                <div className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-700 overflow-auto max-h-48 text-left">
                  <p className="font-semibold text-rose-600">{this.state.error.toString()}</p>
                  {this.state.errorInfo?.componentStack && (
                    <pre className="mt-1 whitespace-pre-wrap text-[11px] text-slate-500">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
