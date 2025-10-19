import React from 'react';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>🎥 VMS - Video Management System</h1>
        <p>Welcome to VMS MVP</p>
        <div className="status">
          <p>✓ Frontend Running</p>
          <p>✓ API Connected</p>
          <p>✓ Database Ready</p>
        </div>
        <div className="info">
          <p>Default Login: admin / admin123</p>
          <a href="/api" target="_blank" rel="noopener noreferrer">
            API Documentation
          </a>
        </div>
      </header>
    </div>
  );
}

export default App;
