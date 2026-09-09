import React, { useState, useEffect } from 'react';
import {
  ShieldCheck, Globe, Volume2, Lock, Mic, FileText, Activity, Share2,
  Check, Mail, Phone, X, AlertCircle, CheckSquare, Loader2
} from 'lucide-react';
import { useGlobalState } from '../context/GlobalStateContext';
import { API_BASE } from '../config/api';

const CONSENT_ITEMS = [
  {
    id: 'voice',
    icon: Mic,
    mandatory: false,
    title: {
      en: 'Voice Recordings & Audio Transcription',
      hi: 'आवाज रिकॉर्डिंग और ऑडियो प्रतिलेखन',
      mr: 'व्हॉइस रेकॉर्डिंग आणि ऑडिओ ट्रान्सक्रिप्शन'
    },
    description: {
      en: 'Permits recording spoken dialogue and verbal symptoms for automated bilingual clinical transcription.',
      hi: 'स्वचालित द्विभाषी क्लिनिकल प्रतिलेखन के लिए बोली गई बातचीत और लक्षणों को रिकॉर्ड करने की अनुमति देता है।',
      mr: 'स्वयंचलित द्विभाषिक वैद्यकीय ट्रान्सक्रिप्शनसाठी बोललेले संवाद आणि लक्षणे रेकॉर्ड करण्यास अनुमती देते.'
    },
    audioExplanation: {
      en: 'Consent for voice recordings. This allows the system to record and transcribe your verbal symptoms and answers during the clinical encounter.',
      hi: 'आवाज रिकॉर्डिंग की सहमति। इससे परामर्श के दौरान आपके द्वारा बोले गए लक्षणों और उत्तरों को रिकॉर्ड और ट्रांसक्राइब किया जाता है।',
      mr: 'व्हॉइस रेकॉर्डिंगची संमती. या सल्ल्यादरम्यान तुमची लक्षणे आणि उत्तरे रेकॉर्ड करण्यास अनुमती देते.'
    }
  },
  {
    id: 'documents',
    icon: FileText,
    mandatory: false,
    title: {
      en: 'Document Upload & OCR Extraction',
      hi: 'दस्तावेज़ अपलोड और ओसीआर (OCR) निष्कर्षण',
      mr: 'दस्तऐवज अपलोड आणि ओसीआर निष्कर्षण'
    },
    description: {
      en: 'Authorizes scanning and extracting text from uploaded prescriptions, lab reports, and discharge slips.',
      hi: 'अपलोड की गई दवा पर्चियों, लैब रिपोर्टों और डिस्चार्ज पर्चियों से टेक्स्ट निकालने और विश्लेषण करने की अनुमति देता है।',
      mr: 'अपलोड केलेल्या प्रिस्क्रिप्शन आणि लॅब रिपोर्ट्स स्कॅन करण्याची परवानगी देते.'
    },
    audioExplanation: {
      en: 'Consent for medical documents. This enables automated OCR extraction of prescriptions and laboratory test records you upload.',
      hi: 'चिकित्सीय दस्तावेज़ों की सहमति। इससे आपके द्वारा अपलोड की गई दवा पर्चियों और लैब रिपोर्टों से डेटा निकाला जाता है।',
      mr: 'वैद्यकीय दस्तऐवजांची संमती. अपलोड केलेल्या प्रिस्क्रिप्शन आणि अहवालांमधून डेटा काढण्यास मदत करते.'
    }
  },
  {
    id: 'ayush',
    icon: Activity,
    mandatory: false,
    title: {
      en: 'AYUSH Baseline Profile & Prakriti Assessment',
      hi: 'आयुष प्रोफ़ाइल और प्रकृति मूल्यांकन',
      mr: 'आयुष प्रोफाइल आणि प्रकृती मूल्यांकन'
    },
    description: {
      en: 'Permits recording metabolic dominance, Agni (digestive fire), Prakriti (constitution), and Koshtha traits.',
      hi: 'पाचन शक्ति (अग्नि), शारीरिक प्रकृति और कोष्ठ लक्षणों के पारंपरिक आयुष मूल्यांकन को रिकॉर्ड करने की अनुमति देता है।',
      mr: 'अग्नी, प्रकृती आणि कोष्ठ मूल्यांकनास अनुमती देते.'
    },
    audioExplanation: {
      en: 'Consent for AYUSH assessment. This permits evaluating your constitutional Prakriti, Agni, and digestive habits for holistic care.',
      hi: 'आयुष मूल्यांकन की सहमति। इससे आपके शरीर की प्रकृति, अग्नि और पाचन आदतों का पारंपरिक विश्लेषण किया जाता है।',
      mr: 'आयुष मूल्यांकनाची संमती. तुमच्या प्रकृती आणि अग्नीचे मूल्यांकन करण्यास अनुमती देते.'
    }
  },
  {
    id: 'his_emr',
    icon: Share2,
    mandatory: false,
    title: {
      en: 'Hospital EMR & Clinical Summary Sharing',
      hi: 'अस्पताल ईएमआर और क्लिनिकल सारांश साझाकरण',
      mr: 'हॉस्पिटल ईएमआर आणि क्लिनिकल सारांश सामायिकरण'
    },
    description: {
      en: 'Allows transmission of the finalized triage note and SOCRATES profile to the attending doctor in hospital HIS/EMR.',
      hi: 'अंतिम ट्राइएज और सोक्रेटीस सारांश को अस्पताल प्रणाली (HIS/EMR) और ड्यूटी चिकित्सक को प्रेषित करने की अनुमति देता है।',
      mr: 'अंतिम ट्राइएज सारांश उपचार करणाऱ्या डॉक्टरांसोबत शेअर करण्याची परवानगी देते.'
    },
    audioExplanation: {
      en: 'Consent for EMR sharing. This authorizes transmitting your digital triage summary directly to the hospital physician in charge.',
      hi: 'अस्पताल प्रणाली साझाकरण सहमति। इससे आपका डिजिटल क्लिनिकल सारांश सीधे ड्यूटी चिकित्सक को भेजा जाता है।',
      mr: 'ईएमआर शेअरिंग संमती. तुमचा ट्राइएज सारांश थेट डॉक्टरांना पाठवण्याची अनुमती देते.'
    }
  },
  {
    id: 'abha_fhir',
    icon: Lock,
    mandatory: true,
    title: {
      en: 'Clinical Data Privacy & FHIR Records (Mandatory)',
      hi: 'क्लिनिकल डेटा गोपनीयता और FHIR रिकॉर्ड्स (अनिवार्य)',
      mr: 'क्लिनिकल डेटा गोपनीयता आणि FHIR रेकॉर्ड्स (अनिवार्य)'
    },
    description: {
      en: 'Strictly required to bind this clinical encounter to your electronic health record and generate standard FHIR R4 clinical summaries.',
      hi: 'इस परामर्श को आपके इलेक्ट्रॉनिक स्वास्थ्य रिकॉर्ड से जोड़ने और मानक FHIR R4 सारांश तैयार करने के लिए आवश्यक है।',
      mr: 'हा सल्ला तुमच्या इलेक्ट्रॉनिक आरोग्य खात्याशी जोडण्यासाठी आणि FHIR सारांशासाठी आवश्यक आहे.'
    },
    audioExplanation: {
      en: 'Mandatory clinical consent. This is strictly required to link your encounter to your health account and generate standards-compliant FHIR health summaries.',
      hi: 'अनिवार्य क्लिनिकल सहमति। इस सत्र को आपके स्वास्थ्य खाते से जोड़ने और मानक रिपोर्ट तैयार करने के लिए यह आवश्यक है।',
      mr: 'अनिवार्य संमती. हा सल्ला तुमच्या आरोग्य खात्याशी जोडण्यासाठी आवश्यक आहे.'
    }
  }
];

