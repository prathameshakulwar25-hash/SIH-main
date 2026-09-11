import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGlobalState } from '../context/GlobalStateContext';
import {
  Mic, MicOff, Volume2, VolumeX, AlertTriangle, CheckCircle2,
  ArrowRight, Globe, Loader2, Send, Shield, Paperclip, UploadCloud, X, FileText, Check, Plus, Settings, Server, RefreshCw
} from 'lucide-react';
import { JeevanBrand, JeevanLogoIcon } from '../components/JeevanLogo';
import { BodyMap } from '../components/BodyMap';
import { TouchOptions } from '../components/TouchOptions';
import { API_BASE, getApiBase } from '../config/api';
import ServerConfigModal from '../components/ServerConfigModal';
import { playSpeech, stopSpeech } from '../utils/speech';


const LANG_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'हिन्दी' },
  { value: 'mr', label: 'मराठी' },
];

const UI = {
  en: {
    assistantTitle: 'Jeevan',
    assistantRole: 'Clinical Intake Assistant',
    statusOnline: 'Intake Active',
    tap: 'Tap to speak with Jeevan',
    listening: 'Jeevan is listening to you…',
    speaking: 'Jeevan is speaking…',
    replayAudio: 'Listen again',
    orType: 'or type your response…',
    send: 'Send',
    complete: 'Finish Clinical Intake',
    reportReady: 'Your clinical intake is complete.',
    viewReport: 'View Clinical Summary & Report',
    generating: 'Preparing your clinical case summary for the doctor…',
    emergency: 'Emergency Alert: Please proceed to the nearest emergency department or hospital immediately.',
    noMic: 'Microphone unavailable — please select options below or type.',
    privacyNote: 'Strictly confidential clinical intake (ABDM Compliant). Sent directly to your doctor.',
    exitBtn: 'Exit',
  },
  hi: {
    assistantTitle: 'जीवन',
    assistantRole: 'क्लिनिकल इनटेक सहायक',
    statusOnline: 'सत्र सक्रिय',
    tap: 'जीवन से बात करने के लिए माइक दबाएं',
    listening: 'जीवन आपको सुन रहा है…',
    speaking: 'जीवन बोल रहा है…',
    replayAudio: 'पुनः सुनें',
    orType: 'या यहाँ उत्तर लिखें…',
    send: 'भेजें',
    complete: 'क्लिनिकल इनटेक पूरा करें',
    reportReady: 'आपकी क्लिनिकल जानकारी दर्ज कर ली गई है।',
    viewReport: 'क्लिनिकल रिपोर्ट और सारांश देखें',
    generating: 'डॉक्टर के लिए क्लिनिकल सारांश तैयार हो रहा है…',
    emergency: 'आपातकालीन चेतावनी: कृपया तुरंत नज़दीकी अस्पताल या आपातकालीन वार्ड में जाएं।',
    noMic: 'माइक उपलब्ध नहीं — कृपया नीचे विकल्प चुनें या टाइप करें।',
    privacyNote: 'पूर्णतः सुरक्षित व गोपनीय परामर्श (ABDM प्रमाणित)। डॉक्टर के लिए संकलित।',
    exitBtn: 'वापस',
  },
  mr: {
    assistantTitle: 'जीवन',
    assistantRole: 'क्लिनिकल इनटेक सहाय्यक',
    statusOnline: 'सत्र सुरू',
    tap: 'जीवनशी बोलण्यासाठी माईक दाबा',
    listening: 'जीवन आपले म्हणणे ऐकत आहे…',
    speaking: 'जीवन बोलत आहे…',
    replayAudio: 'पुन्हा ऐका',
    orType: 'किंवा येथे उत्तर लिहा…',
    send: 'पाठवा',
    complete: 'क्लिनिकल इनटेक पूर्ण करा',
    reportReady: 'आपली क्लिनिकल माहिती नोंदवली गेली आहे.',
    viewReport: 'क्लिनिकल अहवाल आणि सारांश पाहा',
    generating: 'डॉक्टरांसाठी वैद्यकीय सारांश तयार होत आहे…',
    emergency: 'आपत्कालीन इशारा: कृपया ताबडतोब नजीकच्या रुग्णालयात जा.',
    noMic: 'मायक्रोफोन उपलब्ध नाही — खालील पर्याय निवडा किंवा टाइप करा.',
    privacyNote: 'रुग्ण-डॉक्टर पूर्णपणे गोपनीय सल्लामसलत (ABDM प्रमाणित).',
    exitBtn: 'मागे',
  },
};

