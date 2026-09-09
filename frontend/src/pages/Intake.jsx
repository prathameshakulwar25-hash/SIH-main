import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Mic, ChevronRight, CheckCircle2, AlertCircle, RefreshCw, AlertTriangle, Volume2, VolumeX } from 'lucide-react';

import { useGlobalState } from '../context/GlobalStateContext';
import { evaluateVoiceMatch } from '../utils/voiceMatcher';
import { API_BASE } from '../config/api';

// Module-level dictionary — available inside useEffect for auto-TTS
const INTAKE_I18N = {
  "How did the pain start?":                         { hi: "दर्द कैसे शुरू हुआ?" },
  "Suddenly (Seconds to minutes)":                   { hi: "अचानक (कुछ ही सेकंड या मिनटों में)" },
  "Gradually (Hours to days)":                       { hi: "धीरे-धीरे (कुछ घंटों या दिनों में)" },
  "How would you describe the pain?":                { hi: "दर्द कैसा महसूस हो रहा है?" },
  "Crushing / Pressure / Squeezing":                 { hi: "भारी दबाव या सीना दबने जैसा" },
  "Sharp / Stabbing":                                { hi: "तेज या चुभन जैसा" },
  "Burning":                                         { hi: "जलन जैसा" },
  "Dull / Aching":                                   { hi: "हल्का लेकिन लगातार दर्द" },
  "Tearing / Ripping":                               { hi: "कुछ फटने या चीरने जैसा" },
  "Cramping":                                        { hi: "मरोड़ या ऐंठन जैसा" },
  "Does the pain radiate or move anywhere else?":    { hi: "क्या दर्द कहीं और भी फैल रहा है?" },
  "Nowhere":                                         { hi: "कहीं नहीं" },
  "To the Arm or Jaw":                               { hi: "हाथ या जबड़े की तरफ" },
  "To the Back":                                     { hi: "पीठ की तरफ" },
  "To the Right Shoulder":                           { hi: "दाहिने कंधे की तरफ" },
  "To the Groin":                                    { hi: "कमर/जांघ के जोड़ की तरफ" },
  "Do you have any of these other symptoms?":        { hi: "क्या आपको इनमें से कोई और लक्षण भी हैं?" },
  "Shortness of breath":                             { hi: "सांस लेने में तकलीफ" },
  "Sweating / Nausea":                               { hi: "पसीना आना या जी घबराना" },
  "Palpitations (fast heart beat)":                  { hi: "घबराहट या तेज धड़कन" },
  "Fever / Chills":                                  { hi: "बुखार या ठंड लगना" },
  "Vomiting":                                        { hi: "उल्टी होना" },
  "Blood in stool or Vomiting blood":                { hi: "मल (Stool) या उल्टी में खून आना" },
  "None of the above":                               { hi: "इनमें से कोई नहीं" },
  "On a scale of 1 to 10, how severe is the pain?": { hi: "1 से 10 के पैमाने पर दर्द कितना तेज है?" },
  "Where exactly is the pain?":                      { hi: "दर्द ठीक-ठीक कहाँ हो रहा है?" },
  "Right Lower Quadrant (RLQ)":                      { hi: "पेट के निचले दाहिने हिस्से में" },
  "Right Upper Quadrant (RUQ)":                      { hi: "पेट के ऊपरी दाहिने हिस्से में" },
  "Epigastric (Upper middle)":                       { hi: "पेट के ऊपरी बीच के हिस्से में" },
  "Left Lower Quadrant (LLQ)":                       { hi: "पेट के निचले बाएँ हिस्से में" },
  "Left Upper Quadrant (LUQ)":                       { hi: "पेट के ऊपरी बाएँ हिस्से में" },
  "Generalized / All over":                          { hi: "पूरे पेट में" },
  "Does the pain radiate straight through to your back?": { hi: "क्या दर्द सीधा पीठ की तरफ जा रहा है?" },
  "Yes, to the back":                                { hi: "हाँ, पीठ की तरफ" },
  "No, it stays in the front":                       { hi: "नहीं, सिर्फ आगे की तरफ रहता है" },
  "Is the pain constant or does it come and go?":    { hi: "क्या दर्द लगातार हो रहा है या आता-जाता रहता है?" },
  "Constant":                                        { hi: "लगातार हो रहा है" },
  "Intermittent (comes and goes)":                   { hi: "रुक-रुक कर (आता-जाता रहता है)" },
  "Does anything make the pain worse?":              { hi: "क्या किसी चीज से दर्द बढ़ जाता है?" },
  "Movement / Coughing":                             { hi: "हिलने-डुलने या खांसने से" },
  "Eating / Drinking":                               { hi: "कुछ खाने या पीने से" },
  "Nothing specific":                                { hi: "किसी खास चीज से नहीं" },
  "How did the fever start?":                        { hi: "बुखार कैसे शुरू हुआ?" },
  "Suddenly":                                        { hi: "अचानक" },
  "Gradually over a few days":                       { hi: "धीरे-धीरे कुछ दिनों में" },
  "What is the pattern of the fever?":               { hi: "बुखार का पैटर्न कैसा है?" },
  "Continuous (high all the time)":                  { hi: "लगातार (हमेशा तेज रहता है)" },
  "Intermittent or Spiking (comes and goes)":        { hi: "रुक-रुक कर या अचानक तेज होता है" },
  "Are you experiencing any other symptoms?":        { hi: "क्या आपको कोई और लक्षण महसूस हो रहे हैं?" },
  "Severe chills or rigors (shaking)":               { hi: "बहुत तेज ठंड या कंपकंपी" },
  "Headache, muscle/joint aches, rash":              { hi: "सिरदर्द, मांसपेशियों/जोड़ों में दर्द या दाने" },
  "Severe neck stiffness or confusion":              { hi: "गर्दन में तेज अकड़न या दिमागी उलझन" },
  "Cough, sore throat, or runny nose":               { hi: "खांसी, गले में खराश या बहती नाक" },
  "Have you traveled to tropical/forested areas recently or had tick/mosquito bites?":
    { hi: "क्या आपने हाल ही में किसी जंगल वाले इलाके में यात्रा की है, या आपको कीड़े/मच्छर ने काटा है?" },
  "Yes":                                             { hi: "हाँ" },
  "No":                                              { hi: "नहीं" },
  "How long have you had the fever?":                { hi: "आपको बुखार कितने समय से है?" },
  "Less than 3 days":                                { hi: "3 दिन से कम" },
  "3 to 5 days":                                     { hi: "3 से 5 दिन" },
  "More than 5 days":                                { hi: "5 दिन से ज्यादा" },
  "On a scale of 1 to 10, how severe are your symptoms overall?":
    { hi: "1 से 10 के पैमाने पर आपके लक्षण कुल मिलाकर कितने गंभीर हैं?" },

  // ─── Chest Pain Tree Additions (Complete Coverage) ───
  "How did the chest pain start?":                   { hi: "सीने में दर्द कैसे शुरू हुआ?" },
  "Crushing / Heavy Pressure / Tightness":           { hi: "भारी दबाव, सीना दबने या जकड़न जैसा" },
  "Sharp / Catching when breathing":                 { hi: "तेज चुभन या सांस लेने पर अटकने जैसा" },
  "Does the pain radiate anywhere?":                 { hi: "क्या दर्द कहीं और भी फैल रहा है?" },
  "To the left arm, neck, or jaw":                   { hi: "बाएं हाथ, गर्दन या जबड़े की तरफ" },
  "To the back":                                     { hi: "पीठ की तरफ" },
  "Are you experiencing any of these other symptoms?": { hi: "क्या आपको इनमें से कोई और लक्षण महसूस हो रहे हैं?" },
  "Sweating, dizziness, or palpitations":            { hi: "पसीना आना, चक्कर आना या तेज धड़कन" },
  "Nausea or vomiting":                              { hi: "जी मिचलाना या उल्टी होना" },
  "Are you experiencing any respiratory symptoms?":  { hi: "क्या आपको सांस से जुड़ी कोई तकलीफ हो रही है?" },
  "Severe breathlessness / shortness of breath":     { hi: "सांस लेने में भारी तकलीफ या सांस फूलना" },
  "Coughing":                                        { hi: "खांसी आना" },
  "None":                                            { hi: "कोई नहीं" },
  "Is the pain worse in specific situations?":       { hi: "क्या किसी विशेष स्थिति में दर्द बढ़ जाता है?" },
  "Worse after meals or when lying down":            { hi: "खाना खाने के बाद या लेटने पर बढ़ जाता है" },
  "Unrelated to eating or position":                 { hi: "खाने या उठने-बैठने से कोई संबंध नहीं" },
};