const ClinicalConsentModal = ({ isOpen, onClose, onConsentGranted }) => {
  const { globalState, updateState } = useGlobalState();
  const lang = globalState?.language || 'en';

  const [consents, setConsents] = useState(globalState?.consents || {
    voice: true,
    documents: true,
    ayush: true,
    his_emr: true,
    abha_fhir: true
  });

  const [patientEmail, setPatientEmail] = useState(globalState?.patient_contact?.email || globalState?.email || '');
  const [patientPhone, setPatientPhone] = useState(globalState?.patient_contact?.phone || globalState?.mobile || '');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [playingId, setPlayingId] = useState(null);

  useEffect(() => {
    if (globalState?.consents) {
      setConsents(globalState.consents);
    }
  }, [globalState?.consents]);

  useEffect(() => {
    if (globalState?.email || globalState?.patient_contact?.email) {
      setPatientEmail(globalState.patient_contact?.email || globalState.email || '');
    }
    if (globalState?.mobile || globalState?.patient_contact?.phone) {
      setPatientPhone(globalState.patient_contact?.phone || globalState.mobile || '');
    }
  }, [globalState?.email, globalState?.patient_contact?.email, globalState?.mobile, globalState?.patient_contact?.phone]);

  if (!isOpen) return null;

  const handleToggleConsent = (id) => {
    setConsents(prev => ({ ...prev, [id]: !prev[id] }));
    setError('');
  };

  const speak = (text, id = 'top') => {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    let targetLang = lang === 'hi' ? 'hi-IN' : (lang === 'mr' ? 'mr-IN' : 'en-IN');
    setPlayingId(id);
    u.lang = targetLang;
    u.onend = () => setPlayingId(null);
    u.onerror = () => setPlayingId(null);
    window.speechSynthesis.speak(u);
  };

  const handleGrantConsent = async () => {
    if (!consents.abha_fhir) {
      setError(lang === 'hi' ? 'कृपया आगे बढ़ने के लिए अनिवार्य सहमति चुनें।' : 'Please accept the mandatory clinical data privacy consent to proceed.');
      return;
    }

    setLoading(true);
    setError('');
    const effectiveSessionId = globalState?.session_id || sessionStorage.getItem('session_id') || `session-${Date.now()}`;
    sessionStorage.setItem('session_id', effectiveSessionId);

    const effectiveAbha = globalState?.abha_id || `ABHA-${Date.now()}`;
    const effectiveEmail = patientEmail ? patientEmail.trim() : (globalState?.email || globalState?.patient_contact?.email || null);
    const effectivePhone = patientPhone ? patientPhone.trim() : (globalState?.mobile || globalState?.patient_contact?.phone || null);

    try {
      const res = await fetch(`${API_BASE}/api/consent/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: effectiveSessionId,
          abha_id: effectiveAbha,
          name: globalState?.patientName || 'Patient',
          gender: globalState?.gender || globalState?.abha_profile?.gender || null,
          dob: globalState?.dob || globalState?.abha_profile?.dob || null,
          abha_address: globalState?.abha_address || globalState?.abha_profile?.abha_address || null,
          consents: consents,
          email: effectiveEmail,
          phone: effectivePhone,
          profile_data: globalState?.abha_profile || { source: 'clinical-intake-consent' }
        })
      });

      const data = await res.json();
      if (res.ok && data.status === 'granted') {
        updateState({
          session_id: effectiveSessionId,
          consent_granted: true,
          consents: { ...consents },
          patient_contact: {
            email: effectiveEmail || '',
            phone: effectivePhone || ''
          }
        });

        if (onConsentGranted) onConsentGranted();
        onClose();
      } else {
        setError('Failed to record consent in clinical records.');
      }
    } catch {
      // Offline / Local State Fallback
      updateState({
        session_id: effectiveSessionId,
        consent_granted: true,
        consents: { ...consents },
        patient_contact: {
          email: effectiveEmail || '',
          phone: effectivePhone || ''
        }
      });
      if (onConsentGranted) onConsentGranted();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col my-auto overflow-hidden animate-in zoom-in-95">
        
        {/* Modal Top Bar */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-teal-800 to-emerald-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center border border-white/20">
              <ShieldCheck className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black tracking-tight">
                {lang === 'hi' ? 'मरीज़ नैदानिक सहमति' : 'Patient Clinical Consent'}
              </h2>
              <p className="text-[11px] text-teal-100 font-medium">
                Clinical Intake Permissions & Privacy Protection · 5 Controls
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-left text-slate-800">

          {/* Explanation Banner */}
          <div className="p-3 bg-teal-50/70 border border-teal-200/80 rounded-2xl flex items-start gap-3">
            <button
              type="button"
              onClick={() => speak(
                lang === 'hi' 
                  ? 'कृपया अपना परामर्श शुरू करने से पहले नीचे दी गई 5 नैदानिक सहमतियों की समीक्षा करें।' 
                  : 'Please review and confirm your clinical consents before beginning your consultation.',
                'top'
              )}
              className={`p-2 rounded-xl transition shrink-0 flex items-center justify-center cursor-pointer ${
                playingId === 'top' ? 'bg-teal-700 text-white animate-pulse' : 'bg-teal-100 text-teal-800 hover:bg-teal-200'
              }`}
              title="Listen to instructions"
            >
              <Volume2 className="w-4 h-4" />
            </button>
            <p className="text-xs text-slate-700 leading-relaxed font-medium">
              {lang === 'hi'
                ? 'अपना एआई क्लिनिकल इनटेक शुरू करने के लिए नीचे दी गई सहमतियों को स्वीकृति प्रदान करें। आपकी बातचीत पूर्णतः सुरक्षित है।'
                : 'To begin your AI clinical consultation, please review and accept the consent permissions below. Your encounter is private and doctor-reviewed.'}
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 5 Granular Consent Items */}
          <div className="space-y-2.5">
            {CONSENT_ITEMS.map((item) => {
              const isChecked = Boolean(consents[item.id]);
              const isPlaying = playingId === item.id;
              const titleText = item.title[lang] || item.title.en;
              const descText = item.description[lang] || item.description.en;
              const spokenText = item.audioExplanation[lang] || item.audioExplanation.en;

              return (
                <div
                  key={item.id}
                  className={`p-3 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                    item.mandatory
                      ? (isChecked ? 'bg-teal-50/70 border-teal-300 shadow-2xs' : 'bg-red-50/50 border-red-300')
                      : (isChecked ? 'bg-white border-slate-300 hover:border-teal-300' : 'bg-slate-50 border-slate-200 opacity-75')
                  }`}
                >
                  <label className="flex items-start gap-2.5 cursor-pointer flex-1 select-none">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggleConsent(item.id)}
                      className="sr-only"
                    />
                    <div className={`w-5 h-5 mt-0.5 rounded flex items-center justify-center transition-all shrink-0 ${
                      isChecked ? 'bg-teal-700 text-white' : 'border-2 border-slate-400 bg-white'
                    }`}>
                      {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-slate-900 text-xs sm:text-sm">{titleText}</span>
                        {item.mandatory ? (
                          <span className="text-[9px] uppercase font-black tracking-wider px-1.5 py-0.5 rounded bg-red-100 text-red-800 border border-red-200">
                            Mandatory
                          </span>
                        ) : (
                          <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                            Optional
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{descText}</p>
                    </div>
                  </label>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      speak(spokenText, item.id);
                    }}
                    className={`p-1.5 rounded-lg transition shrink-0 flex items-center justify-center cursor-pointer ${
                      isPlaying ? 'bg-teal-700 text-white animate-pulse' : 'bg-slate-100 hover:bg-teal-100 text-slate-600 hover:text-teal-800'
                    }`}
                    title="Listen to explanation"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Optional Contact Fields */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 block">
              Contact for Digital Clinical Summary (Optional)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Email Address</label>
                <input
                  type="email"
                  value={patientEmail}
                  onChange={e => setPatientEmail(e.target.value)}
                  placeholder="patient@example.com"
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:border-teal-600"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Mobile Number</label>
                <input
                  type="tel"
                  value={patientPhone}
                  onChange={e => setPatientPhone(e.target.value)}
                  placeholder="9876543210"
                  maxLength={10}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:border-teal-600"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Modal Action Footer */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleGrantConsent}
            disabled={loading || !consents.abha_fhir}
            className="px-6 py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-teal-700/20 active:scale-95 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckSquare className="w-4 h-4" />}
            <span>Accept & Grant Consent</span>
          </button>
        </div>

      </div>
    </div>
  );
};

export default ClinicalConsentModal;
