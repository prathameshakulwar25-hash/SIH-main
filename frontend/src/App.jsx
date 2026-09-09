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
import { GlobalStateProvider } from './context/GlobalStateContext';
import './index.css';

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
          <Route path="/physician-dashboard" element={<PhysicianDashboard />} />

          {/* Legacy patient flow with Layout (Consent redirects to patient-home) */}
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