const VoiceIntake = () => {
  const navigate = useNavigate();
  const { globalState, updateState } = useGlobalState();
  const lang = globalState?.language || 'en';
  const ui = UI[lang] || UI.en;
  const [activeSessionId] = useState(() => {
    return globalState?.session_id || sessionStorage.getItem('session_id') || `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  });

  const [currentQuestion, setCurrentQuestion] = useState('');
  const [history, setHistory] = useState([]);
  const [textInput, setTextInput] = useState('');
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [isEmergency, setIsEmergency] = useState(false);
  const [hasMic, setHasMic] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [currentStepMeta, setCurrentStepMeta] = useState(null);
  const [touchKey, setTouchKey] = useState(0);
  const [showServerModal, setShowServerModal] = useState(false);
  const [connectionError, setConnectionError] = useState(null);

  // Document upload state
  const [showDocUploadModal, setShowDocUploadModal] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [docUploadError, setDocUploadError] = useState(null);
  const [docUploadSuccess, setDocUploadSuccess] = useState(null);
  const [uploadedDocs, setUploadedDocs] = useState(() => globalState?.documents || []);

  const handleDocumentUpload = async (file) => {
    if (!file) return;
    setUploadingDoc(true);
    setDocUploadError(null);
    setDocUploadSuccess(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('session_id', activeSessionId);
      const currentApi = getApiBase();
      const res = await fetch(`${currentApi}/api/documents/upload`, {
        method: 'POST',
        headers: {
          'bypass-tunnel-reminder': 'true',
          'Bypass-Tunnel-Reminder': 'true'
        },
        body: formData,
      });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      const parsed = data.parsed_data || {};
      const newDoc = {
        id: data.id,
        timestamp: data.timestamp || new Date().toISOString(),
        raw_text: data.raw_text,
        ...parsed,
      };
      const updatedList = [...uploadedDocs, newDoc];
      setUploadedDocs(updatedList);
      updateState({ documents: updatedList });
      setDocUploadSuccess(newDoc);
    } catch (err) {
      console.error('[Document Upload Error]', err);
      setDocUploadError(lang === 'hi' ? 'दस्तावेज़ अपलोड करने में त्रुटि हुई।' : 'Failed to process document. Please try again.');
    } finally {
      setUploadingDoc(false);
    }
  };

  const recognitionRef = useRef(null);
  const transcriptRef = useRef('');
  const isListeningRef = useRef(false);
  const cancelSpeechRef = useRef(null);
  const answerEndRef = useRef(null);

  // Keep isListeningRef in sync with isListening state
  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  useEffect(() => {
    if (!globalState?.role || globalState.role !== 'patient') navigate('/');
  }, [globalState?.role, navigate]);

  useEffect(() => {
    answerEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentQuestion, currentStepMeta]);

  const speak = useCallback((text) => {
    if (isMuted) return;
    if (cancelSpeechRef.current) {
      try { cancelSpeechRef.current(); } catch (_) {}
    }
    cancelSpeechRef.current = playSpeech(text, {
      lang,
      rate: 0.95,
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false)
    });
  }, [lang, isMuted]);

  const replayCurrentQuestion = useCallback(() => {
    if (currentQuestion) speak(currentQuestion);
  }, [currentQuestion, speak]);

  useEffect(() => {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      setHasMic(false);
    }
    return () => {
      try { recognitionRef.current?.abort(); } catch (_) {}
      if (cancelSpeechRef.current) {
        try { cancelSpeechRef.current(); } catch (_) {}
      }
      stopSpeech();
    };
  }, []);

  const sendAnswer = useCallback(async (answerText) => {
    if (!answerText || !answerText.trim() || isThinking || isGenerating) return;
    if (cancelSpeechRef.current) {
      try { cancelSpeechRef.current(); } catch (_) {}
    }
    stopSpeech();
    setIsSpeaking(false);
    setIsListening(false);
    isListeningRef.current = false;
    try { recognitionRef.current?.stop(); } catch (_) {}

    const newHistory = [...history, { role: 'user', content: answerText.trim() }];
    setHistory(newHistory);
    setTextInput('');
    setTranscript('');
    transcriptRef.current = '';
    setIsThinking(true);
    setCurrentStepMeta(null);

    const currentApi = getApiBase();
    try {
      const res = await fetch(`${currentApi}/api/llm/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'bypass-tunnel-reminder': 'true',
          'Bypass-Tunnel-Reminder': 'true'
        },
        body: JSON.stringify({ history: newHistory, language: lang, session_id: activeSessionId })
      });
      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }
      const rawText = await res.text();
      let data;
      try {
        data = JSON.parse(rawText);
      } catch {
        if (rawText.includes('localtunnel') || rawText.includes('Friendly Reminder')) {
          throw new Error('Localtunnel requires 1-time browser unlock. Open the tunnel URL in a new tab.');
        }
        throw new Error('Server returned HTML instead of JSON');
      }
      setConnectionError(null);
      setIsThinking(false);
      if (data.red_flag_detected) setIsEmergency(true);
      if (data.step_meta && data.step_meta.options) {
        setCurrentStepMeta(data.step_meta);
        setTouchKey(k => k + 1);
      }
      const reply = data.reply || '';
      const cleanReply = reply.replace(/\[INTAKE_COMPLETE\]/g, '').replace(/```[\s\S]*?```/g, '').trim();
      if (cleanReply) {
        setHistory(prev => [...prev, { role: 'assistant', content: cleanReply }]);
      }
      if (data.is_complete || reply.includes('[INTAKE_COMPLETE]')) {
        setIsComplete(true);
        setIsGenerating(true);
        setCurrentQuestion(ui.generating);
        await finalizeReport([...newHistory, { role: 'assistant', content: cleanReply || reply }]);
      } else if (cleanReply) {
        setCurrentQuestion(cleanReply);
        speak(cleanReply);
      } else {
        const fallback = lang === 'hi'
          ? 'कृपया इसके बारे में थोड़ा और विस्तार से बताएं।'
          : lang === 'mr'
          ? 'कृपया याबद्दल थोडी अधिक माहिती द्या.'
          : 'Could you please describe this in a little more detail?';
        setCurrentQuestion(fallback);
        setHistory(prev => [...prev, { role: 'assistant', content: fallback }]);
        speak(fallback);
      }
    } catch (err) {
      console.error('[sendAnswer error]', err);
      setIsThinking(false);
      setConnectionError({
        targetUrl: currentApi,
        detail: err.message || 'Connection failed'
      });
      const errMsg = lang === 'hi'
        ? `सर्वर से संपर्क नहीं हो पाया (${err.message})। कृपया सर्वर सेटिंग ठीक करें।`
        : lang === 'mr'
        ? `सर्व्हरशी संपर्क झाला नाही (${err.message}). कृपया सर्व्हर सेटिंग तपासा.`
        : `Connection issue: ${err.message}. Check Server Settings above.`;
      setCurrentQuestion(errMsg);
    }
  }, [history, isThinking, isGenerating, lang, activeSessionId, speak, ui]);

  const finalizeReport = useCallback(async (finalHistory) => {
    setIsGenerating(true);
    const sid = activeSessionId || globalState?.session_id || sessionStorage.getItem('session_id') || `session-${Date.now()}`;
    const currentApi = getApiBase();
    try {
      const res = await fetch(`${currentApi}/api/llm/clinician-summary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'bypass-tunnel-reminder': 'true',
          'Bypass-Tunnel-Reminder': 'true'
        },
        body: JSON.stringify({ history: finalHistory, language: 'en', session_id: sid })
      });
      const data = await res.json();
      const reportContent = data.clinician_summary || data.report || '';
      const complaintTitle = data.complaint_title || 'Acute Clinical Consultation';

      // Persist to database so PhysicianDashboard & ClinicalSummary can read it
      try {
        await fetch(`${currentApi}/api/intake/ai-summary`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'bypass-tunnel-reminder': 'true',
            'Bypass-Tunnel-Reminder': 'true'
          },
          body: JSON.stringify({
            session_id: sid,
            clinician_summary: reportContent,
            complaint: complaintTitle,
            history: finalHistory,
            flags: data.red_flags || (data.critical ? ['High Acuity Clinical Finding'] : [])
          })
        });
      } catch (saveErr) {
        console.warn('[finalizeReport DB save warning]', saveErr);
      }

      setIsGenerating(false);
      setIsComplete(true);
      if (reportContent) {
        updateState({
          clinicalSummary: reportContent,
          complaint: complaintTitle,
          intake_result: { 
            type: complaintTitle,
            clinician_summary: reportContent, 
            summary: { clinician_summary: reportContent, type: complaintTitle, complaint_title: complaintTitle },
            flags: data.red_flags || (data.critical ? ['High Acuity Clinical Finding'] : [])
          },
          session_id: sid,
          consultation_complete: true
        });
        sessionStorage.setItem('clinical_summary', reportContent);
        sessionStorage.setItem('session_id', sid);
      }
    } catch (err) {
      console.error('[finalizeReport error]', err);
      setIsGenerating(false);
      setIsComplete(true);
    }
  }, [activeSessionId, globalState, updateState]);

  const handleLanguageChange = useCallback((newLang) => {
    updateState({ language: newLang });
    // If intake just started and only greeting is shown, refresh greeting in new language
    if (history.filter(m => m.role === 'user').length === 0) {
      setIsThinking(true);
      const currentApi = getApiBase();
      fetch(`${currentApi}/api/llm/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'bypass-tunnel-reminder': 'true',
          'Bypass-Tunnel-Reminder': 'true'
        },
        body: JSON.stringify({ history: [], language: newLang, session_id: activeSessionId })
      })
        .then(r => r.json())
        .then(d => {
          const q = (d.reply || '').replace(/\[INTAKE_COMPLETE\]/g, '').trim();
          setCurrentQuestion(q);
          setHistory([{ role: 'assistant', content: q }]);
          if (d.step_meta) setCurrentStepMeta(d.step_meta);
          setTouchKey(k => k + 1);
          speak(q);
        })
        .catch(() => {})
        .finally(() => setIsThinking(false));
    }
  }, [updateState, history, activeSessionId, speak]);

  useEffect(() => {
    if (initialized) return;
    setInitialized(true);
    setIsThinking(true);
    const fetchFirst = async () => {
      const currentApi = getApiBase();
      try {
        const res = await fetch(`${currentApi}/api/llm/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'bypass-tunnel-reminder': 'true',
            'Bypass-Tunnel-Reminder': 'true'
          },
          body: JSON.stringify({ history: [], language: lang, session_id: activeSessionId })
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const rawText = await res.text();
        let data;
        try {
          data = JSON.parse(rawText);
        } catch {
          if (rawText.includes('localtunnel') || rawText.includes('Friendly Reminder')) {
            throw new Error('Localtunnel requires 1-time browser unlock. Open tunnel URL in browser.');
          }
          throw new Error('Server returned HTML instead of JSON');
        }
        setConnectionError(null);
        const q = (data.reply || '').replace(/\[INTAKE_COMPLETE\]/g, '').trim();
        setCurrentQuestion(q);
        setHistory([{ role: 'assistant', content: q }]);
        if (data.step_meta) setCurrentStepMeta(data.step_meta);
        setTouchKey(k => k + 1);
        setTimeout(() => speak(q), 400);
      } catch (err) {
        console.warn('[fetchFirst Notice]', err.message);
        setConnectionError({
          targetUrl: currentApi,
          detail: err.message || 'Connection failed'
        });
        const fallback = lang === 'hi'
          ? 'नमस्ते! मैं जीवन हूँ। आपके डॉक्टर के लिए आपकी स्वास्थ्य संबंधी जानकारी दर्ज करने में सहायता करूँगा। बताइए, आज आपको क्या परेशानी या लक्षण महसूस हो रहे हैं?'
          : lang === 'mr'
          ? 'नमस्कार! मी जीवन आहे. तुमच्या डॉक्टरांसाठी आरोग्याची माहिती नोंदवण्यात मदत करेन. सांगा, आज तुम्हाला काय त्रास किंवा लक्षणे जाणवत आहेत?'
          : 'Hello! I am Jeevan, your clinical intake assistant. I am here to help record your symptoms for your doctor. What symptoms or discomfort are you experiencing today?';
        setCurrentQuestion(fallback);
        setHistory([{ role: 'assistant', content: fallback }]);
        speak(fallback);
      } finally {
        setIsThinking(false);
      }
    };
    fetchFirst();
  }, [initialized, lang, activeSessionId, speak]);

  const toggleMic = useCallback(() => {
    if (!hasMic || isThinking || isGenerating) return;

    if (isListeningRef.current) {
      setIsListening(false);
      isListeningRef.current = false;
      try {
        recognitionRef.current?.stop();
      } catch (_) {}
      const textToSend = transcriptRef.current.trim();
      if (textToSend) {
        transcriptRef.current = '';
        setTranscript('');
        sendAnswer(textToSend);
      }
      return;
    }

    // Stop speaking if AI is talking
    synthRef.current?.cancel();
    setIsSpeaking(false);
    transcriptRef.current = '';
    setTranscript('');

    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      setHasMic(false);
      alert(lang === 'hi' ? 'आपके ब्राउज़र में आवाज़ इनपुट समर्थित नहीं है। कृपया नीचे टाइप करें।' : 'Voice input is not supported in this browser. Please type below.');
      return;
    }

    try {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (_) {}
      }

      const rec = new SpeechRec();
      rec.continuous = false;
      rec.interimResults = true;
      rec.maxAlternatives = 1;
      rec.lang = LANG_CODE[lang] || 'hi-IN';

      rec.onstart = () => {
        setIsListening(true);
        isListeningRef.current = true;
      };

      rec.onresult = (e) => {
        let interim = '';
        let final = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const item = e.results[i];
          if (item.isFinal) {
            final += item[0].transcript;
          } else {
            interim += item[0].transcript;
          }
        }
        const text = (final || interim).trim();
        if (text) {
          transcriptRef.current = text;
          setTranscript(text);
          setTextInput(text);
        }
      };

      rec.onend = () => {
        setIsListening(false);
        isListeningRef.current = false;
        const textToSend = transcriptRef.current.trim();
        if (textToSend) {
          transcriptRef.current = '';
          setTranscript('');
          sendAnswer(textToSend);
        }
      };

      rec.onerror = (e) => {
        console.warn('[STT Error]', e.error);
        setIsListening(false);
        isListeningRef.current = false;
        if (e.error === 'not-allowed') {
          setHasMic(false);
          alert(lang === 'hi' ? 'माइक्रोफ़ोन की अनुमति नहीं है। कृपया ब्राउज़र सेटिंग्स में माइक्रोफ़ोन की अनुमति दें।' : 'Microphone access was denied. Please allow microphone permissions in your browser.');
        }
      };

      recognitionRef.current = rec;
      rec.start();
    } catch (e) {
      console.error('[STT Start Error]', e);
      setIsListening(false);
      isListeningRef.current = false;
    }
  }, [hasMic, isThinking, isGenerating, lang, sendAnswer]);

  const questionCount = history.filter(m => m.role === 'user').length;
  const TAP_LABEL = { en: 'Choose an option below', hi: 'नीचे से विकल्प चुनें', mr: 'खालील पर्याय निवडा' };
  const OR_LABEL = { en: 'or speak / type your response', hi: 'या बोलें / उत्तर लिखें', mr: 'किंवा बोला / उत्तर लिहा' };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-teal-50/15 to-slate-100 flex flex-col justify-between font-sans text-slate-800 relative overflow-hidden select-none">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[380px] bg-teal-200/20 blur-3xl rounded-full pointer-events-none -z-0" />
      <header className="relative z-20 max-w-4xl mx-auto w-full px-3 sm:px-6 pt-3.5 sm:pt-5 pb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 shrink-0">
          <JeevanBrand size="sm" showSubtitle={false} className="sm:hidden" />
          <JeevanBrand size="sm" showSubtitle={true} subtitleText={lang === 'hi' ? 'डिजिटल केयर' : lang === 'mr' ? 'डिजिटल काळजी' : 'Digital Care'} className="hidden sm:flex" />
        </div>
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Upload past records button */}
          <button 
            onClick={() => setShowDocUploadModal(true)} 
            className="flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-xl bg-white/95 backdrop-blur border border-teal-200 text-teal-700 hover:bg-teal-50 text-xs font-bold transition shadow-2xs cursor-pointer"
            title="Upload past prescription or lab report"
          >
            <Paperclip className="w-3.5 h-3.5 text-teal-600" />
            <span className="hidden sm:inline">{uploadedDocs.length > 0 ? `${uploadedDocs.length} Record(s)` : (lang === 'hi' ? 'पर्ची जोड़ें' : lang === 'mr' ? 'कागदपत्र जोडा' : 'Attach Past Rx')}</span>
            <span className="sm:hidden">{uploadedDocs.length > 0 ? `${uploadedDocs.length}` : 'Rx'}</span>
          </button>

          <button onClick={() => { setIsMuted(v => !v); stopSpeech(); setIsSpeaking(false); }} className="p-1.5 sm:p-2 rounded-xl bg-white/95 backdrop-blur border border-slate-200 text-slate-600 hover:text-teal-600 hover:border-teal-300 transition shadow-2xs cursor-pointer" title={isMuted ? "Unmute AI Doctor" : "Mute AI Doctor"}>
            {isMuted ? <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-500" /> : <Volume2 className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isSpeaking ? 'text-teal-600 animate-pulse' : ''}`} />}
          </button>
          <button
            type="button"
            onClick={() => setShowServerModal(true)}
            className={`p-1.5 sm:p-2 rounded-xl bg-white/95 backdrop-blur border transition shadow-2xs cursor-pointer ${
              connectionError ? 'border-amber-400 text-amber-700 bg-amber-50' : 'border-slate-200 text-slate-600 hover:text-teal-600 hover:border-teal-300'
            }`}
            title="Backend Server Configuration"
          >
            <Server className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
          <div className="flex items-center bg-white/95 backdrop-blur px-2 sm:px-3 py-1.5 rounded-xl shadow-2xs border border-slate-200">
            <Globe className="w-3.5 h-3.5 text-teal-600 mr-1 shrink-0" />
            <select value={lang} onChange={e => handleLanguageChange(e.target.value)} className="bg-transparent font-bold text-slate-700 outline-none text-xs sm:text-sm cursor-pointer pr-1">
              {LANG_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <button onClick={() => navigate('/patient-home')} className="px-2.5 sm:px-3.5 py-1.5 rounded-xl bg-white/95 backdrop-blur border border-slate-200 text-slate-700 hover:text-slate-900 text-xs font-bold transition hover:border-slate-300 shadow-2xs cursor-pointer">
            {ui.exitBtn}
          </button>
        </div>
      </header>

      <main className="relative z-10 max-w-2xl mx-auto w-full px-4 py-4 flex-1 flex flex-col items-center justify-start gap-4 overflow-y-auto">
        {/* Backend Connection Diagnostic Alert */}
        {connectionError && (
          <div className="w-full bg-amber-50 border border-amber-300 text-amber-900 p-3 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs shadow-xs animate-in fade-in">
            <div className="flex items-start gap-2 min-w-0">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="min-w-0 text-left">
                <span className="font-bold block">Backend Connection Issue</span>
                <p className="text-[11px] text-amber-800 break-all">{connectionError.detail}</p>
                <p className="text-[10px] text-slate-500 mt-0.5 font-mono truncate">Target: {connectionError.targetUrl}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowServerModal(true)}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs shrink-0 cursor-pointer shadow-2xs flex items-center gap-1 self-stretch sm:self-auto justify-center"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Configure Server URL</span>
            </button>
          </div>
        )}

        {isEmergency && (
          <div className="w-full bg-rose-50 border border-rose-300 text-rose-800 px-4 py-3 rounded-2xl flex items-center justify-center gap-2.5 font-bold text-sm shadow-sm animate-pulse">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{ui.emergency}</span>
          </div>
        )}

        {uploadedDocs.length > 0 && (
          <div className="w-full bg-teal-50/90 border border-teal-200 rounded-2xl px-4 py-2.5 flex items-center justify-between text-xs text-teal-900 shadow-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
              <span>
                <strong>{uploadedDocs.length} Past Record(s) Attached</strong>: Prior prescriptions and diagnoses are active in this consultation.
              </span>
            </div>
            <button 
              onClick={() => setShowDocUploadModal(true)}
              className="text-[11px] font-bold text-teal-700 hover:underline cursor-pointer shrink-0 ml-2"
            >
              Manage
            </button>
          </div>
        )}

        <div className="flex flex-col items-center text-center mt-1">
          <div className="relative">
            <button
              type="button"
              onClick={replayCurrentQuestion}
              className={`w-18 h-18 sm:w-20 sm:h-20 rounded-full flex items-center justify-center border-2 transition-all duration-300 shadow-md cursor-pointer hover:scale-105 active:scale-95 ${
                isEmergency
                  ? 'bg-rose-50 border-rose-500 shadow-rose-200'
                  : isSpeaking
                  ? 'bg-teal-50 border-teal-500 ring-4 ring-teal-300 shadow-teal-200 scale-105'
                  : isListening
                  ? 'bg-rose-50 border-rose-400 ring-4 ring-rose-200 shadow-rose-200 animate-pulse scale-105'
                  : isThinking || isGenerating
                  ? 'bg-slate-100 border-teal-400 animate-pulse'
                  : 'bg-white border-slate-200 shadow-sm hover:border-teal-300'
              }`}
              title="Click to hear AI Doctor speak"
            >
              <JeevanLogoIcon className="w-11 h-11 sm:w-13 sm:h-13" idPrefix="vi-bubble" />
              {isSpeaking && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-teal-500 items-center justify-center text-[9px] text-white">🔊</span>
                </span>
              )}
            </button>
          </div>
          <div className="mt-2.5 flex flex-col items-center">
            <div className="flex items-center gap-1.5">
              <span className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">{ui.assistantTitle}</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">{ui.statusOnline}</span>
            </div>
            <span className="text-xs text-slate-500 font-medium mt-0.5">
              {isListening ? (
                <span className="text-rose-600 font-semibold">{ui.listening}</span>
              ) : isSpeaking ? (
                <span className="text-teal-700 font-semibold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-teal-500 animate-ping" />
                  <span>{ui.speaking}</span>
                </span>
              ) : isThinking || isGenerating ? (
                <span className="text-teal-600 font-semibold">{ui.generating}</span>
              ) : (
                <span>{ui.assistantRole}</span>
              )}
            </span>
          </div>
        </div>

        <div className="w-full bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-3xl shadow-lg p-6 sm:p-8 text-center transition-all relative">
          {!isThinking && !isGenerating && !isComplete && (
            <button type="button" onClick={replayCurrentQuestion} className="absolute top-4 right-4 flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-teal-700 bg-slate-50 hover:bg-teal-50 border border-slate-200 hover:border-teal-200 px-2.5 py-1 rounded-xl transition cursor-pointer" title={ui.replayAudio}>
              <Volume2 className="w-3.5 h-3.5 text-teal-600" /><span className="hidden sm:inline">{ui.replayAudio}</span>
            </button>
          )}
          {isThinking || isGenerating ? (
            <div className="flex flex-col items-center justify-center gap-3 py-6"><Loader2 className="w-8 h-8 text-teal-600 animate-spin" /><p className="text-slate-600 text-sm font-medium">{isGenerating ? ui.generating : 'Jeevan is evaluating…'}</p></div>
          ) : isComplete ? (
            <div className="flex flex-col items-center justify-center text-center gap-3 py-4"><div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center"><CheckCircle2 className="w-8 h-8" /></div><h2 className="text-xl font-bold text-slate-900">{ui.reportReady}</h2><p className="text-slate-600 text-sm max-w-md">{ui.privacyNote}</p></div>
          ) : (
            <div className="py-2"><h2 className="text-xl sm:text-2xl font-bold text-slate-900 leading-relaxed max-w-xl mx-auto">{currentQuestion}</h2></div>
          )}
        </div>

        {!isComplete && !isEmergency && !isThinking && !isGenerating && currentStepMeta && (
          <div className="w-full animate-in fade-in duration-200">
            <div className="flex items-center justify-between mb-2.5 px-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{TAP_LABEL[lang] || TAP_LABEL.en}</span>
              <span className="text-xs text-teal-700 font-medium">Touch or speak</span>
            </div>
            {currentStepMeta.ui_type === 'body_map' ? <BodyMap key={touchKey} lang={lang} onSelect={(_id, label) => sendAnswer(label)} /> : <TouchOptions key={touchKey} step={currentStepMeta} lang={lang} onSelect={sendAnswer} />}
          </div>
        )}

        {isComplete && !isEmergency && (
          <button type="button" onClick={() => { const sid = activeSessionId; sessionStorage.setItem('session_id', sid); navigate(`/summary/${sid}`); }} className="w-full flex items-center justify-center gap-2 py-4 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-2xl shadow-lg shadow-teal-700/20 transition-all active:scale-[0.98] cursor-pointer text-base">{ui.viewReport} <ArrowRight className="w-5 h-5" /></button>
        )}
        <div ref={answerEndRef} className="h-2" />
      </main>

      {!isComplete && !isEmergency && (
        <footer className="shrink-0 relative z-20 border-t border-slate-200 bg-white/95 backdrop-blur-md px-4 pt-3 pb-5 space-y-2.5 max-w-2xl mx-auto w-full">
          {transcript && (
            <div className="bg-teal-50 border border-teal-200 text-teal-900 rounded-xl px-4 py-2 text-sm italic font-medium animate-pulse">
              "{transcript}"
            </div>
          )}

          {hasMic && (
            <button
              type="button"
              onClick={toggleMic}
              disabled={isThinking || isGenerating}
              className={`w-full flex items-center justify-center gap-3 py-3.5 sm:py-4 rounded-2xl font-bold text-base transition-all active:scale-[0.98] disabled:opacity-40 shadow-md cursor-pointer ${
                isListening
                  ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30 animate-pulse'
                  : 'bg-teal-600 hover:bg-teal-700 text-white shadow-teal-700/20'
              }`}
            >
              {isListening ? (
                <>
                  <MicOff className="w-5 h-5" />
                  <span>{ui.listening}</span>
                </>
              ) : (
                <>
                  <Mic className="w-5 h-5" />
                  <span>{ui.tap}</span>
                </>
              )}
            </button>
          )}

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-[11px] text-slate-400 font-medium">{OR_LABEL[lang]}</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          {/* Quick text input option */}
          <form
            onSubmit={e => { e.preventDefault(); if (textInput.trim()) sendAnswer(textInput.trim()); }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={textInput}
              onChange={e => setTextInput(e.target.value)}
              placeholder={hasMic ? (lang === 'hi' ? 'या यहाँ उत्तर लिखें…' : lang === 'mr' ? 'किंवा येथे उत्तर लिहा…' : 'or type your response…') : ui.noMic}
              disabled={isThinking || isGenerating}
              className="flex-1 border border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-100 transition disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!textInput.trim() || isThinking || isGenerating}
              className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-sm disabled:opacity-40 transition active:scale-95 cursor-pointer shadow-xs"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

          {/* Manual complete after 6+ questions */}
          {questionCount >= 6 && (
            <button
              type="button"
              onClick={() => finalizeReport(history)}
              disabled={isGenerating || isThinking}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition disabled:opacity-40 cursor-pointer"
            >
              {ui.complete}
            </button>
          )}

          {/* Privacy note */}
          <p className="text-center text-slate-400 text-xs flex items-center justify-center gap-1.5 pt-0.5">
            <Shield className="w-3.5 h-3.5 text-teal-600 shrink-0" />
            {ui.privacyNote}
          </p>
        </footer>
      )}

      {/* Upload Past Records Modal */}
      {showDocUploadModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Paperclip className="w-5 h-5 text-teal-600" />
                <h3 className="text-base font-extrabold text-slate-900">
                  {lang === 'hi' ? 'पूर्व पर्ची या लैब रिपोर्ट अपलोड करें' : lang === 'mr' ? 'मागील प्रिस्क्रिप्शन किंवा लॅब अहवाल अपलोड करा' : 'Attach Past Prescription or Lab Report'}
                </h3>
              </div>
              <button onClick={() => { setShowDocUploadModal(false); setDocUploadSuccess(null); }} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 mb-4">
              {lang === 'hi'
                ? 'अपनी पिछली डॉक्टर की पर्ची या टेस्ट रिपोर्ट की फोटो या PDF अपलोड करें। AI इसमें से दवाइयां और टेस्ट पढ़कर आपकी अंतिम रिपोर्ट में जोड़ देगा।'
                : 'Upload a photo or document of your previous doctor prescription or diagnostic report. AI will automatically extract your medications, past diagnoses, and labs, and include them in your consultation summary.'}
            </p>

            {/* Drag and drop or file select */}
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-teal-200 hover:border-teal-400 bg-teal-50/40 hover:bg-teal-50/70 transition-all rounded-2xl p-6 cursor-pointer text-center group">
              <UploadCloud className="w-10 h-10 text-teal-500 group-hover:scale-110 transition-transform mb-2" />
              <span className="text-sm font-bold text-slate-700">Click to browse or drop document</span>
              <span className="text-[11px] text-slate-400 mt-1">Supports JPG, PNG, WEBP, PDF (Max 10MB)</span>
              <input
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                disabled={uploadingDoc}
                onChange={(e) => {
                  if (e.target.files?.[0]) handleDocumentUpload(e.target.files[0]);
                }}
              />
            </label>

            {uploadingDoc && (
              <div className="mt-4 p-4 bg-teal-50 border border-teal-200 rounded-xl flex items-center justify-center gap-3 text-xs font-bold text-teal-800 animate-pulse">
                <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
                <span>Extracting medical history, prescriptions & lab tests...</span>
              </div>
            )}

            {docUploadError && (
              <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{docUploadError}</span>
              </div>
            )}

            {docUploadSuccess && (
              <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Document Extracted Successfully!</span>
                </div>
                {docUploadSuccess.diagnoses?.length > 0 && (
                  <div className="text-xs text-slate-700">
                    <span className="font-bold text-slate-800">Diagnoses: </span>
                    {docUploadSuccess.diagnoses.map((d, idx) => (
                      <span key={idx} className="inline-block bg-white border border-emerald-200 text-emerald-800 px-2 py-0.5 rounded-md text-[11px] font-semibold mr-1.5 mt-1">
                        {d.condition || d}
                      </span>
                    ))}
                  </div>
                )}
                {docUploadSuccess.medications?.length > 0 && (
                  <div className="text-xs text-slate-700">
                    <span className="font-bold text-slate-800">Medications: </span>
                    {docUploadSuccess.medications.map((m, idx) => (
                      <span key={idx} className="inline-block bg-white border border-indigo-200 text-indigo-800 px-2 py-0.5 rounded-md text-[11px] font-semibold mr-1.5 mt-1">
                        {m.name || m} {m.dosage ? `(${m.dosage})` : ''}
                      </span>
                    ))}
                  </div>
                )}
                {docUploadSuccess.labs?.length > 0 && (
                  <div className="text-xs text-slate-700">
                    <span className="font-bold text-slate-800">Labs: </span>
                    {docUploadSuccess.labs.map((l, idx) => (
                      <span key={idx} className="inline-block bg-white border border-teal-200 text-teal-800 px-2 py-0.5 rounded-md text-[11px] font-semibold mr-1.5 mt-1">
                        {l.test}: {l.value}
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-[11px] text-emerald-700 font-medium pt-1">
                  ✓ This information is now linked to your session and will appear in your clinical summary.
                </p>
              </div>
            )}

            {/* List of existing uploaded documents */}
            {uploadedDocs.length > 0 && (
              <div className="mt-4 pt-3 border-t border-slate-100">
                <p className="text-xs font-bold text-slate-700 mb-2">Attached Records ({uploadedDocs.length}):</p>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {uploadedDocs.map((doc, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                      <div className="flex items-center gap-2 truncate">
                        <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-medium text-slate-800 truncate">
                          Record #{idx + 1} ({doc.medications?.length || 0} meds, {doc.labs?.length || 0} labs)
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 shrink-0">Attached</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => { setShowDocUploadModal(false); setDocUploadSuccess(null); }}
                className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
              >
                Done & Return to Consultation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Server API Configuration Modal */}
      <ServerConfigModal
        isOpen={showServerModal}
        onClose={() => setShowServerModal(false)}
        onServerSaved={() => {
          setConnectionError(null);
          setInitialized(false);
        }}
      />
    </div>
  );
};

export default VoiceIntake;

