/**
 * Hardened Web Speech API (TTS) Engine for Jeevan Health
 * Solves:
 * 1. Chromium GC bug (prevents garbage collection of active utterances)
 * 2. Missing voice fallbacks (e.g. Marathi mr-IN falls back to Hindi hi-IN Devanagari voice)
 * 3. Mobile autoplay unlock (resumes AudioContext / SpeechSynthesis queue on user gesture)
 * 4. Chrome cancel/speak race conditions (40ms debounce between cancel and speak)
 * 5. Asynchronous voice loading via onvoiceschanged
 */

// Retain active utterance references to prevent Chromium garbage collection
const activeUtterances = new Set();

let cachedVoices = [];

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  const loadVoices = () => {
    try {
      const v = window.speechSynthesis.getVoices();
      if (v && v.length > 0) {
        cachedVoices = v;
      }
    } catch (_) {}
  };
  loadVoices();
  if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }

  // Global user-gesture audio unlocker for mobile and desktop browsers
  const unlockAudio = () => {
    try {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    } catch (_) {}
  };
  ['click', 'touchstart', 'keydown', 'touchend'].forEach(evt => {
    window.addEventListener(evt, unlockAudio, { passive: true });
  });
}

export const getAvailableVoices = () => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
  if (cachedVoices.length === 0) {
    cachedVoices = window.speechSynthesis.getVoices() || [];
  }
  return cachedVoices;
};

export const findBestVoice = (lang = 'en') => {
  const voices = getAvailableVoices();
  if (!voices || voices.length === 0) return null;

  const code = (lang || 'en').toLowerCase();

  if (code === 'hi') {
    // Look for Hindi voice
    const hindiVoice = voices.find(v => 
      v.lang.toLowerCase().startsWith('hi') || 
      v.name.toLowerCase().includes('hindi') || 
      v.name.includes('हिन्दी')
    );
    if (hindiVoice) return hindiVoice;
  }

  if (code === 'mr') {
    // Look for Marathi voice first
    const marathiVoice = voices.find(v => 
      v.lang.toLowerCase().startsWith('mr') || 
      v.name.toLowerCase().includes('marathi')
    );
    if (marathiVoice) return marathiVoice;
    // Fallback: Hindi voice reads Marathi Devanagari text very accurately!
    const hindiVoice = voices.find(v => 
      v.lang.toLowerCase().startsWith('hi') || 
      v.name.toLowerCase().includes('hindi') || 
      v.name.includes('हिन्दी')
    );
    if (hindiVoice) return hindiVoice;
  }

  if (code === 'en') {
    // Look for Indian English first, then any English
    const indianEng = voices.find(v => v.lang.toLowerCase() === 'en-in');
    if (indianEng) return indianEng;
    const anyEng = voices.find(v => v.lang.toLowerCase().startsWith('en'));
    if (anyEng) return anyEng;
  }

  // Generic fallback: first voice that matches language prefix
  const langMatch = voices.find(v => v.lang.toLowerCase().startsWith(code));
  if (langMatch) return langMatch;

  // Final fallback: default or first voice
  return voices.find(v => v.default) || voices[0] || null;
};

export const playSpeech = (text, options = {}) => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    if (options.onError) options.onError(new Error('Speech synthesis not supported'));
    return () => {};
  }

  const {
    lang = 'en',
    rate = 0.95,
    pitch = 1.0,
    onStart,
    onEnd,
    onError
  } = options;

  const synth = window.speechSynthesis;

  // Clean Markdown, tags, and special tokens from speech text
  const clean = (text || '')
    .replace(/\[INTAKE_COMPLETE\]/g, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/[*#_~`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!clean) {
    if (onEnd) onEnd();
    return () => {};
  }

  // Cancel previous speech safely
  try {
    synth.cancel();
    if (synth.paused) synth.resume();
  } catch (_) {}

  let isCanceled = false;

  const timer = setTimeout(() => {
    if (isCanceled) return;

    try {
      if (synth.paused) synth.resume();

      const utter = new SpeechSynthesisUtterance(clean);
      const voice = findBestVoice(lang);

      if (voice) {
        utter.voice = voice;
        utter.lang = voice.lang;
      } else {
        utter.lang = lang === 'hi' ? 'hi-IN' : lang === 'mr' ? 'hi-IN' : 'en-IN';
      }

      utter.rate = rate;
      utter.pitch = pitch;

      // Retain reference to prevent GC bug in Chromium
      activeUtterances.add(utter);

      utter.onstart = () => {
        if (onStart) onStart();
      };

      utter.onend = () => {
        activeUtterances.delete(utter);
        if (onEnd) onEnd();
      };

      utter.onerror = (e) => {
        activeUtterances.delete(utter);
        console.warn('[Speech Error]', e);
        if (onError) onError(e);
      };

      synth.speak(utter);
    } catch (err) {
      console.warn('[playSpeech exception]', err);
      if (onError) onError(err);
    }
  }, 40);

  return () => {
    isCanceled = true;
    clearTimeout(timer);
    try {
      synth.cancel();
    } catch (_) {}
  };
};

export const stopSpeech = () => {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
      activeUtterances.clear();
    } catch (_) {}
  }
};
