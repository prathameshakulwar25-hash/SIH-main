import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useGlobalState } from '../context/GlobalStateContext';
import {
  Globe, HeartPulse, Stethoscope, ArrowRight, Lock, ShieldCheck,
  Eye, EyeOff, Activity, Sparkles, Smartphone, Mail, CreditCard,
  ArrowLeft, RotateCcw, CheckCircle2, Loader2, Shield, QrCode, User, Server, Users
} from 'lucide-react';
import { JeevanBrand } from '../components/JeevanLogo';
import { API_BASE, getApiBase } from '../config/api';
import ServerConfigModal from '../components/ServerConfigModal';
import KioskScanAndSitModal from '../components/KioskScanAndSitModal';

const PHYSICIAN_PIN = '1234';

const LANG_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'हिन्दी (Hindi)' },
  { value: 'mr', label: 'मराठी (Marathi)' },
];

const T = {
  en: {
    appName: 'Jeevan',
    subBrand: 'Digital Care of Every Life',
    tagline: 'AI-Powered Clinical History Platform for AYUSH & General OPD Care',
    patientTab: 'Patient Portal',
    physicianTab: 'Doctor Portal',
    methodMobile: 'Mobile OTP',
    methodAbha: 'ABHA ID / ABDM',
    methodEmail: 'Email OTP',
    nameLabel: 'Full Name',
    namePlaceholder: 'Enter your full name',
    mobileLabel: '10-Digit Mobile Number',
    mobilePlaceholder: '9876543210',
    emailLabel: 'Email Address',
    emailPlaceholder: 'you@example.com',
    abhaLabel: '14-Digit ABHA ID or @abdm address',
    abhaPlaceholder: 'e.g. 91-4582-7491-0382 or rahul@abdm',
    sendOtpBtn: 'Send Login OTP',
    sendEmailOtpBtn: 'Send Email OTP',
    verifyOtpBtn: 'Verify & Enter Intake',
    loginWithAbhaBtn: 'Login with ABHA ID',
    otpLabel: 'Enter 6-Digit Verification Code',
    otpSentMobile: (mob) => `Code sent to +91 ${mob}`,
    otpSentEmail: (em) => `Code sent to ${em}`,
    resendOtp: 'Resend Code',
    resendIn: (s) => `Resend in ${s}s`,
    changeNumber: 'Change',
    pinLabel: 'Doctor Access PIN',
    pinPlaceholder: 'Enter 4-digit PIN',
    doctorMobileLabel: 'Registered Doctor Mobile',
    sendDoctorOtpBtn: 'Verify PIN & Send 2FA Code',
    verifyDoctorOtpBtn: 'Verify & Open Dashboard',
    wrongPin: 'Incorrect PIN. Demo PIN is 1234.',
    nameRequired: 'Please enter your name.',
    mobileRequired: 'Please enter a valid 10-digit mobile number.',
    emailRequired: 'Please enter a valid email address.',
    abhaRequired: 'Please enter your ABHA number or address.',
    otpRequired: 'Please enter the 6-digit verification code.',
    footerNote: 'NDHM / ABDM Health Privacy Compliant • 256-Bit TLS Encryption • Doctor Verified',
    badgeAbha: 'ABHA & ABDM Ready',
    badgeOpd: 'Smart Clinical Intake',
  },
  hi: {
    appName: 'जीवन',
    subBrand: 'प्रत्येक जीवन की डिजिटल देखभाल',
    tagline: 'आयुष और सामान्य ओपीडी देखभाल के लिए एआई-संचालित क्लिनिकल इतिहास प्लेटफॉर्म',
    patientTab: 'मरीज़ पोर्टल',
    physicianTab: 'चिकित्सक पोर्टल',
    methodMobile: 'मोबाइल ओटीपी',
    methodAbha: 'आभा आईडी / एबीडीएम',
    methodEmail: 'ईमेल ओटीपी',
    nameLabel: 'पूरा नाम',
    namePlaceholder: 'अपना पूरा नाम दर्ज करें',
    mobileLabel: '10-अंकों का मोबाइल नंबर',
    mobilePlaceholder: '9876543210',
    emailLabel: 'ईमेल पता',
    emailPlaceholder: 'you@example.com',
    abhaLabel: '14-अंकों की आभा आईडी या @abdm पता',
    abhaPlaceholder: 'उदा. 91-4582-7491-0382 या rahul@abdm',
    sendOtpBtn: 'लॉगिन ओटीपी भेजें',
    sendEmailOtpBtn: 'ईमेल ओटीपी भेजें',
    verifyOtpBtn: 'सत्यापित करें और शुरू करें',
    loginWithAbhaBtn: 'आभा आईडी से लॉगिन करें',
    otpLabel: '6-अंकों का सत्यापन कोड दर्ज करें',
    otpSentMobile: (mob) => `+91 ${mob} पर कोड भेजा गया`,
    otpSentEmail: (em) => `${em} पर कोड भेजा गया`,
    resendOtp: 'पुनः कोड भेजें',
    resendIn: (s) => `${s}s में पुनः भेजें`,
    changeNumber: 'बदलें',
    pinLabel: 'चिकित्सक एक्सेस पिन',
    pinPlaceholder: 'अपना 4-अंकों का पिन दर्ज करें',
    doctorMobileLabel: 'पंजीकृत डॉक्टर मोबाइल',
    sendDoctorOtpBtn: 'पिन जांचें और 2FA कोड भेजें',
    verifyDoctorOtpBtn: 'सत्यापित करें और डैशबोर्ड खोलें',
    wrongPin: 'गलत पिन। डेमो पिन 1234 है।',
    nameRequired: 'कृपया अपना नाम दर्ज करें।',
    mobileRequired: 'कृपया मान्य 10-अंकों का मोबाइल नंबर दर्ज करें।',
    emailRequired: 'कृपया मान्य ईमेल पता दर्ज करें।',
    abhaRequired: 'कृपया आभा आईडी दर्ज करें।',
    otpRequired: 'कृपया 6-अंकों का ओटीपी कोड दर्ज करें।',
    footerNote: 'एनडीएचएम / एबीडीएम डेटा गोपनीयता अनुरूप • 256-बिट सुरक्षा • डॉक्टर द्वारा सत्यापित',
    badgeAbha: 'आभा और एबीडीएम अनुरूप',
    badgeOpd: 'स्मार्ट क्लिनिकल इनटेक',
  },
  mr: {
    appName: 'जीवन',
    subBrand: 'प्रत्येक जीवनाची डिजिटल काळजी',
    tagline: 'आयुष आणि सामान्य ओपीडी सेवेसाठी एआई-सक्षम क्लिनिकल हिस्ट्री प्लॅटफॉर्म',
    patientTab: 'रुग्ण पोर्टल',
    physicianTab: 'डॉक्टर पोर्टल',
    methodMobile: 'मोबाईल OTP',
    methodAbha: 'ABHA ID / ABDM',
    methodEmail: 'ईमेल OTP',
    nameLabel: 'पूर्ण नाव',
    namePlaceholder: 'तुमचे पूर्ण नाव टाका',
    mobileLabel: '10-अंकी मोबाईल नंबर',
    mobilePlaceholder: '9876543210',
    emailLabel: 'ईमेल पत्ता',
    emailPlaceholder: 'you@example.com',
    abhaLabel: '14-अंकी ABHA ID किंवा @abdm पत्ता',
    abhaPlaceholder: 'उदा. 91-4582-7491-0382 किंवा rahul@abdm',
    sendOtpBtn: 'लॉगिन OTP पाठवा',
    sendEmailOtpBtn: 'ईमेल OTP पाठवा',
    verifyOtpBtn: 'पडताळा आणि सुरू करा',
    loginWithAbhaBtn: 'ABHA ID ने लॉगिन करा',
    otpLabel: '6-अंकी पडताळणी कोड टाका',
    otpSentMobile: (mob) => `+91 ${mob} वर कोड पाठवला आहे`,
    otpSentEmail: (em) => `${em} वर कोड पाठवला आहे`,
    resendOtp: 'पुन्हा कोड पाठवा',
    resendIn: (s) => `${s}s मध्ये पुन्हा पाठवा`,
    changeNumber: 'बदला',
    pinLabel: 'डॉक्टर ऍक्सेस पिन',
    pinPlaceholder: '4-अंकी पिन टाका',
    doctorMobileLabel: 'नोंदणीकृत डॉक्टर मोबाईल',
    sendDoctorOtpBtn: 'पिन तपासा आणि 2FA कोड पाठवा',
    verifyDoctorOtpBtn: 'पडताळा आणि डॅशबोर्ड उघडा',
    wrongPin: 'चुकीचा पिन. डेमो पिन 1234 आहे.',
    nameRequired: 'कृपया तुमचे नाव टाका.',
    mobileRequired: 'कृपया वैध 10-अंकी मोबाईल नंबर टाका.',
    emailRequired: 'कृपया वैध ईमेल पत्ता टाका.',
    abhaRequired: 'कृपया ABHA ID टाका.',
    otpRequired: 'कृपया 6-अंकी OTP टाका.',
    footerNote: 'NDHM / ABDM डेटा गोपनीयता सुसंगत • 256-बिट सुरक्षितता • डॉक्टरांकडून प्रमाणित',
    badgeAbha: 'ABHA आणि ABDM सुसंगत',
    badgeOpd: 'स्मार्ट क्लिनिकल इनटेक',
  }
};

