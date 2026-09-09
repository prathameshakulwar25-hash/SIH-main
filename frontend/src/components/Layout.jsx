import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { XCircle, RotateCcw } from 'lucide-react';
import { useGlobalState } from '../context/GlobalStateContext';
import { JeevanLogoIcon } from './JeevanLogo';

const steps = [
  { path: '/home', label: 'Complaint' },
  { path: '/ayush', label: 'AYUSH' },
  { path: '/intake', label: 'Intake' },
  { path: '/documents', label: 'Documents' },
  { path: '/summary', label: 'Summary' }
];

const Layout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { globalState, resetState } = useGlobalState();
  const sessionId = sessionStorage.getItem('session_id');
  const lang = globalState?.language || 'en';
  const isLanding = location.pathname === '/';

  // Determine current step index based on path
  let currentStepIndex = 0;
  if (location.pathname.startsWith('/summary')) currentStepIndex = 4;
  else if (location.pathname.startsWith('/documents')) currentStepIndex = 3;
  else if (location.pathname.startsWith('/intake') || location.pathname.startsWith('/priority')) currentStepIndex = 2;
  else if (location.pathname.startsWith('/ayush')) currentStepIndex = 1;
  else if (location.pathname.startsWith('/home')) currentStepIndex = 0;

  const handleAbandon = () => {
    if (window.confirm("Are you sure you want to abandon this visit? All unsaved data will be lost.")) {
      sessionStorage.clear();
      resetState();
      navigate('/patient-home');
    }
  };

  const handleResetDemo = () => {
    const confirmMsg = lang === 'hi' 
      ? 'क्या आप निश्चित रूप से डेमो सत्र रीसेट करना चाहते हैं? सभी डेटा साफ़ हो जाएगा।' 
      : 'Are you sure you want to reset this demo session? All entered clinical data will be cleared and you will return to Home.';
    if (window.confirm(confirmMsg)) {
      sessionStorage.clear();
      resetState();
      navigate('/patient-home');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans">
      
      {/* Global Header & Stepper (Hidden on Landing page) */}
      {!isLanding && (
        <header className="bg-white/95 backdrop-blur-sm border-b border-teal-100/80 px-4 md:px-6 py-3.5 shadow-sm sticky top-0 z-50 print:hidden">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full max-w-2xl">
            <button
              onClick={() => navigate('/patient-home')}
              className="transition-transform duration-200 hover:scale-105 shrink-0 cursor-pointer focus:outline-none"
              title="Jeevan Home"
            >
              <JeevanLogoIcon className="w-9 h-9" idPrefix="layout-hdr" />
            </button>
            <div className="flex items-center space-x-2 w-full">
            {steps.map((step, idx) => (
              <React.Fragment key={step.label}>
                <div className={`flex flex-col items-center transition-colors duration-300 ${idx <= currentStepIndex ? 'text-teal-700' : 'text-slate-400'}`}>
                  <div className={`w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center font-bold text-xs md:text-sm border-2 transition-all duration-300 shadow-sm
                    ${idx < currentStepIndex ? 'bg-teal-600 text-white border-teal-600' : 
                      idx === currentStepIndex ? 'bg-teal-50 border-teal-600 text-teal-700 ring-2 ring-teal-200' : 
                      'bg-white border-slate-300'}`}
                  >
                    {idx + 1}
                  </div>
                  <span className="text-[10px] font-bold uppercase mt-1 tracking-wider hidden md:block">{step.label}</span>
                </div>
                {idx < steps.length - 1 && (
                  <div className="flex-1 h-1.5 mx-1 rounded-full bg-slate-200 overflow-hidden relative">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ease-out ${
                        idx < currentStepIndex ? 'w-full bg-gradient-to-r from-teal-500 to-teal-600' : 'w-0 bg-transparent'
                      }`}
                    />
                  </div>
                )}
              </React.Fragment>
            ))}
            </div>
          </div>
          
          {/* Header Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button 
              type="button"
              onClick={handleResetDemo}
              className="flex items-center text-amber-800 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm hover:shadow active:scale-95 cursor-pointer"
              title={lang === 'hi' ? 'डेमो सत्र रीसेट करें' : 'Reset Demo Session'}
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1 text-amber-700" />
              <span>{lang === 'hi' ? 'डेमो रीसेट' : 'Reset Demo Session'}</span>
            </button>

            {sessionId && currentStepIndex < 5 && (
              <button 
                type="button"
                onClick={handleAbandon}
                className="flex items-center text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 border border-red-200 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm hover:shadow active:scale-95"
                title="Abandon current visit"
              >
                <XCircle className="w-3.5 h-3.5 mr-1" />
                <span className="hidden sm:inline">Abandon</span>
              </button>
            )}
          </div>
        </div>
      </header>
      )}

      {/* Main Content Area */}
      <main className="flex-1 relative animate-fade-in">
        {children}
      </main>
    </div>
  );
};

export default Layout;
