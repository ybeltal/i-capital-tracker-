import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import ExecutiveLandingPortal from './components/ExecutiveLandingPortal.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ExecutiveLandingPortal>
      <App />
    </ExecutiveLandingPortal>
  </React.StrictMode>
);