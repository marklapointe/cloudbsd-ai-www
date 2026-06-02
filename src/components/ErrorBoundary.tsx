import React from 'react';
import { AlertTriangle, RotateCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Top-level error boundary. Catches render-phase throws from any descendant
 * so a single broken page does not blank the whole app and the user gets a
 * "Try again" affordance instead of a white screen.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught render error:', error, info.componentStack);
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} onReset={this.reset} />;
    }
    return this.props.children;
  }
}

interface ErrorFallbackProps {
  error: Error | null;
  onReset: () => void;
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({ error, onReset }) => {
  const { t } = useTranslation();
  return (
    <div
      role="alert"
      className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-950 transition-colors duration-300"
    >
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 p-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto mb-6">
          <AlertTriangle size={26} />
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 mb-2">
          {t('common.error')}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          {t('errorBoundary.description')}
        </p>
        {error?.message && (
          <pre className="text-left text-xs bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 p-3 rounded-xl overflow-auto max-h-40 mb-6 border border-slate-100 dark:border-slate-700">
            {error.message}
          </pre>
        )}
        <button
          onClick={onReset}
          className="inline-flex items-center gap-2 px-5 py-3 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-2xl transition-all active:scale-95 shadow-lg shadow-brand-500/20"
        >
          <RotateCw size={16} />
          {t('errorBoundary.try_again')}
        </button>
      </div>
    </div>
  );
};
