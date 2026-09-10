import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useGlobalState } from '../context/GlobalStateContext';
import {
  Mic, ArrowRight, Globe, Shield, Stethoscope, Activity, FileText,
  CheckCircle2, Lock, ShieldCheck, Sparkles, User, ChevronRight, Upload, Server,
  Smartphone, QrCode
} from 'lucide-react';
import { JeevanBrand } from '../components/JeevanLogo';
import ClinicalConsentModal from '../components/ClinicalConsentModal';
import ServerConfigModal from '../components/ServerConfigModal';

const T = {
  en: {
    greeting: (name) => `Hello, ${name}!`,
    sub: 'Your AI-powered clinical intake is ready. Click below to begin.',
    btnLabel: 'Begin Voice Consultation',
    btnConsentReq: 'Grant Consent to Begin Intake',
    btnSub: 'Speak naturally in Hindi, English, or Marathi',
    step1: 'Listens to your symptoms',
    step2: 'Asks clarifying questions',
    step3: 'Generates clinical report',
    step4: 'Transmits note to doctor',
    note: 'Your conversation is private & reviewed by your doctor.',
    langLabel: 'Choose consultation language:',
    consentRequired: 'Clinical Consent Required',
    consentRequiredSub: 'Review & approve 5 intake permissions before consultation.',
    grantConsentBtn: 'Review & Grant Consent',
    consentGranted: 'Clinical Consent Active',
    consentGrantedSub: 'All 5 clinical permissions approved. Intake is ready.',
    editConsentBtn: 'Edit',
    uploadTitle: 'Have Past Reports or Prescriptions?',
    uploadSub: 'Auto-extract medicines & prior diagnoses into your note.',
    uploadBtn: 'Upload',
  },
  hi: {
    greeting: (name) => `नमस्ते, ${name}!`,
    sub: 'आपका एआई-संचालित क्लिनिकल इनटेक तैयार है। शुरू करने के लिए नीचे क्लिक करें।',
    btnLabel: 'आवाज परामर्श शुरू करें',
    btnConsentReq: 'इनटेक शुरू करने के लिए सहमति दें',
    btnSub: 'हिन्दी, अंग्रेजी या मराठी में सरलता से बोलें',
    step1: 'लक्षणों को ध्यान से सुनेगा',
    step2: 'आवश्यक प्रश्न पूछेगा',
    step3: 'क्लिनिकल रिपोर्ट तैयार करेगा',
    step4: 'डॉक्टर को रिपोर्ट भेजेगा',
    note: 'आपकी बातचीत निजी है और डॉक्टर द्वारा जाँची जाएगी।',
    langLabel: 'परामर्श की भाषा चुनें:',
    consentRequired: 'क्लिनिकल सहमति आवश्यक',
    consentRequiredSub: 'परामर्श शुरू करने से पहले 5 अनुमतियों की समीक्षा करें।',
    grantConsentBtn: 'सहमति की समीक्षा करें व दें',
    consentGranted: 'क्लिनिकल सहमति सक्रिय',
    consentGrantedSub: 'सभी 5 अनुमतियाँ स्वीकृत। सत्र शुरू करने हेतु तैयार।',
    editConsentBtn: 'बदलें',
    uploadTitle: 'पिछली पर्ची या टेस्ट रिपोर्ट है?',
    uploadSub: 'दवाइयां और पिछली बीमारी रिपोर्ट में शामिल करने के लिए अपलोड करें।',
    uploadBtn: 'अपलोड करें',
  },
  mr: {
    greeting: (name) => `नमस्कार, ${name}!`,
    sub: 'तुमचे एआय-सक्षम क्लिनिकल इनटेक तयार आहे. सुरू करण्यासाठी खाली क्लिक करा.',
    btnLabel: 'व्हॉइस सल्ला सुरू करा',
    btnConsentReq: 'इनटेक सुरू करण्यासाठी संमती द्या',
    btnSub: 'हिंदी, इंग्रजी किंवा मराठीत सहजपणे बोला',
    step1: 'लक्षणे लक्षपूर्वक ऐकेल',
    step2: 'आवश्यक प्रश्न विचारेल',
    step3: 'क्लिनिकल अहवाल तयार करेल',
    step4: 'डॉक्टरांना अहवाल पाठवेल',
    note: 'तुमचे संभाषण खाजगी आहे आणि डॉक्टरांकडून तपासले जाईल.',
    langLabel: 'सल्ल्याची भाषा निवडा:',
    consentRequired: 'क्लिनिकल संमती आवश्यक',
    consentRequiredSub: 'सल्ला सुरू करण्यापूर्वी 5 परवानग्या तपासा.',
    grantConsentBtn: 'संमती तपासा आणि द्या',
    consentGranted: 'क्लिनिकल संमती सक्रिय',
    consentGrantedSub: 'सर्व 5 परवानग्या मंजूर. तुमचे सत्र तयार आहे.',
    editConsentBtn: 'बदला',
    uploadTitle: 'मागील प्रिस्क्रिप्शन किंवा अहवाल आहे?',
    uploadSub: 'औषधे आणि पूर्व आजार अहवालात जोडण्यासाठी अपलोड करा.',
    uploadBtn: 'अपलोड करा',
  },
};

