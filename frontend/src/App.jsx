import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Ayush from './pages/Ayush';
import Intake from './pages/Intake';
import Home from './pages/Home';
import Documents from './pages/Documents';
import ClinicalSummary from './pages/ClinicalSummary';
import Landing from './pages/Landing';
import PriorityWaiting from './pages/PriorityWaiting';
import PatientHome from './pages/PatientHome';
import VoiceIntake from './pages/VoiceIntake';
import PhysicianDashboard from './pages/PhysicianDashboard';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import { GlobalStateProvider, useGlobalState } from './context/GlobalStateContext';
import './index.css';

/**
 * Route protection component ensuring required authentication token and role.
 */
function ProtectedRoute({ children, allowedRole = 'physician' }) {
  const { globalState } = useGlobalState();
  const token = typeof window !== 'undefined' 
    ? (sessionStorage.getItem('auth_token') || localStorage.getItem('auth_token') || globalState?.token)
    : null;
  const role = globalState?.role || (typeof window !== 'undefined' ? localStorage.getItem('user_role') : null);

  if (!token || role !== allowedRole) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function App() {
  return (
    <ErrorBoundary>
      <GlobalStateProvider>
        <Router>
          <Routes>
            {/* Auth / Role selection — no layout wrapper */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Landing />} />

            {/* Patient flow — no layout wrapper (full screen) */}
            <Route path="/patient-home" element={<PatientHome />} />
            <Route path="/voice-intake" element={<VoiceIntake />} />
            <Route 
              path="/physician-dashboard" 
              element={
                <ProtectedRoute allowedRole="physician">
                  <PhysicianDashboard />
                </ProtectedRoute>
              } 
            />

            {/* Clinical encounter flow with Layout */}
            <Route path="/consent" element={<Navigate to="/patient-home" replace />} />
            <Route path="/home" element={<Layout><Home /></Layout>} />
            <Route path="/ayush" element={<Layout><Ayush /></Layout>} />
            <Route path="/intake" element={<Layout><Intake /></Layout>} />
            <Route path="/documents" element={<Layout><Documents /></Layout>} />
            <Route path="/summary/:sessionId" element={<Layout><ClinicalSummary /></Layout>} />
            <Route path="/priority" element={<Layout><PriorityWaiting /></Layout>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </GlobalStateProvider>
    </ErrorBoundary>
  );
}

export default App;
