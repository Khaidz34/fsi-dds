import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './contexts/AuthContext.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';

console.log('🚀 App starting...');
console.log('API URL:', import.meta.env.VITE_API_URL || 'Using default');

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('❌ Root element not found!');
} else {
  console.log('✅ Root element found');
  createRoot(rootElement).render(
    <React.StrictMode>
      <ErrorBoundary fallbackTitle="Không thể tải ứng dụng FSI-DDS">
        <AuthProvider>
          <App />
        </AuthProvider>
      </ErrorBoundary>
    </React.StrictMode>,
  );
  console.log('✅ App rendered');
}
