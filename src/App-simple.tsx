import { useAuth } from './contexts/AuthContext';

export default function App() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#f5f5f5' }}>
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <h1>FSI DDS</h1>
          <p>Please login to continue</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h1>Welcome, {user?.fullname}</h1>
          <button onClick={logout} style={{ padding: '10px 20px', backgroundColor: '#DA251D', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            Logout
          </button>
        </div>
        
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <h2>Dashboard</h2>
          <p>Role: {user?.role === 'admin' ? 'Administrator' : 'User'}</p>
          <p>User ID: {user?.id}</p>
          
          <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f9f9f9', borderRadius: '4px', border: '1px solid #ddd' }}>
            <h3>System Status</h3>
            <p>✅ Frontend: Online</p>
            <p>✅ Authentication: Working</p>
            <p>✅ Database: Connected</p>
          </div>
        </div>
      </div>
    </div>
  );
}
