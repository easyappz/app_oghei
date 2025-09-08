import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ErrorBoundary from './ErrorBoundary';
import './App.css';
import PaymentsDashboard from './pages/PaymentsDashboard';

function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<PaymentsDashboard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ErrorBoundary>
  );
}

export default App;