const SAMPLE_DEMO_ABHAS = [
  { name: 'Rahul Dev Sharma', abha: '91-4582-7491-0382', address: 'rahul.sharma@abdm' },
  { name: 'Rajesh Kumar', abha: '11-1111-1111-1111', address: 'rajesh.kumar@abdm' },
  { name: 'Priya Aniket Patil', abha: '27-8912-3456-7890', address: 'priya.patil@abdm' },
  { name: 'Sunita Sharma', abha: '22-2222-2222-2222', address: 'sunita.sharma@abdm' },
  { name: 'Amit Patel', abha: '33-3333-3333-3333', address: 'amit.patel@abdm' },
];

const Landing = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isMobileQr = searchParams.get('channel') === 'mobile_qr' || searchParams.get('mode') === 'mobile';
  const { globalState, updateState, resetState } = useGlobalState();
  const lang = globalState?.language || 'en';
  const t = T[lang] || T.en;

  // Primary Tab: 'patient' | 'physician'
  const [activeTab, setActiveTab] = useState('patient');
  const [showKioskModal, setShowKioskModal] = useState(false);
  
  // Patient Login Method: 'mobile' | 'abha' | 'email'
  const [patientMethod, setPatientMethod] = useState('mobile');

  // Form Fields
  const [patientName, setPatientName] = useState('');
  const [patientMobile, setPatientMobile] = useState('');
  const [patientEmail, setPatientEmail] = useState('');
  const [abhaInput, setAbhaInput] = useState('');
  const [fetchedProfile, setFetchedProfile] = useState(null);
  const [isSearchingAbha, setIsSearchingAbha] = useState(false);

  // OTP Verification States
  const [otpStep, setOtpStep] = useState(false); // false: inputs, true: enter OTP
  const [otpCode, setOtpCode] = useState('');
  const [demoOtp, setDemoOtp] = useState('');
  const [resendTimer, setResendTimer] = useState(30);

  // Physician States
  const [doctorPin, setDoctorPin] = useState('');
  const [showDoctorPin, setShowDoctorPin] = useState(false);
  const [doctorMobile, setDoctorMobile] = useState('9876543210');
  const [doctorOtpStep, setDoctorOtpStep] = useState(false);
  const [doctorOtpCode, setDoctorOtpCode] = useState('');
  const [doctorDemoOtp, setDoctorDemoOtp] = useState('');
  const [doctorTimer, setDoctorTimer] = useState(30);

  // Status & Feedback
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [showServerModal, setShowServerModal] = useState(false);

  // Timer countdowns
  useEffect(() => {
    let tId;
    if (otpStep && resendTimer > 0) {
      tId = setInterval(() => setResendTimer(prev => prev - 1), 1000);
    }
    return () => clearInterval(tId);
  }, [otpStep, resendTimer]);

  useEffect(() => {
    let tId;
    if (doctorOtpStep && doctorTimer > 0) {
      tId = setInterval(() => setDoctorTimer(prev => prev - 1), 1000);
    }
    return () => clearInterval(tId);
  }, [doctorOtpStep, doctorTimer]);

  // Reset errors and steps when switching tabs
  const handleTabSwitch = (tab) => {
    setActiveTab(tab);
    setError('');
    setSuccessMsg('');
    setOtpStep(false);
    setDoctorOtpStep(false);
  };

  const handleMethodSwitch = (method) => {
    setPatientMethod(method);
    setError('');
    setSuccessMsg('');
    setOtpStep(false);
  };

  // Instant ABHA Lookup / Auto-fetch
  const fetchAbhaDetails = async (query) => {
    const q = (query !== undefined ? query : abhaInput).trim();
    if (!q || q.length < 4) {
      setFetchedProfile(null);
      return;
    }
    setIsSearchingAbha(true);
    try {
      const res = await fetch(`${API_BASE}/api/abdm/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (res.ok && data.found && data.profile) {
        setFetchedProfile(data.profile);
        if (data.profile.name) setPatientName(data.profile.name);
        if (data.profile.mobile) setPatientMobile(data.profile.mobile);
        if (data.profile.email) setPatientEmail(data.profile.email);
        setError('');
      } else {
        setFetchedProfile(null);
      }
    } catch {
      // offline / mock fallback
    } finally {
      setIsSearchingAbha(false);
    }
  };

  // Debounced auto-fetch when patient types or pastes ABHA ID
  useEffect(() => {
    if (patientMethod !== 'abha') return;
    const clean = abhaInput.trim();
    if (clean.length >= 8 || clean.includes('@')) {
      const timer = setTimeout(() => {
        fetchAbhaDetails(clean);
      }, 350);
      return () => clearTimeout(timer);
    } else {
      setFetchedProfile(null);
    }
  }, [abhaInput, patientMethod]);

  // --- 1. Mobile OTP Handlers ---
  const handleMobileSendOtp = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!patientName.trim()) { setError(t.nameRequired); return; }
    const cleanMobile = patientMobile.replace(/\D/g, '');
    if (cleanMobile.length !== 10) { setError(t.mobileRequired); return; }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/patient/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: patientName.trim(), mobile: cleanMobile })
      });
      const data = await res.json();
      if (res.ok && data.status === 'otp_sent') {
        setOtpStep(true);
        setDemoOtp(data.demo_otp || '123456');
        setResendTimer(30);
        setSuccessMsg(data.message || t.otpSentMobile(cleanMobile));
      } else {
        setError(data.detail || 'Failed to send OTP.');
      }
    } catch {
      setOtpStep(true);
      setDemoOtp('123456');
      setResendTimer(30);
      setSuccessMsg(`Simulated OTP ready for +91 ${cleanMobile}`);
    } finally {
      setLoading(false);
    }
  };

  const handleMobileVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    const cleanOtp = otpCode.trim();
    if (!cleanOtp) { setError(t.otpRequired); return; }

    setLoading(true);
    resetState();
    const cleanMobile = patientMobile.replace(/\D/g, '');

    try {
      const res = await fetch(`${API_BASE}/api/auth/patient/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: patientName.trim(),
          mobile: cleanMobile,
          otp: cleanOtp,
          channel: isMobileQr ? 'mobile_qr' : 'kiosk'
        })
      });
      const data = await res.json();
      if (res.ok && data.status === 'authenticated') {
        const tokenNum = data.token_number || (isMobileQr ? 'M-01' : 'K-01');
        const channelUsed = data.channel || (isMobileQr ? 'mobile_qr' : 'kiosk');
        sessionStorage.setItem('session_id', data.session_id);
        sessionStorage.setItem('token_number', tokenNum);
        sessionStorage.setItem('intake_channel', channelUsed);
        updateState({
          role: 'patient',
          patientName: data.patient_name || patientName.trim(),
          session_id: data.session_id,
          abha_id: data.abha_id,
          mobile: cleanMobile,
          consent_granted: false,
          language: lang,
          token_number: tokenNum,
          intake_channel: channelUsed
        });
        navigate('/patient-home');
      } else {
        setError(data.detail || 'Invalid OTP code.');
      }
    } catch {
      if (cleanOtp === '123456' || cleanOtp === demoOtp) {
        const fallbackSid = `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const tokenNum = isMobileQr ? 'M-01' : 'K-01';
        const channelUsed = isMobileQr ? 'mobile_qr' : 'kiosk';
        sessionStorage.setItem('session_id', fallbackSid);
        sessionStorage.setItem('token_number', tokenNum);
        sessionStorage.setItem('intake_channel', channelUsed);
        updateState({
          role: 'patient',
          patientName: patientName.trim(),
          session_id: fallbackSid,
          abha_id: `ABHA-${Date.now()}`,
          mobile: cleanMobile,
          consent_granted: false,
          language: lang,
          token_number: tokenNum,
          intake_channel: channelUsed
        });
        navigate('/patient-home');
      } else {
        setError('Verification failed. Use demo code 123456.');
      }
    } finally {
      setLoading(false);
    }
  };

  // --- 2. Email OTP Handlers ---
  const handleEmailSendOtp = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!patientName.trim()) { setError(t.nameRequired); return; }
    const email = patientEmail.trim();
    if (!email || !email.includes('@')) { setError(t.emailRequired); return; }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/patient/send-email-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: patientName.trim(), email })
      });
      const data = await res.json();
      if (res.ok && data.status === 'otp_sent') {
        setOtpStep(true);
        setDemoOtp(data.demo_otp || '123456');
        setResendTimer(30);
        setSuccessMsg(data.message || t.otpSentEmail(email));
      } else {
        setError(data.detail || 'Failed to send email verification code.');
      }
    } catch {
      setOtpStep(true);
      setDemoOtp('123456');
      setResendTimer(30);
      setSuccessMsg(`Simulated OTP ready for ${email}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    const cleanOtp = otpCode.trim();
    if (!cleanOtp) { setError(t.otpRequired); return; }

    setLoading(true);
    resetState();
    const email = patientEmail.trim();

    try {
      const res = await fetch(`${API_BASE}/api/auth/patient/verify-email-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: patientName.trim(),
          email,
          otp: cleanOtp,
          channel: isMobileQr ? 'mobile_qr' : 'kiosk'
        })
      });
      const data = await res.json();
      if (res.ok && data.status === 'authenticated') {
        const tokenNum = data.token_number || (isMobileQr ? 'M-01' : 'K-01');
        const channelUsed = data.channel || (isMobileQr ? 'mobile_qr' : 'kiosk');
        sessionStorage.setItem('session_id', data.session_id);
        sessionStorage.setItem('token_number', tokenNum);
        sessionStorage.setItem('intake_channel', channelUsed);
        updateState({
          role: 'patient',
          patientName: data.patient_name || patientName.trim(),
          session_id: data.session_id,
          email,
          abha_id: data.abha_id,
          consent_granted: false,
          language: lang,
          token_number: tokenNum,
          intake_channel: channelUsed
        });
        navigate('/patient-home');
      } else {
        setError(data.detail || 'Invalid verification code.');
      }
    } catch {
      if (cleanOtp === '123456' || cleanOtp === demoOtp) {
        const fallbackSid = `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const tokenNum = isMobileQr ? 'M-01' : 'K-01';
        const channelUsed = isMobileQr ? 'mobile_qr' : 'kiosk';
        sessionStorage.setItem('session_id', fallbackSid);
        sessionStorage.setItem('token_number', tokenNum);
        sessionStorage.setItem('intake_channel', channelUsed);
        updateState({
          role: 'patient',
          patientName: patientName.trim(),
          session_id: fallbackSid,
          email,
          abha_id: `ABHA-${Date.now()}`,
          consent_granted: false,
          language: lang,
          token_number: tokenNum,
          intake_channel: channelUsed
        });
        navigate('/patient-home');
      } else {
        setError('Verification failed. Use demo code 123456.');
      }
    } finally {
      setLoading(false);
    }
  };

  // --- 3. ABHA ID Login Handler ---
  const handleAbhaLogin = async (e) => {
    if (e) e.preventDefault();
    setError('');
    const abha = abhaInput.trim();
    if (!abha) { setError(t.abhaRequired); return; }

    setLoading(true);
    resetState();

    try {
      const res = await fetch(`${API_BASE}/api/auth/patient/abha-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: patientName.trim() || undefined,
          abha_id: abha,
          channel: isMobileQr ? 'mobile_qr' : 'kiosk'
        })
      });
      const data = await res.json();
      if (res.ok && data.status === 'authenticated') {
        const prof = data.profile || fetchedProfile;
        const tokenNum = data.token_number || (isMobileQr ? 'M-01' : 'K-01');
        const channelUsed = data.channel || (isMobileQr ? 'mobile_qr' : 'kiosk');
        sessionStorage.setItem('session_id', data.session_id);
        sessionStorage.setItem('token_number', tokenNum);
        sessionStorage.setItem('intake_channel', channelUsed);
        updateState({
          role: 'patient',
          patientName: data.patient_name || prof?.name || patientName.trim(),
          session_id: data.session_id,
          abha_id: data.abha_id,
          abha_address: data.abha_address || prof?.abha_address,
          mobile: data.phone || prof?.mobile || patientMobile,
          email: data.email || prof?.email || patientEmail,
          gender: data.gender || prof?.gender,
          dob: data.dob || prof?.dob,
          age: data.age || prof?.year_of_birth,
          abha_profile: prof,
          patient_contact: {
            phone: data.phone || prof?.mobile || patientMobile || '',
            email: data.email || prof?.email || patientEmail || ''
          },
          consent_granted: false,
          language: lang,
          token_number: tokenNum,
          intake_channel: channelUsed
        });
        navigate('/patient-home');
      } else {
        setError(data.detail || 'Could not verify ABHA ID.');
      }
    } catch {
      const prof = fetchedProfile;
      const fallbackSid = `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      sessionStorage.setItem('session_id', fallbackSid);
      updateState({
        role: 'patient',
        patientName: patientName.trim() || prof?.name || 'Ayushman Patient',
        session_id: fallbackSid,
        abha_id: abha,
        abha_address: prof?.abha_address || (abha.includes('@') ? abha : `${abha}@abdm`),
        mobile: prof?.mobile || patientMobile || '',
        email: prof?.email || patientEmail || '',
        gender: prof?.gender || 'M',
        dob: prof?.dob || null,
        age: prof?.year_of_birth || null,
        abha_profile: prof,
        patient_contact: {
          phone: prof?.mobile || patientMobile || '',
          email: prof?.email || patientEmail || ''
        },
        consent_granted: false,
        language: lang,
      });
      navigate('/patient-home');
    } finally {
      setLoading(false);
    }
  };

  // --- 4. Physician Handlers ---
  const handleDoctorSendOtp = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (doctorPin.trim() !== PHYSICIAN_PIN) {
      setError(t.wrongPin);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/physician/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pin: doctorPin.trim(),
          mobile: doctorMobile.replace(/\D/g, '') || '9876543210'
        })
      });
      const data = await res.json();
      if (res.ok && data.status === 'otp_sent') {
        setDoctorOtpStep(true);
        setDoctorDemoOtp(data.demo_otp || '123456');
        setDoctorTimer(30);
        setSuccessMsg(data.message || '2FA code sent to registered mobile.');
      } else {
        setError(data.detail || 'Failed to send 2FA code.');
      }
    } catch {
      setDoctorOtpStep(true);
      setDoctorDemoOtp('123456');
      setDoctorTimer(30);
      setSuccessMsg('Simulated 2FA code generated for doctor login.');
    } finally {
      setLoading(false);
    }
  };

  const handleDoctorVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    const cleanOtp = doctorOtpCode.trim();
    if (!cleanOtp) { setError(t.otpRequired); return; }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/physician/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pin: doctorPin.trim(),
          otp: cleanOtp,
          physician_id: 'physician-1'
        })
      });
      const data = await res.json();
      if (res.ok && data.status === 'authenticated') {
        updateState({
          role: 'physician',
          physician_id: data.physician_id || 'physician-1',
          physician_name: data.name || 'Dr. Sharma',
          language: lang
        });
        navigate('/physician-dashboard');
      } else {
        setError(data.detail || 'Invalid verification code.');
      }
    } catch {
      if (cleanOtp === '123456' || cleanOtp === doctorDemoOtp) {
        updateState({ role: 'physician', language: lang });
        navigate('/physician-dashboard');
      } else {
        setError('Verification failed. Use demo code 123456.');
      }
    } finally {
      setLoading(false);
    }
  };

  // MSG91 SendOTP Widget Trigger
  const launchMsg91SendOtpWidget = () => {
    const cleanMob = patientMobile.replace(/\D/g, '') || '9876543210';
    const config = {
      widgetId: "366968757344313434393930",
      tokenAuth: "569169To8A9cUZNsI6aa07c06P1",
      identifier: `91${cleanMob}`,
      exposeMethods: true,
      success: async (data) => {
        setLoading(true);
        const token = typeof data === 'string' ? data : (data?.message || data?.token || data?.['access-token'] || 'verified');
        try {
          const res = await fetch(`${API_BASE}/api/auth/msg91/verify-widget-token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              access_token: token,
              name: patientName.trim() || 'Patient',
              mobile: cleanMob,
              role: 'patient'
            })
          });
          const result = await res.json();
          if (res.ok && result.status === 'authenticated') {
            sessionStorage.setItem('session_id', result.session_id);
            updateState({
              role: 'patient',
              patientName: result.patient_name,
              session_id: result.session_id,
              abha_id: result.abha_id,
              mobile: cleanMob,
              consent_granted: false,
              language: lang,
            });
            navigate('/patient-home');
          }
        } catch (_) {
          navigate('/patient-home');
        } finally {
          setLoading(false);
        }
      },
      failure: (err) => {
        console.warn('[MSG91 SendOTP Widget Error]', err);
      }
    };

    if (typeof window.initSendOTP === 'function') {
      window.initSendOTP(config);
    } else {
      handleMobileSendOtp();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-teal-50/15 to-slate-100 flex flex-col justify-between font-sans text-slate-800 relative overflow-hidden">
      {/* Background ambient accents */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[380px] bg-teal-200/20 blur-3xl rounded-full pointer-events-none -z-0" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-blue-100/30 blur-3xl rounded-full pointer-events-none -z-0" />

      {/* Top Navbar */}
      <header className="relative z-10 max-w-5xl mx-auto w-full px-4 sm:px-6 pt-5 flex items-center justify-between">
        <JeevanBrand size="md" subtitleText={t.subBrand} />
        <div className="flex items-center gap-2">
          {/* Scan & Sit QR Modal Trigger */}
          <button
            type="button"
            onClick={() => setShowKioskModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-sm transition hover:shadow-teal-200/50 cursor-pointer"
            title="Scan & Sit QR Mode / Kiosk Bypass"
          >
            <QrCode className="w-3.5 h-3.5 text-teal-200" />
            <span className="hidden sm:inline">Scan & Sit (QR Kiosk)</span>
            <span className="sm:hidden">QR Kiosk</span>
          </button>

          <div className="flex items-center bg-white/95 backdrop-blur px-3 py-1.5 rounded-xl shadow-xs border border-slate-200 hover:border-teal-300 transition">
            <Globe className="w-4 h-4 text-teal-600 mr-2 shrink-0" />
            <select
              value={lang}
              onChange={e => updateState({ language: e.target.value })}
              className="bg-transparent font-bold text-slate-700 outline-none text-xs sm:text-sm cursor-pointer"
            >
              {LANG_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <button
            type="button"
            onClick={() => setShowServerModal(true)}
            className="p-2 rounded-xl bg-white/95 backdrop-blur border border-slate-200 text-slate-600 hover:text-teal-700 hover:border-teal-300 transition shadow-xs cursor-pointer"
            title="Backend Server Configuration"
          >
            <Server className="w-4 h-4 text-teal-600" />
          </button>
        </div>
      </header>

      {/* Main Authentication Container */}
      <main className="relative z-10 max-w-xl mx-auto w-full px-4 sm:px-6 py-6 md:py-10 flex flex-col items-center text-center my-auto">
        {/* Master Login Card */}
        <div className="w-full max-w-md">

          {/* "Scan & Sit" Waiting Hall QR Banner */}
          <div className="w-full mb-3">
            <div className="bg-gradient-to-r from-teal-800 via-teal-700 to-slate-900 rounded-2xl p-3.5 text-white shadow-lg border border-teal-600/30 flex items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center shrink-0">
                  <QrCode className="w-5 h-5 text-teal-200 animate-pulse" />
                </div>
                <div className="min-w-0 text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-950 px-1.5 py-0.2 rounded font-mono">
                      Queue-Buster
                    </span>
                    <span className="text-xs font-bold text-white truncate">कतार में खड़े मत रहें!</span>
                  </div>
                  <p className="text-[11px] text-teal-100/90 truncate mt-0.5">
                    Scan QR & complete intake on your phone while seated.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowKioskModal(true)}
                className="px-3 py-1.5 bg-white hover:bg-teal-50 text-teal-900 font-extrabold text-xs rounded-xl shadow-xs shrink-0 transition active:scale-95 cursor-pointer flex items-center gap-1"
              >
                <span>View QR</span>
                <ArrowRight className="w-3 h-3 text-teal-700" />
              </button>
            </div>
          </div>

          {/* Mobile QR Mode Indicator */}
          {isMobileQr && (
            <div className="mb-3 px-3 py-2 bg-teal-50 border border-teal-300 text-teal-900 text-xs font-bold rounded-xl flex items-center justify-between animate-in fade-in">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-teal-600 shrink-0" />
                <span>Mobile Scan & Sit Mode Active (BYOD Intake)</span>
              </div>
              <span className="text-[10px] bg-teal-200 text-teal-950 px-2 py-0.5 rounded-full font-mono">OPD Queue</span>
            </div>
          )}

          {/* Main Role Switcher: Patient vs Doctor */}
          <div className="flex bg-slate-200/70 p-1 rounded-2xl mb-3 shadow-inner">
            <button
              onClick={() => handleTabSwitch('patient')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'patient'
                  ? 'bg-white text-teal-900 shadow-sm border border-slate-200'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <HeartPulse className="w-4 h-4 text-teal-600" />
              <span>{t.patientTab}</span>
            </button>
            <button
              onClick={() => handleTabSwitch('physician')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'physician'
                  ? 'bg-white text-indigo-900 shadow-sm border border-slate-200'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Stethoscope className="w-4 h-4 text-indigo-600" />
              <span>{t.physicianTab}</span>
            </button>
          </div>

          {/* Card Body */}
          <div className="bg-white/95 backdrop-blur-md border border-slate-200 rounded-3xl shadow-xl p-5 sm:p-6 text-left transition-all">
            
            {/* Notifications */}
            {successMsg && (
              <div className="mb-4 px-3.5 py-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}
            {error && (
              <div className="mb-4 px-3.5 py-2.5 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl flex items-center gap-2 animate-in fade-in">
                <Shield className="w-4 h-4 text-red-500 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* PATIENT PORTAL VIEW */}
            {activeTab === 'patient' ? (
              <div>
                {/* Method Switcher: Mobile | ABHA | Email */}
                {!otpStep && (
                  <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100/90 rounded-xl mb-5 border border-slate-200">
                    <button
                      type="button"
                      onClick={() => handleMethodSwitch('mobile')}
                      className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        patientMethod === 'mobile'
                          ? 'bg-white text-teal-800 shadow-xs border border-slate-200'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Smartphone className="w-4 h-4 mb-0.5 text-teal-600" />
                      <span>{t.methodMobile}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleMethodSwitch('abha')}
                      className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        patientMethod === 'abha'
                          ? 'bg-white text-teal-800 shadow-xs border border-slate-200'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <CreditCard className="w-4 h-4 mb-0.5 text-emerald-600" />
                      <span>{t.methodAbha}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleMethodSwitch('email')}
                      className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        patientMethod === 'email'
                          ? 'bg-white text-teal-800 shadow-xs border border-slate-200'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Mail className="w-4 h-4 mb-0.5 text-blue-600" />
                      <span>{t.methodEmail}</span>
                    </button>
                  </div>
                )}

                {/* --- METHOD 1: Mobile OTP --- */}
                {patientMethod === 'mobile' && (
                  !otpStep ? (
                    <form onSubmit={handleMobileSendOtp} className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                          {t.nameLabel} <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={patientName}
                          onChange={e => setPatientName(e.target.value)}
                          placeholder={t.namePlaceholder}
                          autoFocus
                          required
                          className="w-full border border-slate-200 bg-slate-50/50 text-slate-900 placeholder-slate-400 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                          {t.mobileLabel} <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <div className="absolute left-3.5 top-3.5 text-slate-400 text-xs font-bold pointer-events-none">
                            +91
                          </div>
                          <input
                            type="tel"
                            value={patientMobile}
                            onChange={e => setPatientMobile(e.target.value)}
                            placeholder={t.mobilePlaceholder}
                            maxLength={10}
                            required
                            className="w-full border border-slate-200 bg-slate-50/50 text-slate-900 placeholder-slate-400 rounded-xl pl-12 pr-4 py-3 text-sm font-bold tracking-wider outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition"
                          />
                        </div>
                      </div>

                      <div className="space-y-2 pt-1">
                        <button
                          type="submit"
                          disabled={loading}
                          className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-teal-200 hover:shadow-teal-300 active:scale-[0.98] transition-all disabled:opacity-60 cursor-pointer"
                        >
                          {loading ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Sending OTP…</span>
                            </>
                          ) : (
                            <>
                              <span>{t.sendOtpBtn}</span>
                              <ArrowRight className="w-4 h-4" />
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={launchMsg91SendOtpWidget}
                          className="w-full py-2.5 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                          <span>Verify with MSG91 SendOTP Widget (WhatsApp / SMS)</span>
                        </button>
                      </div>
                    </form>
                  ) : (
                    /* Mobile OTP Step 2 */
                    <form onSubmit={handleMobileVerifyOtp} className="space-y-4">
                      <div className="bg-teal-50/70 border border-teal-200/80 rounded-xl p-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-bold text-teal-900">
                          <Smartphone className="w-4 h-4 text-teal-600" />
                          <span>+91 {patientMobile}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => { setOtpStep(false); setError(''); setSuccessMsg(''); }}
                          className="text-xs font-bold text-teal-700 hover:text-teal-900 underline flex items-center gap-1 cursor-pointer"
                        >
                          <ArrowLeft className="w-3 h-3" />{t.changeNumber}
                        </button>
                      </div>

                      {/* Generated Code Display Card */}
                      <div className="bg-emerald-50/90 border border-emerald-200 rounded-xl p-3 text-emerald-900">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />Security Code:
                          </span>
                          <button
                            type="button"
                            onClick={() => setOtpCode(demoOtp || '123456')}
                            className="text-[11px] font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-0.5 rounded-lg shadow-2xs transition cursor-pointer"
                          >
                            Auto-Fill
                          </button>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-lg font-black tracking-widest text-emerald-950">
                            {demoOtp || '123456'}
                          </span>
                          <span className="text-[10px] text-emerald-700">
                            Demo fallback: <strong>123456</strong>
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                          {t.otpLabel}
                        </label>
                        <input
                          type="text"
                          value={otpCode}
                          onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          placeholder="• • • • • •"
                          maxLength={6}
                          autoFocus
                          className="w-full text-center tracking-[0.6em] text-2xl font-black font-mono border-2 border-teal-400 bg-teal-50/20 text-teal-950 rounded-xl px-4 py-3 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100 transition shadow-inner"
                        />
                      </div>

                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-slate-400">
                          {resendTimer > 0 ? t.resendIn(resendTimer) : 'Didn’t receive SMS?'}
                        </span>
                        <button
                          type="button"
                          disabled={resendTimer > 0 || loading}
                          onClick={() => handleMobileSendOtp()}
                          className="text-teal-600 hover:text-teal-800 disabled:text-slate-300 disabled:cursor-not-allowed font-bold transition cursor-pointer"
                        >
                          {t.resendOtp}
                        </button>
                      </div>

                      <button
                        type="submit"
                        disabled={loading || otpCode.length < 4}
                        className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-teal-200 hover:shadow-teal-300 active:scale-[0.98] transition-all disabled:opacity-60 cursor-pointer"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Verifying OTP…</span>
                          </>
                        ) : (
                          <>
                            <span>{t.verifyOtpBtn}</span>
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </form>
                  )
                )}

                {/* --- METHOD 2: ABHA ID / ABDM --- */}
                {patientMethod === 'abha' && (
                  <form onSubmit={handleAbhaLogin} className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                          {t.abhaLabel} <span className="text-red-500">*</span>
                        </label>
                        {isSearchingAbha && (
                          <span className="text-[11px] text-teal-600 font-semibold flex items-center gap-1 animate-pulse">
                            <Loader2 className="w-3 h-3 animate-spin" /> Fetching ABHA data…
                          </span>
                        )}
                      </div>
                      <div className="relative">
                        <input
                          type="text"
                          value={abhaInput}
                          onChange={e => setAbhaInput(e.target.value)}
                          placeholder={t.abhaPlaceholder}
                          autoFocus
                          required
                          className="w-full border border-slate-200 bg-slate-50/50 text-slate-900 placeholder-slate-400 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition pr-24"
                        />
                        <button
                          type="button"
                          onClick={() => fetchAbhaDetails(abhaInput)}
                          className="absolute right-2 top-2 px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 text-xs font-bold rounded-lg border border-teal-200 transition cursor-pointer"
                        >
                          Verify
                        </button>
                      </div>
                    </div>

                    {/* Live Fetched ABHA Profile Card */}
                    {fetchedProfile && (
                      <div className="bg-gradient-to-br from-teal-50/90 to-emerald-50/90 border border-teal-200 rounded-2xl p-4 shadow-sm animate-in fade-in zoom-in-95">
                        <div className="flex items-start justify-between gap-3 border-b border-teal-100 pb-2.5 mb-2.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center font-black text-sm shadow-sm shrink-0">
                              {fetchedProfile.name?.charAt(0) || 'P'}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h4 className="font-black text-slate-900 text-sm">{fetchedProfile.name}</h4>
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full border border-teal-300">
                                  <CheckCircle2 className="w-3 h-3 text-teal-600" /> ABDM Verified
                                </span>
                              </div>
                              <p className="text-xs text-teal-700 font-mono font-medium">{fetchedProfile.abha_address || fetchedProfile.abha_number}</p>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-1">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">Phone Number</span>
                            <span className="font-semibold text-slate-800">{fetchedProfile.mobile ? `+91 ${fetchedProfile.mobile}` : 'Not provided'}</span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">Email Address</span>
                            <span className="font-semibold text-slate-800 truncate block" title={fetchedProfile.email}>{fetchedProfile.email || 'Not provided'}</span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">Gender & DOB</span>
                            <span className="font-semibold text-slate-800">
                              {fetchedProfile.gender === 'M' ? 'Male' : fetchedProfile.gender === 'F' ? 'Female' : (fetchedProfile.gender || 'N/A')}
                              {fetchedProfile.dob ? ` • ${fetchedProfile.dob}` : ''}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">Location</span>
                            <span className="font-semibold text-slate-800 truncate block">{fetchedProfile.district || fetchedProfile.state || 'India'}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Quick Sample Demo ABHA Profiles */}
                    <div>
                      <span className="text-[11px] font-bold text-slate-400 block mb-1.5">Quick Demo ABHA IDs:</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {SAMPLE_DEMO_ABHAS.map(p => (
                          <button
                            key={p.abha}
                            type="button"
                            onClick={() => {
                              setAbhaInput(p.abha);
                              fetchAbhaDetails(p.abha);
                            }}
                            className="p-2 text-left bg-slate-50 hover:bg-teal-50 border border-slate-200 hover:border-teal-300 rounded-xl transition text-slate-700 text-xs cursor-pointer group"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-800 group-hover:text-teal-700 truncate">{p.name}</span>
                              <span className="text-[10px] font-mono text-teal-600 shrink-0 font-semibold">{p.abha.slice(0, 7)}…</span>
                            </div>
                            <span className="text-[10px] text-slate-400 block truncate mt-0.5">{p.address}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading || !abhaInput.trim()}
                      className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-200 hover:shadow-emerald-300 active:scale-[0.98] transition-all disabled:opacity-60 cursor-pointer"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Connecting ABDM…</span>
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-4 h-4" />
                          <span>{fetchedProfile ? `Continue as ${fetchedProfile.name}` : t.loginWithAbhaBtn}</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>
                )}

                {/* --- METHOD 3: Email OTP --- */}
                {patientMethod === 'email' && (
                  !otpStep ? (
                    <form onSubmit={handleEmailSendOtp} className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                          {t.nameLabel} <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={patientName}
                          onChange={e => setPatientName(e.target.value)}
                          placeholder={t.namePlaceholder}
                          autoFocus
                          required
                          className="w-full border border-slate-200 bg-slate-50/50 text-slate-900 placeholder-slate-400 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                          {t.emailLabel} <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type="email"
                            value={patientEmail}
                            onChange={e => setPatientEmail(e.target.value)}
                            placeholder={t.emailPlaceholder}
                            required
                            className="w-full border border-slate-200 bg-slate-50/50 text-slate-900 placeholder-slate-400 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-200 hover:shadow-blue-300 active:scale-[0.98] transition-all disabled:opacity-60 cursor-pointer"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Sending Code…</span>
                          </>
                        ) : (
                          <>
                            <Mail className="w-4 h-4" />
                            <span>{t.sendEmailOtpBtn}</span>
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </form>
                  ) : (
                    /* Email OTP Step 2 */
                    <form onSubmit={handleEmailVerifyOtp} className="space-y-4">
                      <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-bold text-blue-900 truncate">
                          <Mail className="w-4 h-4 text-blue-600 shrink-0" />
                          <span className="truncate">{patientEmail}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => { setOtpStep(false); setError(''); setSuccessMsg(''); }}
                          className="text-xs font-bold text-blue-700 hover:text-blue-900 underline flex items-center gap-1 shrink-0 cursor-pointer"
                        >
                          <ArrowLeft className="w-3 h-3" />{t.changeNumber}
                        </button>
                      </div>

                      {/* Generated Code Display Card */}
                      <div className="bg-emerald-50/90 border border-emerald-200 rounded-xl p-3 text-emerald-900">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />Email Security Code:
                          </span>
                          <button
                            type="button"
                            onClick={() => setOtpCode(demoOtp || '123456')}
                            className="text-[11px] font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-0.5 rounded-lg shadow-2xs transition cursor-pointer"
                          >
                            Auto-Fill
                          </button>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-lg font-black tracking-widest text-emerald-950">
                            {demoOtp || '123456'}
                          </span>
                          <span className="text-[10px] text-emerald-700">
                            Demo code: <strong>123456</strong>
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                          {t.otpLabel}
                        </label>
                        <input
                          type="text"
                          value={otpCode}
                          onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          placeholder="• • • • • •"
                          maxLength={6}
                          autoFocus
                          className="w-full text-center tracking-[0.6em] text-2xl font-black font-mono border-2 border-blue-400 bg-blue-50/20 text-blue-950 rounded-xl px-4 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition shadow-inner"
                        />
                      </div>

                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-slate-400">
                          {resendTimer > 0 ? t.resendIn(resendTimer) : 'Didn’t get email?'}
                        </span>
                        <button
                          type="button"
                          disabled={resendTimer > 0 || loading}
                          onClick={() => handleEmailSendOtp()}
                          className="text-blue-600 hover:text-blue-800 disabled:text-slate-300 disabled:cursor-not-allowed font-bold transition cursor-pointer"
                        >
                          {t.resendOtp}
                        </button>
                      </div>

                      <button
                        type="submit"
                        disabled={loading || otpCode.length < 4}
                        className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-200 hover:shadow-blue-300 active:scale-[0.98] transition-all disabled:opacity-60 cursor-pointer"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Verifying Code…</span>
                          </>
                        ) : (
                          <>
                            <span>{t.verifyOtpBtn}</span>
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </form>
                  )
                )}
              </div>
            ) : (
              /* DOCTOR PORTAL VIEW */
              !doctorOtpStep ? (
                /* Doctor Step 1: PIN */
                <form onSubmit={handleDoctorSendOtp} className="space-y-4">
                  <div className="flex items-center gap-3 bg-indigo-50/80 border border-indigo-200/80 rounded-2xl px-4 py-3">
                    <Stethoscope className="w-5 h-5 text-indigo-600 shrink-0" />
                    <div className="text-left">
                      <p className="text-indigo-900 text-sm font-bold">Physician Access</p>
                      <p className="text-indigo-600 text-xs">Enter your secure 4-digit PIN for 2FA validation</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                      {t.pinLabel} <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showDoctorPin ? 'text' : 'password'}
                        value={doctorPin}
                        onChange={e => setDoctorPin(e.target.value)}
                        placeholder={t.pinPlaceholder}
                        maxLength={8}
                        autoFocus
                        required
                        className="w-full border border-slate-200 bg-slate-50/50 text-slate-900 placeholder-slate-400 rounded-xl px-4 py-3 pr-11 text-sm font-medium outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition tracking-widest"
                      />
                      <button
                        type="button"
                        onClick={() => setShowDoctorPin(v => !v)}
                        className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showDoctorPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-slate-400 text-xs mt-1 text-right">
                      Demo PIN: <span className="font-bold text-indigo-600">1234</span>
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                      {t.doctorMobileLabel}
                    </label>
                    <div className="relative">
                      <div className="absolute left-3.5 top-3.5 text-slate-400 text-xs font-bold pointer-events-none">
                        +91
                      </div>
                      <input
                        type="tel"
                        value={doctorMobile}
                        onChange={e => setDoctorMobile(e.target.value)}
                        placeholder="9876543210"
                        maxLength={10}
                        required
                        className="w-full border border-slate-200 bg-slate-50/50 text-slate-900 placeholder-slate-400 rounded-xl pl-12 pr-4 py-3 text-sm font-bold tracking-wider outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-200 hover:shadow-indigo-300 active:scale-[0.98] transition-all disabled:opacity-60 cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Verifying PIN…</span>
                      </>
                    ) : (
                      <>
                        <span>{t.sendDoctorOtpBtn}</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              ) : (
                /* Doctor Step 2: 2FA Verification */
                <form onSubmit={handleDoctorVerifyOtp} className="space-y-4">
                  <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-indigo-900">
                      <Stethoscope className="w-4 h-4 text-indigo-600" />
                      <span>Doctor 2FA: +91 {doctorMobile}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setDoctorOtpStep(false); setError(''); setSuccessMsg(''); }}
                      className="text-xs font-bold text-indigo-700 hover:text-indigo-900 flex items-center gap-1 cursor-pointer"
                    >
                      <ArrowLeft className="w-3 h-3" />Back
                    </button>
                  </div>

                  {/* Doctor Code Display Box */}
                  <div className="bg-teal-50/90 border border-teal-200 rounded-xl p-3 text-teal-900">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-teal-800 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-teal-600" />Doctor 2FA Code:
                      </span>
                      <button
                        type="button"
                        onClick={() => setDoctorOtpCode(doctorDemoOtp || '123456')}
                        className="text-[11px] font-extrabold bg-teal-600 hover:bg-teal-700 text-white px-2.5 py-0.5 rounded-lg shadow-2xs transition cursor-pointer"
                      >
                        Auto-Fill
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-lg font-black tracking-widest text-teal-950">
                        {doctorDemoOtp || '123456'}
                      </span>
                      <span className="text-[10px] text-teal-700">
                        Master code: <strong>123456</strong>
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                      Doctor 2FA Security Code
                    </label>
                    <input
                      type="text"
                      value={doctorOtpCode}
                      onChange={e => setDoctorOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="• • • • • •"
                      maxLength={6}
                      autoFocus
                      className="w-full text-center tracking-[0.6em] text-2xl font-black font-mono border-2 border-indigo-400 bg-indigo-50/20 text-indigo-950 rounded-xl px-4 py-3 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition shadow-inner"
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-400">
                      {doctorTimer > 0 ? t.resendIn(doctorTimer) : 'Code not received?'}
                    </span>
                    <button
                      type="button"
                      disabled={doctorTimer > 0 || loading}
                      onClick={() => handleDoctorSendOtp()}
                      className="text-indigo-600 hover:text-indigo-800 disabled:text-slate-300 disabled:cursor-not-allowed font-bold transition cursor-pointer"
                    >
                      Resend 2FA Code
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || doctorOtpCode.length < 4}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-200 hover:shadow-indigo-300 active:scale-[0.98] transition-all disabled:opacity-60 cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Verifying 2FA…</span>
                      </>
                    ) : (
                      <>
                        <span>{t.verifyDoctorOtpBtn}</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              )
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full border-t border-slate-200/80 bg-white/70 backdrop-blur-xs py-3.5 px-4 text-center">
        <div className="max-w-4xl mx-auto flex items-center justify-center gap-1.5 text-[11px] text-slate-500 font-medium">
          <Lock className="w-3.5 h-3.5 text-teal-600 shrink-0" />
          <span>{t.footerNote}</span>
        </div>
      </footer>

      {/* Backend API Configuration Modal */}
      <ServerConfigModal
        isOpen={showServerModal}
        onClose={() => setShowServerModal(false)}
      />

      {/* Kiosk Scan & Sit QR Modal */}
      <KioskScanAndSitModal
        isOpen={showKioskModal}
        onClose={() => setShowKioskModal(false)}
      />
    </div>
  );
};

export default Landing;
