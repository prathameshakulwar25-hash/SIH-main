import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Consent Page is now integrated directly into Patient Home
 * via the Aadhaar OTP & Granular Consent Modal.
 */
const Consent = () => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/patient-home', { replace: true, state: { openAadhaarModal: true } });
  }, [navigate]);

  return null;
};

export default Consent;
