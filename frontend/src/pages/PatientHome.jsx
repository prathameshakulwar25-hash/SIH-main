import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGlobalState } from '../context/GlobalStateContext';
import { Mic, ArrowRight, Globe, Shield, Stethoscope, Activity, FileText, CheckCircle2, Lock, ShieldCheck, AlertCircle } from 'lucide-react';
import { JeevanBrand } from '../components/JeevanLogo';
import ClinicalConsentModal from '../components/ClinicalConsentModal';

const T = {
  en: {
    greeting: (name) => `Hello, ${name}!`,
    sub: 'Your AI-powered clinical intake is ready. Click below to begin.',
    btnLabel: 'Begin Your Intake',
    btnSub: 'Speak in Hindi, English, or Marathi',
    step1: 'AI listens to your symptoms',
    step2: 'Asks follow-up questions',
    step3: 'Generates your clinical report',
    step4: 'Sends it to your physician',
    note: 'Your conversation is private and will be reviewed by your doctor.',
    langLabel: 'Choose your preferred language before starting',
    consentRequired: 'Clinical Consent Required',
    consentRequiredSub: 'You must grant clinical intake consent before starting your AI consultation.',
    grantConsentBtn: 'Review & Grant Consent',
    consentGranted: 'Clinical Consent Active',
    consentGrantedSub: 'All 5 clinical permissions granted. Your intake session is ready.',
    editConsentBtn: 'Edit Consents',
  },
  hi: {
    greeting: (name) => `नमस्ते, ${name}!`,
    sub: 'आपका एआई-संचालित क्लिनिकल इनटेक तैयार है। शुरू करने के लिए नीचे क्लिक करें।',
    btnLabel: 'इनटेक शुरू करें',
    btnSub: 'हिन्दी, अंग्रेजी या मराठी में बोलें',
    step1: 'AI आपके लक्षण सुनेगा',
    step2: 'ज़रूरी सवाल पूछेगा',
    step3: 'आपकी क्लिनिकल रिपोर्ट बनाएगा',
    step4: 'आपके डॉक्टर को भेजेगा',
    note: 'आपकी बातचीत निजी है और डॉक्टर द्वारा जाँची जाएगी।',
    langLabel: 'शुरू करने से पहले अपनी भाषा चुनें',
    consentRequired: 'क्लिनिकल सहमति आवश्यक है',
    consentRequiredSub: 'एआई परामर्श शुरू करने से पहले आपको क्लिनिकल इनटेक सहमति देनी होगी।',
    grantConsentBtn: 'सहमति की समीक्षा करें और दें',
    consentGranted: 'क्लिनिकल सहमति सक्रिय है',
    consentGrantedSub: 'सभी 5 अनुमतियाँ सक्रिय हैं। आपका इनटेक सत्र तैयार है।',
    editConsentBtn: 'सहमति बदलें',
  },
  mr: {
    greeting: (name) => `नमस्कार, ${name}!`,
    sub: 'तुमचे एआय-सक्षम क्लिनिकल इनटेक तयार आहे. सुरू करण्यासाठी खाली क्लिक करा.',
    btnLabel: 'इनटेक सुरू करा',
    btnSub: 'हिंदी, इंग्रजी किंवा मराठीत बोला',
    step1: 'AI तुमची लक्षणे ऐकेल',
    step2: 'आवश्यक प्रश्न विचारेल',
    step3: 'क्लिनिकल अहवाल तयार करेल',
    step4: 'डॉक्टरांना पाठवेल',
    note: 'तुमचे संभाषण खाजगी आहे आणि डॉक्टरांकडून तपासले जाईल.',
    langLabel: 'सुरू करण्यापूर्वी तुमची भाषा निवडा',
    consentRequired: 'क्लिनिकल संमती आवश्यक आहे',
    consentRequiredSub: 'एआय सल्ला सुरू करण्यापूर्वी क्लिनिकल संमती देणे आवश्यक आहे.',
    grantConsentBtn: 'संमती तपासा आणि द्या',
    consentGranted: 'क्लिनिकल संमती सक्रिय आहे',
    consentGrantedSub: 'सर्व 5 परवानग्या मंजूर. तुमचे सत्र तयार आहे.',
    editConsentBtn: 'संमती बदला',
  },
};