const LANG_OPTIONS = [
  { value: 'en', label: 'English', short: 'EN' },
  { value: 'hi', label: 'हिन्दी', short: 'HI' },
  { value: 'mr', label: 'मराठी', short: 'MR' },
];

const STEPS = [
  { key: 'step1', num: '1', Icon: Mic, color: 'bg-indigo-50 border-indigo-200 text-indigo-600' },
  { key: 'step2', num: '2', Icon: Stethoscope, color: 'bg-emerald-50 border-emerald-200 text-emerald-600' },
  { key: 'step3', num: '3', Icon: FileText, color: 'bg-blue-50 border-blue-200 text-blue-600' },
  { key: 'step4', num: '4', Icon: Activity, color: 'bg-amber-50 border-amber-200 text-amber-600' },
];

const PatientHome = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlChannel = searchParams.get('channel');
  const { globalState, updateState } = useGlobalState();
  const lang = globalState?.language || 'en';
  const t = T[lang] || T.en;
  const defaultName = globalState?.patientName || sessionStorage.getItem('patient_name') || 'Rahul Dev Sharma';
  const name = defaultName;

  const tokenNumber = globalState?.token_number || sessionStorage.getItem('token_number') || 'M-08';
  const intakeChannel = globalState?.intake_channel || urlChannel || sessionStorage.getItem('intake_channel') || 'mobile_qr';

  const consentGranted = Boolean(globalState?.consent_granted);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [showServerModal, setShowServerModal] = useState(false);

  useEffect(() => {
    if (!globalState?.role) {
      updateState({
        role: 'patient',
        patientName: defaultName,
        session_id: sessionStorage.getItem('session_id') || `session-${Date.now()}`,
        token_number: tokenNumber,
        intake_channel: intakeChannel,
      });
    } else if (globalState.role !== 'patient') {
      navigate('/');
    }
  }, [globalState?.role, defaultName, navigate, updateState, tokenNumber, intakeChannel]);

  const handleStartIntake = () => {
    if (!consentGranted) {
      setShowConsentModal(true);
      return;
    }
    navigate('/voice-intake');
  };

  // Get user initials for mobile avatar
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('') || 'PT';

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-teal-50/20 to-slate-100 flex flex-col justify-between font-sans text-slate-800 relative overflow-x-hidden">
      {/* Background ambient accents - constrained to prevent mobile overflow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] sm:w-[800px] h-[350px] bg-teal-200/25 blur-3xl rounded-full pointer-events-none -z-0" />
      <div className="absolute bottom-0 right-0 w-[280px] sm:w-[400px] h-[300px] bg-indigo-100/35 blur-3xl rounded-full pointer-events-none -z-0" />

      {/* Mobile-First App Header Bar */}
      <header className="sticky top-0 z-30 w-full bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-2xs">
        <div className="max-w-md sm:max-w-xl mx-auto px-4 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <JeevanBrand size="sm" showSubtitle={false} className="sm:hidden" />
            <JeevanBrand size="sm" showSubtitle={true} subtitleText="Digital Care" className="hidden sm:flex" />
          </div>

          <div className="flex items-center gap-2">
            {/* Active OPD status chip */}
            <span className="hidden xs:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-teal-50 text-teal-800 border border-teal-200/80 shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
              <span>OPD Active</span>
            </span>

            {/* Compact Language Selector Pill */}
            <div className="flex items-center bg-white border border-slate-200 rounded-xl px-2 py-1 shadow-2xs">
              <Globe className="w-3.5 h-3.5 text-teal-600 mr-1.5 shrink-0" />
              <select
                value={lang}
                onChange={e => updateState({ language: e.target.value })}
                className="bg-transparent font-bold text-slate-700 outline-none text-xs cursor-pointer pr-1"
                aria-label="Select Language"
              >
                {LANG_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Server Settings Button */}
            <button
              type="button"
              onClick={() => setShowServerModal(true)}
              className="p-1.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-teal-700 hover:border-teal-300 transition shadow-2xs cursor-pointer"
              title="Backend Server Configuration"
            >
              <Server className="w-3.5 h-3.5 text-teal-600" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area - Native App Viewport */}
      <main className="relative z-10 max-w-md sm:max-w-xl mx-auto w-full px-4 py-4 sm:py-6 flex-1 flex flex-col items-center justify-start space-y-3.5">
        
        {/* Patient Greeting & Status Header Card */}
        <div className="w-full bg-white/95 backdrop-blur-sm border border-slate-200/90 rounded-2xl p-4 shadow-xs text-left">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white flex items-center justify-center font-black text-sm shadow-xs shrink-0">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
                {t.greeting(name)}
              </h1>
              <p className="text-xs text-slate-500 font-medium leading-tight mt-0.5">
                {t.sub}
              </p>
            </div>
          </div>

          {/* 1-Tap Language Switcher Segmented Bar */}
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-slate-500 shrink-0">
              {t.langLabel}
            </span>
            <div className="flex items-center gap-1 bg-slate-100/90 p-0.5 rounded-xl border border-slate-200/70">
              {LANG_OPTIONS.map(o => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => updateState({ language: o.value })}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    lang === o.value
                      ? 'bg-white text-teal-800 shadow-xs border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Live OPD Queue Token Card */}
        <div className="w-full bg-gradient-to-br from-teal-900 via-teal-800 to-slate-900 text-white rounded-2xl p-4 shadow-md border border-teal-700/50 text-left relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-28 h-28 bg-teal-400/10 rounded-full blur-xl pointer-events-none" />
          
          <div className="flex items-start justify-between gap-2 relative z-10">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-widest bg-teal-400/20 text-teal-200 px-2 py-0.5 rounded-full border border-teal-300/30">
                  Live OPD Queue Token
                </span>
                <span className="text-[10px] font-bold bg-emerald-500 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" /> Active
                </span>
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white">
                  Token #{tokenNumber}
                </span>
                <span className="text-xs text-teal-200 font-medium">
                  {intakeChannel === 'mobile_qr' ? '📱 Mobile (Scan & Sit)' : '🖥️ Physical Kiosk'}
                </span>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="text-[10px] uppercase font-bold text-teal-300 block">Assigned Chamber</span>
              <span className="text-xs font-extrabold text-white bg-white/15 px-2.5 py-1 rounded-lg border border-white/20 inline-block mt-0.5">
                Room 104
              </span>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-teal-700/60 grid grid-cols-2 gap-2 text-xs relative z-10">
            <div className="bg-white/10 p-2 rounded-xl">
              <span className="text-[10px] text-teal-200 block font-medium">Doctor Currently Seeing:</span>
              <strong className="text-white font-mono text-sm">#M-05</strong>
            </div>
            <div className="bg-white/10 p-2 rounded-xl">
              <span className="text-[10px] text-teal-200 block font-medium">Estimated Wait Time:</span>
              <strong className="text-amber-300 font-semibold text-sm">~6-8 mins</strong>
            </div>
          </div>

          <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-teal-100/80">
            <Sparkles className="w-3.5 h-3.5 text-teal-300 shrink-0" />
            <span>Complete your voice intake below so the doctor has your report ready when called.</span>
          </div>
        </div>

        {/* 4 Steps - Pixel-Perfect 2x2 Grid with Equal Heights */}
        <div className="w-full">
          <div className="grid grid-cols-2 gap-2.5 w-full">
            {STEPS.map(({ key, num, Icon, color }) => (
              <div
                key={key}
                className="bg-white/95 backdrop-blur-sm border border-slate-200/90 rounded-2xl p-3 shadow-2xs hover:shadow-xs transition-all text-left flex items-center gap-2.5 h-full min-h-[64px]"
              >
                <div className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 ${color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                    Step {num}
                  </span>
                  <p className="text-slate-700 text-xs font-bold leading-snug line-clamp-2">
                    {t[key]}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Clinical Consent Status Card - Mobile-First Stacked Design */}
        <div className="w-full">
          {!consentGranted ? (
            <div className="p-3.5 bg-amber-50/95 border border-amber-200/90 rounded-2xl shadow-2xs text-left animate-in fade-in space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center text-amber-800 font-bold shrink-0">
                    <Lock className="w-4 h-4 text-amber-700" />
                  </div>
                  <h3 className="text-xs font-black text-amber-950 truncate">
                    {t.consentRequired}
                  </h3>
                </div>
                <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-md bg-amber-200/80 text-amber-900 border border-amber-300 shrink-0">
                  Required
                </span>
              </div>

              <p className="text-[11px] text-amber-800 font-medium leading-relaxed">
                {t.consentRequiredSub}
              </p>

              <button
                type="button"
                onClick={() => setShowConsentModal(true)}
                className="w-full py-2.5 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98]"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{t.grantConsentBtn}</span>
                <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
              </button>
            </div>
          ) : (
            <div className="p-3 bg-emerald-50/90 border border-emerald-200 rounded-2xl shadow-2xs text-left flex items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-800 font-bold shrink-0">
                  <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-emerald-950 truncate">
                    {t.consentGranted}
                  </p>
                  <p className="text-[11px] text-emerald-700 font-medium truncate">
                    {t.consentGrantedSub}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowConsentModal(true)}
                className="px-3 py-1.5 bg-white hover:bg-emerald-100 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer shadow-2xs"
              >
                {t.editConsentBtn}
              </button>
            </div>
          )}
        </div>

        {/* Primary Action Button (Begin Your Intake) - Mobile Thumb Touch Target */}
        <div className="w-full space-y-1.5">
          {consentGranted ? (
            <button
              type="button"
              onClick={handleStartIntake}
              className="w-full h-13 sm:h-14 inline-flex items-center justify-center gap-2.5 px-5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-extrabold text-base rounded-2xl shadow-lg shadow-teal-700/25 active:scale-[0.98] transition-all duration-200 cursor-pointer group"
            >
              <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                <Mic className="w-4 h-4 text-white group-hover:scale-110 transition-transform" />
              </div>
              <span>{t.btnLabel}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform ml-1" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowConsentModal(true)}
              className="w-full h-13 sm:h-14 inline-flex items-center justify-center gap-2.5 px-5 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-sm sm:text-base rounded-2xl shadow-md shadow-amber-500/20 active:scale-[0.98] transition-all cursor-pointer group"
              title="Grant consent to begin consultation"
            >
              <Lock className="w-4 h-4 group-hover:rotate-12 transition-transform" />
              <span>{t.btnConsentReq}</span>
              <ChevronRight className="w-4 h-4 ml-1" />
            </button>
          )}
          <p className="text-slate-500 text-[11px] text-center font-medium">
            {t.btnSub}
          </p>
        </div>

        {/* Upload Past Records / Prescriptions Banner */}
        <div className="w-full bg-white/95 backdrop-blur border border-teal-200/90 rounded-2xl p-3 shadow-2xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0 text-left">
              <h4 className="text-xs font-bold text-slate-900 leading-tight">
                {t.uploadTitle}
              </h4>
              <p className="text-[11px] text-slate-500 leading-tight mt-0.5">
                {t.uploadSub}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              if (!globalState?.session_id) {
                const sid = `session-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
                updateState({ session_id: sid });
                sessionStorage.setItem('session_id', sid);
              }
              navigate('/documents');
            }}
            className="px-2.5 py-1.5 bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-800 text-xs font-bold rounded-xl transition shrink-0 cursor-pointer shadow-2xs flex items-center gap-1"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{t.uploadBtn}</span>
          </button>
        </div>
      </main>

      {/* Clinical Consent Modal */}
      <ClinicalConsentModal
        isOpen={showConsentModal}
        onClose={() => setShowConsentModal(false)}
        onConsentGranted={() => setShowConsentModal(false)}
      />

      {/* Server Config Modal */}
      <ServerConfigModal
        isOpen={showServerModal}
        onClose={() => setShowServerModal(false)}
      />

      {/* App Footer Bar */}
      <footer className="relative z-10 w-full border-t border-slate-200/70 bg-white/80 py-2.5 px-4 text-center">
        <div className="max-w-md sm:max-w-xl mx-auto flex items-center justify-center gap-1.5 text-[11px] text-slate-500 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-teal-600 shrink-0" />
          <span>ABDM & NDHM Compliant • Private & Doctor-Reviewed</span>
        </div>
      </footer>
    </div>
  );
};
export default PatientHome;
