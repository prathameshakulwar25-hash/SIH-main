import React, { createContext, useContext, useState, useCallback } from 'react';

const GlobalStateContext = createContext();

export const useGlobalState = () => useContext(GlobalStateContext);

const INITIAL_STATE = {
  session_id: null,
  abha_id: null,
  consent_granted: false,
  consents: {
    voice: true,
    documents: true,
    ayush: true,
    his_emr: true,
    abha_fhir: false
  },
  complaint: null,
  ayush_answers: [],
  ayush_result: null,
  intake_answers: {},
  intake_result: null,
  documents: [],
  language: 'en',
  patient_contact: {
    email: '',
    phone: ''
  },
  physician_review: {},
  // Auth & role
  role: null,         // 'patient' | 'physician'
  token: null,        // Signed JWT access token
  patientName: '',
  abha_profile: null, // Full ABDM Profile (name, gender, dob, abha_address, photo)
  // Criticality from AI
  criticality: null,  // 'emergency' | 'urgent' | 'routine'
  isCritical: false,
};

export const GlobalStateProvider = ({ children }) => {
  const [globalState, setGlobalState] = useState(() => {
    const saved = sessionStorage.getItem('global_state');
    return saved ? JSON.parse(saved) : INITIAL_STATE;
  });

  const updateState = useCallback((updates) => {
    setGlobalState(prev => {
      const nextState = { ...prev, ...updates };
      // Secure state persistence without dumping PII to browser logs
      sessionStorage.setItem('global_state', JSON.stringify(nextState));
      if (nextState.token) {
        sessionStorage.setItem('auth_token', nextState.token);
      }
      return nextState;
    });
  }, []);

  const resetState = () => {
    sessionStorage.removeItem('global_state');
    sessionStorage.removeItem('session_id');
    sessionStorage.removeItem('auth_token');
    localStorage.removeItem('auth_token');
    const freshState = { ...INITIAL_STATE, language: globalState.language || 'en' };
    setGlobalState(freshState);
    sessionStorage.setItem('global_state', JSON.stringify(freshState));
    return freshState;
  };

  return (
    <GlobalStateContext.Provider value={{ globalState, updateState, resetState }}>
      {children}
    </GlobalStateContext.Provider>
  );
};
