import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App-simple.tsx';
import './index.css';
import { AuthProvider } from './contexts/AuthContext.tsx';

// Error Boundary Component
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('React Error:', error);
    console.error('Error Info:', errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          backgroundColor: '#f5f5f5',
          fontFamily: 'system-ui',
          padding: '20px'
        }}>
          <div style={{ textAlign: 'center', maxWidth: '500px' }}>
            <h1>❌ Oops! Something went wrong</h1>
            <p style={{ color: '#666', marginBottom: '20px' }}>
              {this.state.error?.message || 'Unknown error'}
            </p>
            <pre style={{
              backgroundColor: '#f0f0f0',
              padding: '15px',
              borderRadius: '8px',
              textAlign: 'left',
              overflow: 'auto',
              maxHeight: '200px',
              fontSize: '12px'
            }}>
              {this.state.error?.stack}
            </pre>
            <button onClick={() => window.location.reload()} style={{
              padding: '10px 20px',
              marginTop: '20px',
              backgroundColor: '#DA251D',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px'
            }}>
              🔄 Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

console.log('🚀 App starting...');
console.log('API URL:', import.meta.env.VITE_API_URL || 'Using default');

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('❌ Root element not found!');
} else {
  console.log('✅ Root element found');
  createRoot(rootElement).render(
    <StrictMode>
      <ErrorBoundary>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ErrorBoundary>
    </StrictMode>,
  );
  console.log('✅ App rendered');
}

