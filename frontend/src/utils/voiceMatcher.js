// Comprehensive bilingual stop-words list for clinical intake & conversational filler
export const VOICE_STOP_WORDS = new Set([
  // English common / generic filler words
  'have', 'with', 'from', 'that', 'this', 'more', 'than', 'some', 'time', 'times',
  'feel', 'felt', 'food', 'foods', 'pain', 'very', 'mild', 'well', 'days', 'only',
  'also', 'when', 'what', 'then', 'they', 'them', 'their', 'there', 'here', 'just',
  'about', 'like', 'been', 'being', 'were', 'will', 'would', 'could', 'should',
  'body', 'type', 'area', 'part', 'hour', 'hours', 'day', 'days', 'night', 'week',
  'often', 'always', 'sometimes', 'usually', 'rarely', 'most', 'much', 'less', 'good',
  'bad', 'normal', 'general', 'generally', 'easy', 'easily', 'hard', 'little',
  'the', 'and', 'for', 'are', 'not', 'you', 'your', 'any', 'can', 'get', 'got',
  
  // Hindi common / generic filler words
  'होता', 'होती', 'होते', 'जाता', 'जाती', 'जाते', 'करना', 'करने', 'रहता', 'रहती', 'रहते',
  'खाना', 'खाने', 'दिन', 'बहुत', 'ज्यादा', 'हल्का', 'कभी', 'सकते', 'सकता', 'सकती', 'लगता',
  'लगती', 'लगते', 'आता', 'आती', 'आते', 'दर्द', 'परेशानी', 'समस्या', 'तरह', 'समय', 'वाले',
  'वाला', 'वाली', 'जैसे', 'लेकिन', 'अगर', 'थोड़ा', 'थोड़ी', 'काफी', 'अक्सर', 'हमेशा',
  'है', 'हैं', 'था', 'थी', 'थे', 'भी', 'तो', 'पर', 'में', 'से', 'को', 'का', 'के', 'की'
]);

/**
 * Evaluates spoken transcript against candidate options.
 * 
 * Rules:
 * 1. Requires distinctive keyword(s) unique to an option, filtering out generic stop words.
 * 2. Ambiguity guard: If 2 or more options match with comparable high scores, returns status: 'ambiguous'.
 * 3. Exact full label or distinctive keyword match yields high confidence.
 */
export function evaluateVoiceMatch(speechResult, options = [], getDisplayLabel) {
  if (!speechResult || typeof speechResult !== 'string') {
    return { match: null, status: 'no_speech' };
  }

  const cleanSpeech = speechResult.toLowerCase().replace(/[^\w\s\u0900-\u097F]/g, ' ').trim();
  const transcriptWords = cleanSpeech.split(/\s+/).filter(Boolean);

  if (transcriptWords.length === 0) {
    return { match: null, status: 'empty' };
  }

  // Filter out stop words and short noise (<3 chars)
  const meaningfulTranscriptWords = transcriptWords.filter(
    w => w.length >= 3 && !VOICE_STOP_WORDS.has(w)
  );

  // If transcript contains solely stop words, reject immediately
  if (meaningfulTranscriptWords.length === 0) {
    return { 
      match: null, 
      status: 'no_distinctive_words',
      reason: 'Transcript contains only generic stop words.'
    };
  }

  // Recognizable 3-letter medical/clinical traits
  const CLINICAL_SHORT_WORDS = new Set(['dry', 'hot', 'red', 'jaw', 'arm', 'gas', 'fat', 'low', 'flu']);

  // Pre-process each option's label and keywords
  const optionData = options.map(opt => {
    const rawLabel = getDisplayLabel(opt) || "";
    const cleanLabel = rawLabel.toLowerCase().replace(/[^\w\s\u0900-\u097F]/g, ' ').trim();
    const words = cleanLabel.split(/\s+/).filter(
      w => (w.length >= 4 || CLINICAL_SHORT_WORDS.has(w)) && !VOICE_STOP_WORDS.has(w)
    );
    return {
      opt,
      rawLabel,
      cleanLabel,
      words
    };
  });

  // Calculate frequency of each word across all options for this question
  const wordFrequency = {};
  optionData.forEach(od => {
    const uniqueInOpt = new Set(od.words);
    uniqueInOpt.forEach(w => {
      wordFrequency[w] = (wordFrequency[w] || 0) + 1;
    });
  });

  // Score each option
  const scoredOptions = optionData.map(od => {
    let score = 0;
    const matchedDistinctiveWords = [];
    const matchedSharedWords = [];

    // 1. Exact full-phrase match
    if (cleanSpeech === od.cleanLabel) {
      score += 100;
    } 
    // 2. High-overlap phrase match
    else if (cleanSpeech.includes(od.cleanLabel) && od.cleanLabel.length >= 6) {
      score += 85;
    } else if (od.cleanLabel.includes(cleanSpeech) && transcriptWords.length >= 2 && cleanSpeech.length >= 8) {
      score += 70;
    }

    // 3. Keyword scoring with uniqueness weighting
    od.words.forEach(w => {
      if (cleanSpeech.includes(w)) {
        if (wordFrequency[w] === 1) {
          // Word appears uniquely in THIS option among the question's choices
          score += 35;
          matchedDistinctiveWords.push(w);
        } else {
          // Word is shared with another option
          score += 5;
          matchedSharedWords.push(w);
        }
      }
    });

    return {
      ...od,
      score,
      matchedDistinctiveWords,
      matchedSharedWords
    };
  });

  // Sort by score descending
  scoredOptions.sort((a, b) => b.score - a.score);

  const top = scoredOptions[0];
  const second = scoredOptions[1];

  // Threshold: must achieve at least 30 points (at least one distinctive unique keyword or strong phrase match)
  if (!top || top.score < 30) {
    return { 
      match: null, 
      status: 'no_confident_match',
      reason: 'No distinctive keywords exceeded confidence threshold.'
    };
  }

  // Ambiguity Guard: if 2nd option also has substantial score
  if (second && second.score >= 30) {
    if (second.score === top.score || second.score >= top.score * 0.8) {
      return { 
        match: null, 
        status: 'ambiguous',
        reason: `Ambiguous match between "${top.rawLabel}" and "${second.rawLabel}".`,
        candidates: [top.opt, second.opt]
      };
    }
  }

  // Confident, unique match
  return { 
    match: top.opt, 
    status: 'matched',
    confidence: top.score >= 70 ? 'high' : 'medium',
    distinctiveKeywords: top.matchedDistinctiveWords
  };
}
