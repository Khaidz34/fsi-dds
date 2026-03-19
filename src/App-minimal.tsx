import React, { useState, useEffect } from 'react';
import { useAuth } from './contexts/AuthContext';
import Login from './components/Login';

export default function App() {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: '#f5f5f5'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #DA251D',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }} />
          <p>Loading...</p>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login theme="corporate" currentLang="vi" setTheme={() => {}} setCurrentLang={() => {}} />;
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f5f5f5',
      padding: '20px'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <h1>Welcome, {user?.fullname}!</h1>
        <p>Role: {user?.role === 'admin' ? 'Administrator' : 'User'}</p>
        
        <div style={{
          marginTop: '20px',
          padding: '15px',
          backgroundColor: '#f9f9f9',
          borderRadius: '4px',
          border: '1px solid #ddd'
        }}>
          <h2>Dashboard</h2>
          <p>This is a minimal version of the app.</p>
          <p>Full features coming soon...</p>
        </div>
      </div>
    </div>
  );
}
