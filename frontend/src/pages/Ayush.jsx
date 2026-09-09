import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, ChevronRight, CheckCircle2, AlertCircle, RefreshCw, Volume2, VolumeX } from 'lucide-react';

import { useGlobalState } from '../context/GlobalStateContext';
import { evaluateVoiceMatch } from '../utils/voiceMatcher';

const Ayush = () => {
  const navigate = useNavigate();
  const { globalState, updateState } = useGlobalState();
  const sessionId = sessionStorage.getItem('session_id');
  const pendingComplaint = sessionStorage.getItem('pending_complaint') || 'abdominal-pain';

  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Voice Input States
  const [isMuted, setIsMuted] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [noMatchFound, setNoMatchFound] = useState(false);
  const [voiceFeedbackMsg, setVoiceFeedbackMsg] = useState("");
  const watchdogTimerRef = useRef(null);
  const recognitionRef = useRef(null);

  // Check if already completed
  const [isAlreadyComplete, setIsAlreadyComplete] = useState(false);

  const lang = globalState.language || 'en';
  const i18n = {
    // ─── Prakriti Questions ───
    "How would you describe your body frame?": { hi: "आप अपने शरीर की बनावट का वर्णन कैसे करेंगे?" },
    "Thin, light, prominent joints":            { hi: "पतला, हल्का, प्रमुख जोड़" },
    "Medium build, good muscle development":    { hi: "मध्यम बनावट, मांसपेशियों का अच्छा विकास" },
    "Large, solid, sturdy frame":               { hi: "बड़ा, ठोस, मजबूत शरीर" },

    "What is your skin type like?":             { hi: "आपकी त्वचा (Skin) कैसी है?" },
    "Dry, rough, cool to touch":                { hi: "रूखी, खुरदरी, और छूने में ठंडी" },
    "Warm, prone to acne/freckles, sensitive":  { hi: "गर्म, मुंहासे होने वाली, और संवेदनशील" },
    "Thick, oily, smooth, cool":                { hi: "मोटी, तैलीय (Oily), मुलायम, और ठंडी" },

    "How is your hair?":                        { hi: "आपके बाल कैसे हैं?" },
    "Dry, brittle, sparse":                     { hi: "रूखे, कमजोर, और कम बाल" },
    "Fine, prone to early graying or thinning": { hi: "पतले, जल्दी सफेद होने वाले या झड़ने वाले" },
    "Thick, lustrous, wavy or curly":           { hi: "घने, चमकदार, लहरदार या घुंघराले" },

    "How do you respond to weather?":           { hi: "मौसम का आप पर क्या असर होता है?" },
    "Dislike cold and dry weather":             { hi: "ठंडा और सूखा मौसम नापसंद है" },
    "Dislike heat and direct sun":              { hi: "गर्मी और सीधी धूप नापसंद है" },
    "Dislike cold, damp, humid weather":        { hi: "ठंडा, सीलन भरा, और उमस वाला मौसम नापसंद है" },

    "How is your sleep pattern?":              { hi: "आपकी नींद कैसी है?" },
    "Light, interrupted, less hours":          { hi: "हल्की नींद, बार-बार टूटने वाली, कम घंटे" },
    "Sound, medium duration, feel rested":     { hi: "गहरी नींद, सामान्य घंटे, उठने पर ताजगी महसूस होती है" },
    "Deep, heavy, prolonged":                  { hi: "बहुत गहरी और लंबी नींद" },

    "What is your typical energy level?":      { hi: "शरीर में ऊर्जा (Energy) का स्तर कैसा रहता है?" },
    "Comes in bursts, tire easily":            { hi: "रुक-रुक कर ऊर्जा आती है, जल्दी थक जाते हैं" },
    "Moderate, sustained, intense":            { hi: "संतुलित ऊर्जा जो लगातार बनी रहती है" },
    "Steady, strong, long-lasting endurance":  { hi: "मजबूत और लंबे समय तक टिकने वाली ऊर्जा" },

    "How do you make decisions?":              { hi: "आप निर्णय कैसे लेते हैं?" },
    "Quickly but change mind easily":          { hi: "जल्दी निर्णय लेते हैं पर आसानी से बदल भी देते हैं" },
    "Clear, precise, analytical":              { hi: "स्पष्ट और सोच-समझकर" },
    "Slowly, after careful consideration":     { hi: "धीरे-धीरे, बहुत सोच-विचार के बाद" },

    "How is your memory?":                     { hi: "आपकी याददाश्त कैसी है?" },
    "Learn quickly, forget quickly":           { hi: "जल्दी सीखते हैं, जल्दी भूल जाते हैं" },
    "Sharp, clear, remember what's important": { hi: "तेज याददाश्त, जरूरी बातें याद रहती हैं" },
    "Slow to learn but never forget":          { hi: "सीखने में समय लगता है पर कभी नहीं भूलते" },

    "How do you handle stress?":              { hi: "आप तनाव (Stress) को कैसे संभालते हैं?" },
    "Prone to worry, anxiety, fear":          { hi: "चिंता, घबराहट और डर जल्दी लगता है" },
    "Prone to irritability, anger, frustration": { hi: "चिड़चिड़ापन और गुस्सा जल्दी आता है" },
    "Remain calm, but may withdraw or become stubborn": { hi: "शांत रहते हैं, पर कभी-कभी जिद्दी हो जाते हैं" },

    "What is your communication style like?": { hi: "आपके बात करने का तरीका कैसा है?" },
    "Fast, talkative, occasionally scattered": { hi: "तेज, बहुत बोलने वाले, कभी-कभी विषय से भटकने वाले" },
    "Direct, clear, sometimes argumentative":  { hi: "सीधी और स्पष्ट बात, कभी-कभी बहस करने वाले" },
    "Slow, methodical, comforting":            { hi: "धीमी, सोच-समझकर और आराम से बात करने वाले" },

    // ─── Agni Questions ───
    "How would you describe your appetite?":   { hi: "आपकी भूख कैसी है?" },
    "Variable – sometimes hungry, sometimes not":                   { hi: "बदलती रहती है — कभी भूख लगती है, कभी नहीं" },
    "Intense – must eat on time, cannot tolerate skipping meals":   { hi: "बहुत तेज — समय पर खाना चाहिए, भूखे नहीं रह सकते" },
    "Mild – can easily skip meals, not very hungry in mornings":    { hi: "हल्की — आसानी से खाना छोड़ सकते हैं, सुबह ज्यादा भूख नहीं लगती" },
    "Regular – moderate hunger at regular times":                   { hi: "नियमित — समय पर सामान्य भूख लगती है" },

    "How well do you digest food?":            { hi: "आपका खाना कितनी अच्छी तरह पचता है?" },
    "Irregularly – prone to bloating and gas": { hi: "अनियमित — गैस और पेट फूलने की समस्या होती है" },
    "Quickly – prone to acidity or heartburn": { hi: "जल्दी — एसिडिटी या सीने में जलन होती है" },
    "Slowly – feel heavy or lethargic after eating": { hi: "धीरे-धीरे — खाने के बाद भारीपन या आलस लगता है" },
    "Well – digest food without any issues":   { hi: "अच्छी तरह — बिना किसी परेशानी के खाना पच जाता है" },

    "How often do you experience digestive discomfort?": { hi: "आपको पेट से जुड़ी परेशानी कितनी बार होती है?" },
    "Frequently (bloating/gas)":              { hi: "अक्सर (पेट फूलना या गैस)" },
    "Frequently (acid reflux/burning)":       { hi: "अक्सर (एसिडिटी या सीने में जलन)" },
    "Frequently (heaviness/sluggishness)":    { hi: "अक्सर (भारीपन या आलस)" },
    "Rarely":                                  { hi: "बहुत कम" },

    "How do you feel after a heavy meal?":    { hi: "भारी खाना खाने के बाद आपको कैसा महसूस होता है?" },
    "Uncomfortable, bloated":                 { hi: "असहज और पेट फूला हुआ" },
    "Hungry again relatively soon":           { hi: "थोड़ी देर में फिर भूख लग जाती है" },
    "Very tired, sleepy, sluggish":           { hi: "बहुत थका हुआ, नींद या आलस आता है" },
    "Satisfied and energetic":                { hi: "संतुष्ट और ऊर्जावान महसूस होता है" },

    // ─── Koshtha Questions ───
    "How are your bowel movements generally?": { hi: "आपका पेट सामान्यतः कैसे साफ होता है?" },
    "Irregular, tend towards constipation, hard stools": { hi: "अनियमित, कब्ज रहता है, मल कड़ा होता है" },
    "Loose, frequent, easy to pass":          { hi: "पतला, बार-बार, और आसानी से साफ होता है" },
    "Regular, well-formed, once or twice daily": { hi: "नियमित, दिन में एक या दो बार अच्छे से साफ होता है" },

    "How does diet affect your bowels?":      { hi: "खान-पान का आपके पेट पर क्या असर पड़ता है?" },
    "Need high fiber or warm liquids to avoid constipation": { hi: "कब्ज से बचने के लिए फाइबर या गर्म तरल पदार्थ चाहिए" },
    "Even mild laxatives or spicy food can cause loose stools": { hi: "हल्का तीखा या मसालेदार खाने से भी दस्त लग जाते हैं" },
    "Generally unaffected, handle most foods well": { hi: "कोई खास असर नहीं, सब कुछ पच जाता है" },

    "How often do you clear your bowels?":    { hi: "आप दिन में कितनी बार पेट साफ (शौच) करने जाते हैं?" },
    "Sometimes skip a day or have difficulty": { hi: "कभी-कभी एक दिन छूट जाता है या परेशानी होती है" },
    "More than twice a day easily":           { hi: "दिन में दो बार से ज्यादा, आसानी से" },
    "Consistently 1-2 times a day":           { hi: "नियमित रूप से दिन में 1-2 बार" },
  };

  const normalizeKey = (key) => {
    if (!key || typeof key !== 'string') return key;
    return key
      .replace(/â€“|â€”|â€"|â€/g, '–') // Fix mojibake en-dash / em-dash fragments
      .replace(/\u2014/g, '–')          // Normalize em-dash to en-dash
      .trim();
  };

  const getTranslated = (str) => {
    if (lang === 'en' || !str) return str;
    if (i18n[str]?.[lang]) return i18n[str][lang];

    const normalized = normalizeKey(str);
    if (i18n[normalized]?.[lang]) return i18n[normalized][lang];

    const hyphenated = normalized.replace(/–/g, '-');
    for (const [k, v] of Object.entries(i18n)) {
      if (normalizeKey(k) === normalized || normalizeKey(k).replace(/–/g, '-') === hyphenated) {
        return v[lang] || str;
      }
    }
    return str;
  };

  useEffect(() => {
    if (!sessionId) {
      navigate('/');
      return;
    }
    if (sessionStorage.getItem('ayush_completed') === 'true') {
      setIsAlreadyComplete(true);
    }
  }, [sessionId, navigate]);

  useEffect(() => {
    if (isAlreadyComplete) {
      setLoading(false);
      return;
    }
    // Fetch questions
    fetch('http://localhost:8000/api/ayush/questions')
      .then((res) => res.json())
      .then((data) => {
        if (data.sections) {
          const flatQs = data.sections.flatMap(sec => sec.questions);
          setQuestions(flatQs);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch questions:", err);
        setError("Network error fetching questions.");
        setLoading(false);
      });
  }, [isAlreadyComplete]);

  const [fallbackMsg, setFallbackMsg] = useState("");
  const [pendingVoiceMatch, setPendingVoiceMatch] = useState(null); // { mapped_to }
  const undoTimerRef = useRef(null);

  useEffect(() => {
    if (!loading && !isAlreadyComplete && !result && questions.length > 0 && !isMuted) {
      window.speechSynthesis.cancel();
      const currentQ = questions[currentIndex];
      const text = currentQ ? getTranslated(currentQ.question_text) : "";
      const utterance = new SpeechSynthesisUtterance(text);
      
      let targetLang = lang === 'hi' ? 'hi-IN' : (lang === 'mr' ? 'mr-IN' : 'en-IN');
      setFallbackMsg("");

      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        const hasTarget = voices.some(v => v.lang.startsWith(targetLang.slice(0, 2)));
        if (!hasTarget) {
          if (targetLang === 'mr-IN' && voices.some(v => v.lang.startsWith('hi'))) {
            targetLang = 'hi-IN';
            setFallbackMsg("Playing in Hindi voice (Marathi voice not available on this device)");
          } else if (targetLang !== 'en-IN' && targetLang !== 'en-US') {
            targetLang = 'en-US';
            setFallbackMsg("Playing in default voice (Regional voice not available on this device)");
          }
        }
      }

      utterance.lang = targetLang;
      utterance.onend = () => setFallbackMsg("");
      window.speechSynthesis.speak(utterance);
    }
    // Clear transcript and watchdog on new question
    setTranscript("");
    setNoMatchFound(false);
    setVoiceFeedbackMsg("");
    if (watchdogTimerRef.current) clearTimeout(watchdogTimerRef.current);
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch (e) {}
    }
  }, [currentIndex, loading, isAlreadyComplete, result, questions, isMuted]);

  // Clean up timers and audio recognition on unmount
  useEffect(() => {
    return () => {
      if (watchdogTimerRef.current) clearTimeout(watchdogTimerRef.current);
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (e) {}
      }
    };
  }, []);

  const startListening = () => {
    console.log('[STT] Mic button clicked — starting recognition immediately');
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice input is not supported in this browser.");
      return;
    }

    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch (e) {}
    }
    if (watchdogTimerRef.current) clearTimeout(watchdogTimerRef.current);

    // 1. Instant activation visual state before onstart fires
    setIsListening(true);
    setTranscript("");
    setNoMatchFound(false);
    setVoiceFeedbackMsg("");

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    const currentLang = globalState.language || 'en';
    recognition.lang = currentLang === 'hi' || currentLang === 'mr' ? 'hi-IN' : 'en-IN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    // 2. 4-Second Watchdog Timer
    watchdogTimerRef.current = setTimeout(() => {
      console.log('[STT] 4-second watchdog timeout: no speech result captured');
      try {
        recognition.stop();
      } catch (err) {}
      setIsListening(false);
      setNoMatchFound(true);
      setVoiceFeedbackMsg(lang === 'hi' 
        ? "आवाज सुनाई नहीं दी — पुनः प्रयास करें या विकल्प पर टैप करें" 
        : "Didn't catch that — try again or tap an option");
    }, 4000);

    recognition.onstart = () => {
      console.log('[STT] recognition.onstart fired — microphone is actively capturing audio');
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      if (watchdogTimerRef.current) clearTimeout(watchdogTimerRef.current);
      setIsListening(false);

      const speechResult = event.results[0][0].transcript.toLowerCase().trim();
      console.log('[STT] onresult fired — raw transcript:', speechResult);
      setTranscript(speechResult);

      const currentQ = questions[currentIndex];
      const matchResult = evaluateVoiceMatch(
        speechResult,
        currentQ?.options || [],
        opt => getTranslated(opt.text || opt.label || "")
      );

      console.log('[STT] Voice evaluation result:', matchResult);

      if (matchResult.status === 'matched') {
        setVoiceFeedbackMsg("");
        setNoMatchFound(false);
        handleVoiceMatch(matchResult.match.maps_to);
      } else if (matchResult.status === 'ambiguous') {
        setNoMatchFound(true);
        setVoiceFeedbackMsg(lang === 'hi'
          ? "एकाधिक विकल्पों से मेल खा रहा है — कृपया अपनी पसंद के विकल्प पर सीधे टैप करें।"
          : "Multiple options match — please tap your preferred option directly.");
      } else {
        setNoMatchFound(true);
        setVoiceFeedbackMsg(lang === 'hi'
          ? "कोई स्पष्ट विकल्प नहीं मिला — कृपया पुनः बोलें या विकल्प पर टैप करें।"
          : "No confident match found. Please tap the closest option.");
      }
    };

    recognition.onerror = (event) => {
      console.error('[STT] recognition.onerror:', event.error, '— full event:', event);
      if (watchdogTimerRef.current) clearTimeout(watchdogTimerRef.current);
      setIsListening(false);
      if (event.error === 'no-speech') {
        setNoMatchFound(true);
        setVoiceFeedbackMsg(lang === 'hi'
          ? "आवाज सुनाई नहीं दी — पुनः प्रयास करें या विकल्प पर टैप करें"
          : "Didn't catch that — try again or tap an option");
      }
    };

    recognition.onend = () => {
      console.log('[STT] recognition.onend fired');
      if (watchdogTimerRef.current) clearTimeout(watchdogTimerRef.current);
      setIsListening(false);
    };

    try {
      recognition.start();
    } catch (e) {
      console.error('[STT] Failed to start recognition:', e);
      setIsListening(false);
    }
  };

  // Submit assessment to backend
  const submitAssessment = (overrideAnswers) => {
    setSubmitting(true);
    setError(null);
    const answersToSend = overrideAnswers || answers;
    console.log('[AYUSH] Submitting assessment with answers count:', answersToSend.length);
    fetch('http://localhost:8000/api/ayush/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId, answers: answersToSend })
    })
      .then(res => {
        if (!res.ok) throw new Error("Server rejected submission");
        return res.json();
      })
      .then(data => {
        setResult(data);
        sessionStorage.setItem('ayush_completed', 'true');
        updateState({ ayush_result: data });
        setSubmitting(false);
      })
      .catch(err => {
        console.error("Submission failed:", err);
        setError("Failed to submit assessment. Please try again.");
        setSubmitting(false);
      });
  };

  // Called by tap — immediate selection, 300ms auto-advance
  const handleSelectOption = (mapped_to) => {
    // Cancel any pending voice undo window
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }
    setPendingVoiceMatch(null);

    const currentQ = questions[currentIndex];
    const newAnswers = [...answers];
    const existingIndex = newAnswers.findIndex(a => a.question_id === currentQ.question_id);
    if (existingIndex >= 0) {
      newAnswers[existingIndex] = { question_id: currentQ.question_id, mapped_to };
    } else {
      newAnswers.push({ question_id: currentQ.question_id, mapped_to });
    }
    setAnswers(newAnswers);
    updateState({ ayush_answers: newAnswers });

    setTimeout(() => {
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        // Last question answered! Auto-submit immediately
        submitAssessment(newAnswers);
      }
    }, 300);
  };

  // Called by voice match — highlight option, show Undo button for 2 seconds
  const handleVoiceMatch = (mapped_to) => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);

    const currentQ = questions[currentIndex];
    const newAnswers = [...answers];
    const existingIndex = newAnswers.findIndex(a => a.question_id === currentQ.question_id);
    if (existingIndex >= 0) {
      newAnswers[existingIndex] = { question_id: currentQ.question_id, mapped_to };
    } else {
      newAnswers.push({ question_id: currentQ.question_id, mapped_to });
    }
    setAnswers(newAnswers);
    updateState({ ayush_answers: newAnswers });
    setPendingVoiceMatch({ mapped_to });

    // Auto-advance after 2 seconds unless user hits Undo
    undoTimerRef.current = setTimeout(() => {
      setPendingVoiceMatch(null);
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        // Last question voice match confirmed! Auto-submit
        submitAssessment(newAnswers);
      }
    }, 2000);
  };

  // Undo — cancel the pending advance and remove the answer
  const handleUndoVoiceMatch = () => {
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }
    setPendingVoiceMatch(null);
    // Remove the answer that was just voice-selected
    const currentQ = questions[currentIndex];
    setAnswers(prev => prev.filter(a => a.question_id !== currentQ.question_id));
    setTranscript("");
    setNoMatchFound(false);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 font-sans text-slate-800">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
        <p className="text-sm font-bold tracking-wider uppercase text-slate-500">Loading AYUSH Module...</p>
      </div>
    );
  }

  if (isAlreadyComplete && !result && !error) {
    return (
      <div className="flex flex-col items-center flex-1 font-sans p-6 text-slate-800 justify-center">
        <div className="bg-white p-8 rounded-2xl shadow text-center max-w-md w-full">
          <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-4">AYUSH Assessment Complete</h2>
          <p className="text-slate-600 mb-8">You have already completed this section for the current visit.</p>
          <div className="space-y-3">
            <button 
              onClick={() => navigate(`/intake?complaint=${pendingComplaint}`)}
              className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition"
            >
              Continue to Medical Intake
            </button>
            <button 
              onClick={() => {
                sessionStorage.removeItem('ayush_completed');
                setIsAlreadyComplete(false);
                setLoading(true);
              }}
              className="w-full bg-slate-100 text-slate-600 font-bold py-3 rounded-xl hover:bg-slate-200 transition"
            >
              Redo Assessment
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (result) {
    const dom = result.result.dominant;
    return (
      <div className="flex flex-col items-center flex-1 font-sans p-6 text-slate-800">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 text-center mt-12 animate-fade-in">
          <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-slate-800 mb-6">Profile Computed</h1>
          
          <div className="space-y-6 mb-8">
            <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
              <p className="text-sm text-orange-600 font-semibold uppercase tracking-wider mb-1">Prakriti</p>
              <p className="text-xl font-bold text-orange-900">{dom.Prakriti?.join(', ') || 'Unknown'}</p>
            </div>
            <div className="bg-red-50 p-4 rounded-xl border border-red-100">
              <p className="text-sm text-red-600 font-semibold uppercase tracking-wider mb-1">Agni</p>
              <p className="text-xl font-bold text-red-900">{dom.Agni?.join(', ') || 'Unknown'}</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
              <p className="text-sm text-blue-600 font-semibold uppercase tracking-wider mb-1">Koshtha</p>
              <p className="text-xl font-bold text-blue-900">{dom.Koshtha?.join(', ') || 'Unknown'}</p>
            </div>
          </div>
          
          <button 
            onClick={() => navigate(`/intake?complaint=${pendingComplaint}`)}
            className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl hover:bg-indigo-700 transition flex justify-center items-center active:scale-95 shadow-md"
          >
            Next: Medical Intake <ChevronRight className="w-5 h-5 ml-2" />
          </button>
        </div>
      </div>
    );
  }

  if (error && !submitting && currentIndex === questions.length - 1) {
    // If error on submit
    return (
      <div className="flex flex-col items-center flex-1 justify-center p-6">
         <div className="bg-red-50 p-6 rounded-2xl border border-red-200 text-center max-w-md w-full">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-red-800 mb-2">Submission Failed</h2>
            <p className="text-red-600 mb-6">{error}</p>
            <button onClick={submitAssessment} className="bg-red-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-red-700 transition flex mx-auto items-center">
              <RefreshCw className="w-4 h-4 mr-2" /> Retry Submission
            </button>
         </div>
      </div>
    );
  }

  if (questions.length === 0 && !loading) {
    return (
      <div className="flex items-center justify-center flex-1 text-center flex-col">
        {error ? <p className="text-red-500 font-bold mb-4">{error}</p> : <p>No questions found.</p>}
        {error && <button onClick={() => window.location.reload()} className="bg-slate-200 px-4 py-2 rounded font-bold">Retry Load</button>}
      </div>
    );
  }

  const isCompleted = currentIndex === questions.length - 1 && answers.length === questions.length;
  const currentQ = questions[currentIndex];
  const currentAnswer = answers.find(a => a.question_id === currentQ?.question_id);
  
  const displayQuestionText = currentQ ? getTranslated(currentQ.question_text) : "";

  return (
    <div className="flex flex-col flex-1 font-sans text-slate-800 relative bg-white md:bg-transparent">
      {/* Subtle AYUSH botanical watermark (3.5% opacity, non-interactive) */}
      <div className="fixed inset-0 pointer-events-none select-none flex items-center justify-center opacity-[0.035] z-0 overflow-hidden" aria-hidden="true">
        <svg className="w-[520px] h-[520px] text-amber-900" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
          <path d="M12 2C6.5 2 2 6.5 2 12c0 5 3.5 9.2 8.2 9.9.2-2.1.8-4.5 2-6.5.6-.9 1.3-1.8 2.1-2.5 1.2-1.1 2.6-1.9 4-2.4C18.6 6.1 15.6 2 12 2z"/>
          <path d="M12 22c5.5 0 10-4.5 10-10 0-1.2-.2-2.3-.6-3.4-1.4.5-2.8 1.3-4 2.4-.8.7-1.5 1.6-2.1 2.5-1.2 2-1.8 4.4-2 6.5h-1.3z"/>
        </svg>
      </div>

      {/* Progress Bar inside Content with Saffron-to-Emerald AYUSH gradient */}
      <div className="w-full bg-slate-200 h-1.5 absolute top-0 left-0">
        <div 
          className="bg-gradient-to-r from-amber-500 via-orange-400 to-emerald-600 h-1.5 transition-all duration-300 ease-out"
          style={{ width: `${((currentIndex) / questions.length) * 100}%` }}
        />
      </div>

      <div className="flex-1 w-full max-w-md mx-auto p-6 pt-16 flex flex-col justify-center relative z-10">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
              AYUSH Triage
            </span>
            <span className="text-xs font-bold text-emerald-800 tracking-wider">
              QUESTION {currentIndex + 1} OF {questions.length}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-start gap-3">
              <button 
                onClick={() => {
                  window.speechSynthesis.cancel();
                  const u = new SpeechSynthesisUtterance(displayQuestionText);
                  let targetLang = lang === 'hi' ? 'hi-IN' : (lang === 'mr' ? 'mr-IN' : 'en-IN');
                  setFallbackMsg("");

                  const voices = window.speechSynthesis.getVoices();
                  if (voices.length > 0) {
                    const hasTarget = voices.some(v => v.lang.startsWith(targetLang.slice(0, 2)));
                    if (!hasTarget) {
                      if (targetLang === 'mr-IN' && voices.some(v => v.lang.startsWith('hi'))) {
                        targetLang = 'hi-IN';
                        setFallbackMsg("Playing in Hindi voice (Marathi voice not available on this device)");
                      } else if (targetLang !== 'en-IN' && targetLang !== 'en-US') {
                        targetLang = 'en-US';
                        setFallbackMsg("Playing in default voice (Regional voice not available on this device)");
                      }
                    }
                  }

                  u.lang = targetLang;
                  u.onend = () => setFallbackMsg("");
                  window.speechSynthesis.speak(u);
                }}
                className="mt-1 p-2 bg-amber-100 text-amber-800 rounded-full hover:bg-amber-200 transition shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center border border-amber-200"
                aria-label="Read question aloud"
              >
                <Volume2 className="w-5 h-5" />
              </button>
              <h2 className="text-2xl font-bold text-slate-900 leading-tight">
                {displayQuestionText}
              </h2>
            </div>
            {fallbackMsg && (
              <div className="mt-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 p-2 rounded-lg">
                {fallbackMsg}
              </div>
            )}
          </div>
        </div>

        {/* Voice Match Undo Banner */}
        {pendingVoiceMatch && (
          <div className="mb-4 flex items-center justify-between bg-green-50 border border-green-300 rounded-xl p-3 animate-pulse">
            <div className="flex items-center gap-2 text-green-800">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span className="text-sm font-semibold">Voice match selected — advancing in 2s</span>
            </div>
            <button
              onClick={handleUndoVoiceMatch}
              className="ml-4 shrink-0 bg-white border border-red-300 text-red-600 font-bold text-sm px-3 py-1.5 rounded-lg hover:bg-red-50 active:scale-95 transition min-h-[44px]"
            >
              Undo
            </button>
          </div>
        )}

        <div className="space-y-3 mb-24">
          {currentQ?.options?.map((opt, i) => {
            const isSelected = currentAnswer?.mapped_to === opt.maps_to;
            const isPendingVoice = pendingVoiceMatch?.mapped_to === opt.maps_to;
            return (
              <button
                key={i}
                onClick={() => handleSelectOption(opt.maps_to)}
                className={`w-full p-4 rounded-xl text-left transition-all duration-200 border-2 active:scale-[0.98]
                  ${isPendingVoice
                    ? 'border-green-500 bg-green-50 text-green-900 shadow-md ring-2 ring-green-300'
                    : isSelected
                    ? 'border-teal-600 bg-teal-50/70 text-teal-950 shadow-sm ring-1 ring-teal-200'
                    : 'border-slate-200 bg-white hover:border-amber-300 hover:bg-amber-50/20 text-slate-700'
                  }`}
              >
                {getTranslated(opt.text)}
              </button>
            )
          })}
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 w-full bg-white border-t border-slate-200 p-4 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        
        {/* Instant Visual Listening Indicator */}
        {isListening && (
          <div className="max-w-md mx-auto mb-3 p-3 bg-red-50 border border-red-300 rounded-xl flex items-center justify-between animate-pulse shadow-sm">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
              </span>
              <span className="text-sm font-bold text-red-700">
                {lang === 'hi' ? 'सुन रहे हैं... कृपया अब बोलें' : 'Listening... Speak now'}
              </span>
            </div>
            <span className="text-xs font-semibold text-red-600 bg-red-100 px-2 py-0.5 rounded-md">
              {lang === 'hi' ? '4s टाइमआउट' : '4s timer'}
            </span>
          </div>
        )}

        {/* Transcript & Feedback Area */}
        {(transcript || voiceFeedbackMsg) && !isListening && (
          <div className="max-w-md mx-auto mb-4 p-3 bg-slate-50 border border-slate-200 rounded-xl">
            {transcript && <p className="text-sm italic text-slate-600">"{transcript}"</p>}
            {voiceFeedbackMsg && (
              <p className="text-xs text-amber-700 font-bold mt-1">
                {voiceFeedbackMsg}
              </p>
            )}
          </div>
        )}

        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex gap-2">
            <button 
              className={`p-3 rounded-full transition-all active:scale-95 flex items-center justify-center ${isListening ? 'bg-red-500 text-white shadow-lg ring-4 ring-red-200 animate-pulse' : 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200'}`}
              title="Speak Answer"
              onClick={startListening}
              disabled={isListening}
            >
              <Mic className="w-6 h-6" />
            </button>
            <button 
              className="p-3 bg-slate-100 text-slate-500 rounded-full hover:bg-slate-200 transition-colors active:scale-95 flex items-center justify-center"
              onClick={() => {
                setIsMuted(!isMuted);
                window.speechSynthesis.cancel();
              }}
              title={isMuted ? "Unmute TTS" : "Mute TTS"}
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
          </div>
          
          <div className="flex gap-2">
            {currentIndex > 0 && (
              <button 
                onClick={() => setCurrentIndex(currentIndex - 1)}
                className="px-6 py-3 font-semibold text-slate-600 bg-slate-100 rounded-xl active:scale-95 hover:bg-slate-200 transition"
              >
                Back
              </button>
            )}
            
            {currentIndex === questions.length - 1 ? (
              <button
                onClick={() => submitAssessment()}
                disabled={submitting || !currentAnswer}
                className="px-8 py-3 font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-md flex items-center transition cursor-pointer"
              >
                {submitting ? 'Scoring...' : 'Finish Assessment'}
                {!submitting && <CheckCircle2 className="w-5 h-5 ml-2" />}
              </button>
            ) : (
              <button
                onClick={() => setCurrentIndex(currentIndex + 1)}
                disabled={!currentAnswer}
                className="px-8 py-3 font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 active:scale-95 disabled:opacity-50 shadow-md flex items-center transition"
              >
                Next <ChevronRight className="w-5 h-5 ml-1" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Ayush;