const LANG_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'हिन्दी (Hindi)' },
  { value: 'mr', label: 'मराठी (Marathi)' },
];

const STEPS = [
  { key: 'step1', Icon: Mic, color: 'bg-indigo-50 border-indigo-100 text-indigo-600' },
  { key: 'step2', Icon: Stethoscope, color: 'bg-emerald-50 border-emerald-100 text-emerald-600' },
  { key: 'step3', Icon: FileText, color: 'bg-blue-50 border-blue-100 text-blue-600' },
  { key: 'step4', Icon: Activity, color: 'bg-amber-50 border-amber-100 text-amber-600' },
];

const PatientHome = () => {
  const navigate = useNavigate();
  const { globalState, updateState } = useGlobalState();
  const lang = globalState?.language || 'en';
  const t = T[lang] || T.en;
  const name = globalState?.patientName || 'Patient';

  const consentGranted = Boolean(globalState?.consent_granted);
  const [showConsentModal, setShowConsentModal] = useState(false);

  useEffect(() => {
    if (!globalState?.role || globalState.role !== 'patient') navigate('/');
  }, [globalState?.role, navigate]);

  const handleStartIntake = () => {
    if (!consentGranted) {
      setShowConsentModal(true);
      return;
    }
    navigate('/voice-intake');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-indigo-50/20 to-slate-100 flex flex-col justify-between font-sans text-slate-800 relative overflow-hidden">
      {/* Decorative */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[450px] bg-indigo-200/25 blur-3xl rounded-full pointer-events-none -z-0" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-blue-100/40 blur-3xl rounded-full pointer-events-none -z-0" />

      {/* Header */}
      <header className="relative z-10 max-w-5xl mx-auto w-full px-4 sm:px-6 pt-6 flex items-center justify-between">
        <JeevanBrand size="md" subtitleText="Digital Care of Every Life" />
        <div className="flex items-center bg-white/95 backdrop-blur px-3 py-1.5 rounded-xl shadow-sm border border-slate-200 hover:border-indigo-300 transition">
          <Globe className="w-4 h-4 text-indigo-600 mr-2 shrink-0" />
          <select value={lang} onChange={e => updateState({ language: e.target.value })}
            className="bg-transparent font-bold text-slate-700 outline-none text-xs sm:text-sm cursor-pointer">
            {LANG_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </header>

      {/* Main */}
      <main className="relative z-10 max-w-2xl mx-auto w-full px-4 sm:px-6 py-8 flex flex-col items-center text-center">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-2">
          {t.greeting(name)}
        </h1>
        <p className="text-slate-600 text-base sm:text-lg leading-relaxed max-w-xl mb-8 font-medium">{t.sub}</p>

        {/* Steps grid */}
        <div className="grid grid-cols-2 gap-3 w-full mb-8">
          {STEPS.map(({ key, Icon, color }) => (
            <div key={key} className="bg-white/90 backdrop-blur-sm border border-slate-200/90 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all text-left flex items-start gap-3">
              <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${color}`}>
                <Icon className="w-4.5 h-4.5" />
              </div>
              <p className="text-slate-700 text-xs sm:text-sm font-semibold leading-snug">{t[key]}</p>
            </div>
          ))}
        </div>

        {/* Language hint */}
        <p className="text-slate-500 text-xs mb-4 font-medium">{t.langLabel}</p>

        {/* Consent Status Warning / Verified Card */}
        <div className="w-full max-w-md mb-4">
          {!consentGranted ? (
            <div className="p-4 bg-amber-50/90 border border-amber-200 rounded-2xl shadow-xs text-left flex items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center text-amber-800 font-bold shrink-0 mt-0.5">
                  <Lock className="w-4.5 h-4.5 text-amber-700" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-black text-amber-950">
                    {t.consentRequired}
                  </p>
                  <p className="text-[11px] text-amber-800 font-medium leading-tight mt-0.5">
                    {t.consentRequiredSub}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowConsentModal(true)}
                className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition shadow-xs shrink-0 cursor-pointer flex items-center gap-1"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{t.grantConsentBtn}</span>
              </button>
            </div>
          ) : (
            <div className="p-3.5 bg-emerald-50/90 border border-emerald-200 rounded-2xl shadow-xs text-left flex items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-center gap-3 min-w-0">
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
                className="px-2.5 py-1.5 bg-white hover:bg-emerald-100 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer"
              >
                {t.editConsentBtn}
              </button>
            </div>
          )}
        </div>

        {/* CTA: Begin Your Intake (Disabled when consent not granted) */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-md">
          {consentGranted ? (
            <button
              type="button"
              onClick={handleStartIntake}
              className="flex-1 w-full inline-flex items-center justify-center gap-3 px-6 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-base sm:text-lg rounded-2xl shadow-xl shadow-indigo-200/80 hover:shadow-indigo-300 active:scale-95 transition-all duration-200 cursor-pointer group"
            >
              <Mic className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span>{t.btnLabel}</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowConsentModal(true)}
              className="flex-1 w-full inline-flex items-center justify-center gap-3 px-6 py-4 bg-slate-200 text-slate-400 font-bold text-base sm:text-lg rounded-2xl border border-slate-300 transition-all cursor-not-allowed select-none group"
              title="Click to grant clinical consent"
            >
              <Lock className="w-5 h-5 text-slate-400 group-hover:text-amber-600 transition" />
              <span>{t.btnLabel}</span>
              <span className="text-xs font-semibold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md">Consent Required</span>
            </button>
          )}
        </div>
        <p className="text-slate-400 text-xs mt-3">{t.btnSub}</p>

        {/* Option to Upload Past Records / Prescriptions */}
        <div className="mt-4 w-full max-w-md bg-white/80 backdrop-blur border border-teal-200/80 rounded-2xl p-4 shadow-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600 shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="text-left">
              <h4 className="text-xs font-bold text-slate-900">
                {lang === 'hi' ? 'पिछली पर्ची या टेस्ट रिपोर्ट है?' : lang === 'mr' ? 'मागील प्रिस्क्रिप्शन किंवा अहवाल आहे?' : 'Have Past Prescriptions or Reports?'}
              </h4>
              <p className="text-[11px] text-slate-500">
                {lang === 'hi' ? 'दवाइयां और पिछली बीमारी रिपोर्ट में शामिल करने के लिए अपलोड करें।' : 'Upload them to automatically extract & include them in your summary.'}
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
            className="px-3 py-2 bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-800 text-xs font-bold rounded-xl transition shrink-0 cursor-pointer"
          >
            {lang === 'hi' ? 'अपलोड करें' : 'Upload'}
          </button>
        </div>

        {/* Privacy note */}
        <div className="flex items-center gap-2 mt-4 text-slate-500 text-xs">
          <Shield className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          <span>{t.note}</span>
        </div>
      </main>

      {/* Clinical Consent Modal */}
      <ClinicalConsentModal
        isOpen={showConsentModal}
        onClose={() => setShowConsentModal(false)}
        onConsentGranted={() => setShowConsentModal(false)}
      />

      <footer className="relative z-10 w-full border-t border-slate-200/80 bg-white/60 py-4 px-4 text-center">
        <div className="max-w-4xl mx-auto flex items-center justify-center gap-1.5 text-xs text-slate-500 font-medium">
          <Shield className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>Secure patient intake • NDHM Data Privacy Compliant • Doctor-reviewed</span>
        </div>
      </footer>
    </div>
  );
};

export default PatientHome;
