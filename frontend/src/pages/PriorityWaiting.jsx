import React, { useEffect, useState } from 'react';
import { useGlobalState } from '../context/GlobalStateContext';
import { AlertOctagon, Clock, Activity, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const PRIORITY_I18N = {
  'Priority Session': { hi: 'प्राथमिकता सत्र' },
  'Please Wait for Staff': { hi: 'कृपया मेडिकल स्टाफ की प्रतीक्षा करें' },
  'STATUS': { hi: 'स्थिति' },
  'Status': { hi: 'स्थिति' },
  'Priority Triage Flagged': { hi: 'प्राथमिकता ट्राइएज चिह्नित' },
  'STAFF NOTIFIED AT': { hi: 'स्टाफ को सूचित किया गया' },
  'Staff Notified At': { hi: 'स्टाफ को सूचित किया गया' },
  'Instructions for Patient:': { hi: 'मरीज के लिए निर्देश:' },
  'Do not close this screen. A clinical staff member has been alerted to your responses and is on their way to assist you immediately.': {
    hi: 'इस स्क्रीन को बंद न करें। आपकी प्रतिक्रियाओं के आधार पर क्लिनिकल स्टाफ को सूचित कर दिया गया है और वे तुरंत आपकी सहायता के लिए आ रहे हैं।'
  },
  'Reset Demo Session': { hi: 'डेमो सत्र रीसेट करें' },
  'Reset Demo': { hi: 'डेमो रीसेट' },
  'Abandon': { hi: 'सत्र छोड़ें' },
  'Flagged Pattern': { hi: 'चिह्नित पैटर्न' },
  'Acute Surgical RLQ': { hi: 'एक्यूट सर्जिकल आरएलक्यू' },
  'Critical Vascular': { hi: 'क्रिटिकल वैस्कुलर' },
  'Acute Hemorrhagic': { hi: 'एक्यूट हेमोरेजिक' },
  'Infective/Inflammatory': { hi: 'संक्रामक/सूजन संबंधी' },
  'CNS Infectious': { hi: 'सीएनएस संक्रामक' },
  'Systemic Infective': { hi: 'प्रणालीगत संक्रामक' },
  'Acute Cardiac Pattern': { hi: 'एक्यूट कार्डियक पैटर्न' },
  'CRITICAL PRIORITY': { hi: 'अति-गंभीर प्राथमिकता' },
  'HIGH PRIORITY': { hi: 'उच्च प्राथमिकता' },
  'MODERATE-HIGH PRIORITY': { hi: 'मध्यम-उच्च प्राथमिकता' }
};

const PriorityWaiting = () => {
  const { globalState, resetState } = useGlobalState();
  const navigate = useNavigate();
  const [timeStr, setTimeStr] = useState('');
  const lang = globalState?.language || 'en';

  const t = (text) => {
    if (!text) return text;
    if (lang === 'en') return text;
    return PRIORITY_I18N[text]?.[lang] || text;
  };

  useEffect(() => {
    // If not priority, we shouldn't really be here, but for demo we can stay or redirect.
    if (!globalState?.priority) {
       navigate('/');
    }
    
    // Set fixed notification time for demo purposes
    const now = new Date();
    setTimeStr(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  }, [globalState?.priority, navigate]);

  const handleResetDemo = () => {
    const confirmMsg = lang === 'hi' 
      ? 'क्या आप निश्चित रूप से डेमो सत्र रीसेट करना चाहते हैं? सभी डेटा साफ़ हो जाएगा और सहमति पृष्ठ पर पुनः निर्देशित किया जाएगा।' 
      : 'Are you sure you want to reset this demo session? All entered clinical data will be cleared and you will return to Consent.';
    if (window.confirm(confirmMsg)) {
      sessionStorage.clear();
      resetState();
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-red-600 flex flex-col items-center justify-center p-6 text-white font-sans animate-fade-in relative overflow-hidden">
      
      {/* Background pulsing effect */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[120vw] h-[120vw] bg-red-500 rounded-full animate-ping opacity-20"></div>
      </div>
      
      <div className="bg-white/10 backdrop-blur-md border border-red-400 p-8 md:p-12 rounded-3xl shadow-2xl w-full max-w-2xl text-center z-10">
        <AlertOctagon className="w-24 h-24 text-white mx-auto mb-6" />
        
        <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tight">{t('Priority Session')}</h1>
        <p className="text-xl md:text-2xl font-medium mb-6 text-red-100">
          {t('Please Wait for Staff')}
        </p>

        {/* Matched Pattern & Priority Tier Badge */}
        {globalState?.matchedPattern && (
          <div className="mb-8 inline-flex flex-wrap items-center justify-center gap-2.5 bg-black/25 border border-white/30 px-6 py-3 rounded-2xl shadow-inner max-w-full">
            <span className="text-red-100 text-sm font-semibold tracking-wide">
              {t('Flagged Pattern')}:
            </span>
            <span className="text-white font-black text-lg">
              {t(globalState.matchedPattern)}
            </span>
            {globalState?.priorityTier && (
              <span className={`px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider shadow-sm ml-2 ${
                globalState.priorityTier.includes('CRITICAL')
                  ? 'bg-rose-950 text-rose-200 border border-rose-400 ring-2 ring-rose-400/50 animate-pulse'
                  : globalState.priorityTier.includes('HIGH') && !globalState.priorityTier.includes('MODERATE')
                  ? 'bg-amber-600 text-amber-50 border border-amber-300'
                  : 'bg-yellow-600 text-yellow-50 border border-yellow-300'
              }`}>
                {t(globalState.priorityTier)}
              </span>
            )}
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
          <div className="bg-red-700/50 p-6 rounded-2xl border border-red-500 flex items-center">
             <Activity className="w-10 h-10 text-red-200 mr-4 shrink-0" />
             <div>
                <p className="text-sm text-red-200 font-bold uppercase tracking-wider mb-1">{t('Status')}</p>
                <p className="text-xl font-bold">
                  {globalState?.matchedPattern ? t(globalState.matchedPattern) : t('Priority Triage Flagged')}
                </p>
                {globalState?.priorityTier && (
                  <p className="text-xs text-red-200 font-semibold uppercase tracking-wider mt-0.5">
                    {t(globalState.priorityTier)}
                  </p>
                )}
             </div>
          </div>
          
          <div className="bg-red-700/50 p-6 rounded-2xl border border-red-500 flex items-center">
             <Clock className="w-10 h-10 text-red-200 mr-4 shrink-0" />
             <div>
                <p className="text-sm text-red-200 font-bold uppercase tracking-wider mb-1">{t('Staff Notified At')}</p>
                <p className="text-xl font-bold">{timeStr || '--:--'}</p>
             </div>
          </div>
        </div>
        
        <div className="mt-12 bg-white text-red-700 p-6 rounded-2xl shadow-lg text-left">
           <p className="font-bold text-lg mb-2">{t('Instructions for Patient:')}</p>
           <p className="font-medium text-slate-700">
              {t('Do not close this screen. A clinical staff member has been alerted to your responses and is on their way to assist you immediately.')}
           </p>
        </div>

        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={handleResetDemo}
            className="flex items-center gap-2 bg-red-800/80 hover:bg-red-900 border border-red-400 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{t('Reset Demo Session')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PriorityWaiting;