const Intake = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { globalState, updateState } = useGlobalState();
  const queryParams = new URLSearchParams(location.search);
  const complaintType = queryParams.get('complaint') || sessionStorage.getItem('pending_complaint') || 'abdominal-pain';
  const sessionId = sessionStorage.getItem('session_id');

  const [isAlreadyComplete, setIsAlreadyComplete] = useState(false);

  useEffect(() => {
    if (!sessionId) {
      navigate('/');
      return;
    }
    if (sessionStorage.getItem('intake_completed') === 'true') {
      setIsAlreadyComplete(true);
    }
  }, [sessionId, navigate]);

  const [tree, setTree] = useState(null);
  const [currentNodeId, setCurrentNodeId] = useState(null);
  const [answers, setAnswers] = useState({});
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [urgentAlert, setUrgentAlert] = useState(false);

  // Voice Input States
  const [isMuted, setIsMuted] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [noMatchFound, setNoMatchFound] = useState(false);
  const [voiceFeedbackMsg, setVoiceFeedbackMsg] = useState("");
  const watchdogTimerRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    let matchedPattern = null;
    let priorityTier = null;

    if (complaintType === 'chest-pain') {
      const { C, R, A, S } = answers;
      
      const hasUrgentRadiation = (R === 'arm_jaw' || answers.radiation_cardiac === 'arm_jaw');
      const hasUrgentAssociated = (A === 'breathlessness' || A === 'sweating_palpitations' || answers.associated_cardiac === 'sweating_palpitations' || answers.associated_respiratory === 'breathlessness');
      const hasUrgentSeverity = (S && parseInt(S) >= 8) || (answers.severity && parseInt(answers.severity) >= 8);
      const isCrushing = (C === 'crushing' || answers.character === 'crushing');
      const isTearing = (C === 'tearing' || answers.character === 'tearing');
      
      if (isTearing) {
        matchedPattern = 'Critical Vascular';
        priorityTier = 'CRITICAL PRIORITY';
      } else {
        const concerningFactors = [hasUrgentRadiation, hasUrgentAssociated, hasUrgentSeverity, isCrushing].filter(Boolean).length;
        if (concerningFactors >= 2) {
          matchedPattern = 'Acute Cardiac Pattern';
          priorityTier = 'HIGH PRIORITY';
        }
      }
    } else if (complaintType === 'abdominal-pain') {
      const site = answers.site || (answers.S === 'rlq' || answers.S === 'ruq' || answers.S === 'epigastric' || answers.S === 'llq' || answers.S === 'luq' || answers.S === 'generalized' ? answers.S : '');
      const onset = answers.onset || answers.O;
      const character = answers.character || answers.C;
      const radiation = answers.radiation_general || answers.radiation_back || answers.R;
      const associated = answers.associated_sx || answers.A;
      const severity = parseInt(answers.severity || (typeof answers.S === 'string' && answers.S.match(/^\d+$/) ? answers.S : 0));

      // 1. Critical Vascular — CRITICAL PRIORITY:
      // character == "tearing" AND radiation == "back"
      if (character === 'tearing' && radiation === 'back') {
        matchedPattern = 'Critical Vascular';
        priorityTier = 'CRITICAL PRIORITY';
      }
      // 2. Acute Surgical RLQ — HIGH PRIORITY:
      // site == "rlq" AND onset == "sudden" AND severity >= 8
      // OR (site == "rlq" AND (character == "tearing" OR associated_sx == "blood"))
      else if (site === 'rlq' && ((onset === 'sudden' && !isNaN(severity) && severity >= 8) || (character === 'tearing' || associated === 'blood'))) {
        matchedPattern = 'Acute Surgical RLQ';
        priorityTier = 'HIGH PRIORITY';
      }
      // 3. Acute Hemorrhagic — HIGH PRIORITY:
      // associated_sx == "blood" AND severity >= 8 OR associated_sx == "blood" (alone)
      else if (associated === 'blood') {
        matchedPattern = 'Acute Hemorrhagic';
        priorityTier = 'HIGH PRIORITY';
      }
      // 4. Infective/Inflammatory — MODERATE-HIGH PRIORITY:
      // associated_sx == "fever" AND severity >= 7
      else if (associated === 'fever' && !isNaN(severity) && severity >= 7) {
        matchedPattern = 'Infective/Inflammatory';
        priorityTier = 'MODERATE-HIGH PRIORITY';
      }
    } else if (complaintType === 'fever') {
      const associated = answers.associated_sx || answers.A;
      const travel = answers.travel_history || (answers.A === 'yes' ? 'yes' : '');
      const duration = answers.duration || answers.T;
      const severity = parseInt(answers.severity || (typeof answers.S === 'string' && answers.S.match(/^\d+$/) ? answers.S : 0));

      // 5. CNS Infectious Pattern — CRITICAL PRIORITY:
      // associated_sx == "cns"
      if (associated === 'cns') {
        matchedPattern = 'CNS Infectious';
        priorityTier = 'CRITICAL PRIORITY';
      }
      // 6. Systemic Infective Pattern — HIGH PRIORITY:
      // associated_sx == "rigors" AND duration == "gt_5" AND (severity >= 8 OR travel == "yes")
      else if (associated === 'rigors' && duration === 'gt_5' && ((!isNaN(severity) && severity >= 8) || travel === 'yes')) {
        matchedPattern = 'Systemic Infective';
        priorityTier = 'HIGH PRIORITY';
      }
    }

    if (matchedPattern && !urgentAlert) {
      setUrgentAlert(true);
      updateState({
        priority: true,
        matchedPattern,
        priorityTier
      });
    }
  }, [answers, complaintType, urgentAlert, updateState]);

  useEffect(() => {
    if (isAlreadyComplete) {
      setLoading(false);
      return;
    }
    fetch(`${API_BASE}/api/intake/${complaintType}/tree`)
      .then(res => res.json())
      .then(data => {
        setTree(data);
        setCurrentNodeId(data.start_node);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load tree:", err);
        setError("Network error fetching intake logic.");
        setLoading(false);
      });
  }, [complaintType, isAlreadyComplete]);

  const [fallbackMsg, setFallbackMsg] = useState("");
  const [pendingVoiceMatch, setPendingVoiceMatch] = useState(null); // { opt }
  const undoTimerRef = useRef(null);

  useEffect(() => {
    if (!loading && !isAlreadyComplete && !result && tree && currentNodeId && !isMuted) {
      window.speechSynthesis.cancel();
      const currentNode = tree.nodes.find(n => n.id === currentNodeId);
      if (currentNode) {
         const _lang = globalState.language || 'en';
         const _translated = (_lang !== 'en' && INTAKE_I18N[currentNode.question_text]?.[_lang]) || currentNode.question_text;
         const utterance = new SpeechSynthesisUtterance(_translated);
         const lang = globalState.language || 'en';
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
    }
    // Clear transcript and watchdog on new question
    setTranscript("");
    setNoMatchFound(false);
    setVoiceFeedbackMsg("");
    if (watchdogTimerRef.current) clearTimeout(watchdogTimerRef.current);
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch (e) {}
    }
  }, [currentNodeId, loading, isAlreadyComplete, result, tree, isMuted]);

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

      const currentNode = tree.nodes.find(n => n.id === currentNodeId);
      const currentLang2 = globalState.language || 'en';
      const matchResult = evaluateVoiceMatch(
        speechResult,
        currentNode?.options || [],
        opt => {
          const rawText = opt.text || opt.label || opt.value || "";
          return (currentLang2 !== 'en' && INTAKE_I18N[rawText]?.[currentLang2])
            ? INTAKE_I18N[rawText][currentLang2]
            : rawText;
        }
      );

      console.log('[STT] Voice evaluation result:', matchResult);

      if (matchResult.status === 'matched') {
        setVoiceFeedbackMsg("");
        setNoMatchFound(false);
        handleVoiceMatch(matchResult.match);
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

  // Called by tap — immediate selection, 300ms auto-advance
  const handleSelectOption = (opt) => {
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }
    setPendingVoiceMatch(null);

    const currentNode = tree.nodes.find(n => n.id === currentNodeId);
    const newAnswers = { 
      ...answers, 
      [currentNode.socrates_category]: opt.value || opt.label,
      [currentNode.id]: opt.value || opt.label
    };
    setAnswers(newAnswers);
    updateState({ intake_answers: newAnswers });

    setTimeout(() => {
      if (opt.next) {
        setHistory([...history, currentNodeId]);
        setCurrentNodeId(opt.next);
      } else {
        // Final question answered! Auto-submit
        submitIntake(newAnswers);
      }
    }, 300);
  };

  // Called by voice match — highlight option, show Undo button for 2 seconds
  const handleVoiceMatch = (opt) => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);

    const currentNode = tree.nodes.find(n => n.id === currentNodeId);
    const newAnswers = { 
      ...answers, 
      [currentNode.socrates_category]: opt.value || opt.label,
      [currentNode.id]: opt.value || opt.label
    };
    setAnswers(newAnswers);
    updateState({ intake_answers: newAnswers });
    setPendingVoiceMatch({ opt });

    undoTimerRef.current = setTimeout(() => {
      setPendingVoiceMatch(null);
      if (opt.next) {
        setHistory([...history, currentNodeId]);
        setCurrentNodeId(opt.next);
      } else {
        // Final question voice match confirmed! Auto-submit
        submitIntake(newAnswers);
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
    const currentNode = tree.nodes.find(n => n.id === currentNodeId);
    const newAnswers = { ...answers };
    delete newAnswers[currentNode.socrates_category];
    delete newAnswers[currentNode.id];
    setAnswers(newAnswers);
    setTranscript("");
    setNoMatchFound(false);
  };

  const handleBack = () => {
    const newHistory = [...history];
    const prevNode = newHistory.pop();
    setHistory(newHistory);
    setCurrentNodeId(prevNode);
  };

  const submitIntake = (overrideAnswers) => {
    setSubmitting(true);
    setError(null);
    const answersToSend = overrideAnswers || answers;
    console.log('[INTAKE] Submitting intake with answers:', answersToSend);
    fetch(`${API_BASE}/api/intake/${complaintType}?session_id=${sessionId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(answersToSend)
    })
      .then(res => {
        if (!res.ok) throw new Error("Server rejected submission");
        return res.json();
      })
      .then(data => {
        setResult(data);
        sessionStorage.setItem('intake_completed', 'true');
        updateState({ intake_result: data });
        setSubmitting(false);
      })
      .catch(err => {
        console.error(err);
        setError("Failed to submit intake. Please try again.");
        setSubmitting(false);
      });
  };

  const lang = globalState.language || 'en';
  const alertI18n = {
    en: "This may need urgent attention — please alert staff now.",
    hi: "इस पर तत्काल ध्यान देने की आवश्यकता हो सकती है — कृपया अभी कर्मचारियों को सचेत करें।",
    mr: "याकडे तातडीने लक्ष देण्याची गरज असू शकते — कृपया आता कर्मचाऱ्यांना सूचित करा."
  };
  const urgentText = alertI18n[lang] || alertI18n.en;

  const intakeI18n = INTAKE_I18N;

  const getTranslated = (str) => {
    if (lang === 'en' || !str) return str;
    if (intakeI18n[str]?.[lang]) return intakeI18n[str][lang];
    const trimmed = typeof str === 'string' ? str.trim() : str;
    if (intakeI18n[trimmed]?.[lang]) return intakeI18n[trimmed][lang];

    // Case-insensitive / whitespace-tolerant lookup
    const lower = trimmed.toLowerCase();
    for (const [k, v] of Object.entries(intakeI18n)) {
      if (k.toLowerCase() === lower) {
        return v[lang] || str;
      }
    }
    return str;
  };

  if (urgentAlert) {
    const isCritical = globalState?.priorityTier?.includes('CRITICAL');
    const displayPattern = globalState?.matchedPattern;
    const displayTier = globalState?.priorityTier;

    return (
      <div className={`flex flex-col items-center justify-center min-h-[80vh] w-full font-sans ${isCritical ? 'bg-red-700 ring-8 ring-red-900/40' : 'bg-red-600'} text-white p-6 absolute inset-0 z-50 rounded-lg`}>
        <AlertTriangle className="w-24 h-24 mb-6 animate-pulse" />
        <h1 className="text-4xl font-black mb-3 text-center tracking-tight">CRITICAL ALERT</h1>

        {displayPattern && (
          <div className="mb-6 flex flex-wrap items-center justify-center gap-2 bg-black/25 border border-white/30 px-5 py-2 rounded-2xl shadow-inner">
            <span className="text-red-100 text-sm font-semibold">Flagged Pattern:</span>
            <span className="text-white font-bold text-base">{displayPattern}</span>
            {displayTier && (
              <span className={`px-2.5 py-0.5 rounded-md text-xs font-black uppercase tracking-wider ml-1 ${
                displayTier.includes('CRITICAL')
                  ? 'bg-rose-950 text-rose-200 border border-rose-400 ring-2 ring-rose-400/50 animate-pulse'
                  : displayTier.includes('HIGH') && !displayTier.includes('MODERATE')
                  ? 'bg-amber-600 text-amber-50 border border-amber-300'
                  : 'bg-yellow-600 text-yellow-50 border border-yellow-300'
              }`}>
                {displayTier}
              </span>
            )}
          </div>
        )}

        <p className="text-xl font-medium mb-10 text-center max-w-lg text-red-100">
          {urgentText}
        </p>
        <button 
          onClick={() => navigate('/priority')} 
          className="bg-white text-red-700 px-8 py-4 rounded-full font-bold text-lg shadow-2xl hover:bg-slate-100 transition active:scale-95 cursor-pointer"
        >
          Acknowledge & Wait for Staff
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 font-sans text-slate-800">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
        <p className="text-sm font-bold tracking-wider uppercase text-slate-500">Loading Medical Intake...</p>
      </div>
    );
  }

  if (isAlreadyComplete && !result && !error) {
    return (
      <div className="flex flex-col items-center flex-1 font-sans p-6 text-slate-800 justify-center">
        <div className="bg-white p-8 rounded-2xl shadow text-center max-w-md w-full border">
          <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-4">Medical Intake Complete</h2>
          <p className="text-slate-600 mb-8">You have already completed the triage section for this visit.</p>
          <div className="space-y-3">
            <button 
              onClick={() => navigate('/documents')}
              className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition shadow-md"
            >
              Continue to Document Upload
            </button>
            <button 
              onClick={() => {
                sessionStorage.removeItem('intake_completed');
                setIsAlreadyComplete(false);
                setLoading(true);
              }}
              className="w-full bg-slate-100 text-slate-600 font-bold py-3 rounded-xl hover:bg-slate-200 transition"
            >
              Redo Medical Intake
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (result) {
    return (
      <div className="flex flex-col items-center flex-1 font-sans p-6 text-slate-800">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 text-center mt-12 animate-fade-in border">
          <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-slate-800 mb-6">Triage Summary</h1>
          
          <div className="text-left bg-slate-50 p-4 rounded-xl mb-6 border">
            <h3 className="font-bold text-slate-700 mb-2 uppercase tracking-wider text-sm border-b pb-2">Recorded History</h3>
            <div className="grid grid-cols-2 gap-2 mt-3">
              {Object.entries(result.summary).map(([k, v]) => (
                <div key={k} className="mb-2">
                  <span className="block text-xs font-semibold text-slate-400 uppercase">{k.replace('_', ' ')}</span>
                  <span className="block text-sm font-medium">{v}</span>
                </div>
              ))}
            </div>
          </div>
          
          {result.flags && result.flags.length > 0 && (
            <div className="bg-red-50 border border-red-200 p-4 rounded-xl text-left mb-8 shadow-sm">
              <h3 className="text-red-700 font-bold mb-3 flex items-center"><AlertTriangle className="w-5 h-5 mr-2" /> Clinical Alerts</h3>
              <ul className="space-y-2">
                {result.flags.map((f, i) => (
                  <li key={i} className="text-red-600 text-sm font-semibold">{f}</li>
                ))}
              </ul>
            </div>
          )}
          
          <button 
            onClick={() => navigate('/documents')}
            className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl hover:bg-indigo-700 transition flex justify-center items-center active:scale-95 shadow-md"
          >
            Next: Upload Documents <ChevronRight className="w-5 h-5 ml-2" />
          </button>
        </div>
      </div>
    );
  }

  if (error && !submitting && currentNodeId === null) {
    return (
      <div className="flex flex-col items-center flex-1 justify-center p-6">
         <div className="bg-red-50 p-6 rounded-2xl border border-red-200 text-center max-w-md w-full">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-red-800 mb-2">Submission Failed</h2>
            <p className="text-red-600 mb-6">{error}</p>
            <button onClick={submitIntake} className="bg-red-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-red-700 transition flex mx-auto items-center">
              <RefreshCw className="w-4 h-4 mr-2" /> Retry Submission
            </button>
         </div>
      </div>
    );
  }

  if (!tree || !currentNodeId) {
    return (
      <div className="flex items-center justify-center flex-1 flex-col">
        {error ? <p className="text-red-500 font-bold mb-4">{error}</p> : <p>Loading questions...</p>}
        {error && <button onClick={() => window.location.reload()} className="bg-slate-200 px-4 py-2 rounded font-bold">Retry Load</button>}
      </div>
    );
  }

  const currentNode = tree.nodes.find(n => n.id === currentNodeId);
  const isFinal = currentNode && currentNode.options && currentNode.options.every(opt => opt.next === null);

  return (
    <div className="flex flex-col flex-1 font-sans text-slate-800 relative bg-white md:bg-transparent">
      
      {/* Progress counter (simple textual for Intake since tree depth varies) */}
      <div className="w-full flex justify-center py-4 absolute top-0 left-0 bg-slate-50/80 backdrop-blur">
         <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest bg-indigo-100 px-3 py-1 rounded-full border border-indigo-200 shadow-sm">
           Step {history.length + 1}
         </span>
      </div>

      <div className="flex-1 w-full max-w-md mx-auto p-6 pt-20 flex flex-col justify-center">
        <div className="mb-8">
          <div className="flex flex-col gap-2">
            <div className="flex items-start gap-3">
              <button 
                onClick={() => {
                  window.speechSynthesis.cancel();
                  const lang = globalState.language || 'en';
                  const _tts = (lang !== 'en' && INTAKE_I18N[currentNode.question_text]?.[lang]) || currentNode.question_text;
                  const u = new SpeechSynthesisUtterance(_tts);
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
                className="mt-1 p-2 bg-teal-50 text-teal-700 rounded-full hover:bg-teal-100 transition shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center border border-teal-200"
                aria-label="Read question aloud"
              >
                <Volume2 className="w-5 h-5" />
              </button>
              <h2 className="text-2xl font-bold text-slate-900 leading-tight">
                {getTranslated(currentNode.question_text)}
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
          {currentNode.options?.map((opt, i) => {
            const isSelected = answers[currentNode.socrates_category] === opt.value;
            const isPendingVoice = pendingVoiceMatch?.opt?.value === opt.value;
            return (
              <button
                key={i}
                onClick={() => handleSelectOption(opt)}
                className={`w-full p-4 rounded-xl text-left transition-all duration-200 border-2 active:scale-[0.98]
                  ${isPendingVoice
                    ? 'border-green-500 bg-green-50 text-green-900 shadow-md ring-2 ring-green-300'
                    : isSelected
                    ? 'border-teal-600 bg-teal-50/70 text-teal-950 shadow-sm ring-1 ring-teal-200'
                    : 'border-slate-200 bg-white hover:border-teal-300 hover:bg-slate-50 text-slate-700'
                  }`}
              >
                {getTranslated(opt.text || opt.label || opt.value)}
              </button>
            )
          })}
        </div>
      </div>

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
            {history.length > 0 && (
              <button 
                onClick={handleBack}
                className="px-6 py-3 font-semibold text-slate-600 bg-slate-100 rounded-xl active:scale-95 hover:bg-slate-200 transition"
              >
                Back
              </button>
            )}
            
            {isFinal && (
              <button
                onClick={() => submitIntake()}
                disabled={submitting}
                className="px-8 py-3 font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-md flex items-center transition cursor-pointer"
              >
                {submitting ? 'Submitting...' : 'Finish Triage'}
                {!submitting && <CheckCircle2 className="w-5 h-5 ml-2" />}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Intake;
