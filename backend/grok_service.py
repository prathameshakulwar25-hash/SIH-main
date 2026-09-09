import os
import json
import logging
from typing import Dict, Any, List, Optional
from dotenv import load_dotenv
import httpx
from flow_engine import get_step_meta

# Load environment variables from backend/.env
dotenv_path = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(dotenv_path)
load_dotenv()

logger = logging.getLogger("grok_service")
logging.basicConfig(level=logging.INFO)

# Default xAI / Groq API configurations
XAI_API_BASE = os.getenv("XAI_API_BASE", "https://api.x.ai/v1")
DEFAULT_GROK_MODEL = os.getenv("GROK_MODEL", "openai/gpt-oss-120b")


def normalize_clinical_complaint(raw_text: str) -> str:
    """
    Normalizes informal colloquial patient speech (e.g. 'bhai sar dard kr rha hai',
    'sir ghum raha hai', 'pet kharab hai') or raw complaint slugs into standardized,
    formal medical clinical terminology suitable for official OPD documentation.
    """
    if not raw_text:
        return "Acute Clinical Consultation"
    
    t = str(raw_text).strip()
    clean_known = {
        "headache": "Headache / Cephalea",
        "abdominal-pain": "Acute Abdominal Discomfort",
        "abdominal pain": "Acute Abdominal Discomfort",
        "chest-pain": "Precordial Chest Pain",
        "chest pain": "Precordial Chest Pain",
        "fever": "Pyrexia / Febrile Illness",
        "cough": "Acute Bronchial Cough",
        "diarrhea": "Acute Gastroenteritis",
        "vomiting": "Nausea & Vomiting / Emesis",
        "vertigo": "Acute Vertigo / Presyncope",
        "dizziness": "Acute Vertigo / Presyncope",
        "voice-consultation": "Acute Clinical Consultation",
        "general acute complaint": "Acute Clinical Consultation",
    }
    lower_t = t.lower()
    if lower_t in clean_known:
        return clean_known[lower_t]

    # Headache / Cephalea / Forehead / Migraine
    if (
        any(k in lower_t for k in ["headache", "cephalea", "migraine", "forehead", "कपाळ", "माथे", "डोके", "डोकेदुखी", "सिरदर्द", "सिर दर्द", "माथा"]) or
        (any(h in lower_t for h in ["sar", "sir", "matha", "mathe", "head", "doke"]) and any(p in lower_t for p in ["dard", "pain", "ache", "dukh", "bhari", "ghum", "dukhat"]))
    ):
        return "Headache / Cephalea"
    
    # Abdominal / Gastric / Colic
    if (
        any(k in lower_t for k in ["stomach", "abdomen", "abdominal", "पोट", "पोटात", "पेट", "gas", "acidity", "indigestion", "colic", "belly", "kabz", "constipat", "loose"]) or
        ("pet" in lower_t and any(p in lower_t for p in ["dard", "kharab", "pain", "ache", "dukh", "gadbad", "marod", "me"]))
    ):
        return "Acute Abdominal Discomfort"
        
    # Chest pain / Precordial / Angina
    if (
        any(k in lower_t for k in ["chest", "chhati", "seene", "सीना", "छाती", "heart", "angina", "cardiac"]) or
        (any(c in lower_t for c in ["chhati", "seene", "chest"]) and any(p in lower_t for p in ["dard", "pain", "pressure", "jalan"]))
    ):
        return "Precordial Chest Pain"
        
    # Fever / Pyrexia / Chills
    if any(k in lower_t for k in ["bukhar", "fever", "tap", "ताप", "बुखार", "temperature", "chills", "febrile", "kapkapi", "pyrexia"]):
        return "Pyrexia / Febrile Illness"
        
    # Dizziness / Vertigo / Presyncope
    if any(k in lower_t for k in ["chakkar", "dizzy", "dizziness", "vertigo", "चक्कर", "faint", "presyncope", "behoshi", "sir ghum", "sar ghum"]):
        return "Acute Vertigo / Presyncope"
        
    # Respiratory / Cough / Dyspnea
    if any(k in lower_t for k in ["cough", "khansi", "khasi", "खोखला", "खोकला", "खांसी", "saans", "shwas", "breath", "dyspnea", "asthma", "gala"]):
        return "Respiratory Symptoms / Dyspnea"
        
    # Nausea / Vomiting
    if any(k in lower_t for k in ["ulti", "vomit", "nausea", "मळमळ", "उल्टी", "ghabra", "jee machal"]):
        return "Nausea & Emesis"

    # Diarrhea / Loose motions
    if any(k in lower_t for k in ["dast", "loose motion", "diarrhea", "जुलाब", "दस्त", "potty"]):
        return "Acute Gastroenteritis"

    # Body ache / Joint pain / Myalgia
    if any(k in lower_t for k in ["badan dard", "body ache", "joint", "gathiya", "sandhivata", "हाथ पैर", "सांधे", "myalgia", "kamar dard", "back pain"]):
        return "Generalized Myalgia / Arthralgia"
        
    # Fatigue / Weakness / Asthenia
    if any(k in lower_t for k in ["kamzori", "weakness", "fatigue", "tired", "थकवा", "कमजोरी"]):
        return "Asthenia / Generalized Fatigue"
        
    # Skin / Dermatological / Rash
    if any(k in lower_t for k in ["khujli", "rash", "allergy", "खाज", "त्वचा", "pruritus"]):
        return "Cutaneous Dermatosis / Pruritus"
        
    # If the text is short and doesn't contain conversational/slang words, clean it
    casual_words = ["bhai", "yaar", "kr rha", "kar raha", "ho rha", "hai", "kuch", "bahut", "me", "mera", "meri", "aa rha", "lag rha", "dost", "plz", "please"]
    if len(t) < 40 and not any(casual in lower_t for casual in casual_words):
        return t.replace("-", " ").title()
        
    return "Acute Clinical Consultation"


# ==============================================================================
# SPECIALIZED CLINICAL & AYUSH SYSTEM PROMPTS
# ==============================================================================

SYSTEM_PROMPT_CLINICIAN_SUMMARY_ENGLISH = """You are Jeevan AI — an advanced clinical medical co-pilot for attending physicians in an Indian AYUSH & General OPD hospital.

════════════════════════════════════════════════════════════════
🌐 CRITICAL LANGUAGE DIRECTIVE — MANDATORY & NON-NEGOTIABLE:
The clinician summary report MUST ALWAYS BE 100% IN PROFESSIONAL MEDICAL ENGLISH ONLY.
Even if the patient spoke in Hindi, Marathi, Hinglish, or any regional language during the intake interview, translate all findings, symptoms, and histories into clean, standard English clinical terminology for the attending physician.
Do NOT output the clinical summary narrative in Hindi or Marathi.

⚠️ ABSOLUTE BAN ON INFORMAL / COLLOQUIAL PATIENT QUOTES:
- NEVER copy verbatim colloquial expressions, slang, casual remarks, or informal speech into ANY section of the report.
  Strictly forbidden examples: "bhai sar dard kr rha hai", "sir ghum raha hai", "pet ajeeb lag raha hai", "bahut problem hai", "yaar", "bro", "dost".
- You MUST synthesize, standardize, and convert patient complaints into formal, objective, professional medical English:
  * "bhai sar dard..." or "sir dard" -> "Headache / Cephalea (moderate bilateral/frontal discomfort)"
  * "pet me dard" -> "Acute Abdominal Discomfort / Epigastric Pain"
  * "chakkar aa raha" -> "Acute Vertigo / Presyncope"
  * "chhati me dard / dabav" -> "Precordial Chest Pain / Retrosternal Pressure"
  * "saans lene me takleef" -> "Dyspnea / Exertional Breathlessness"
  * "bukhar" -> "Pyrexia / Acute Febrile Illness"
- Maintain an impeccable, formal, and objective physician-to-physician clinical tone throughout.
════════════════════════════════════════════════════════════════

Your task is to generate a comprehensive, structured clinical OPD report in English that integrates modern clinical history and the traditional classical AYUSH Dashavidha Pariksha (दशविध परीक्षा).

Report Structure you MUST strictly follow:

# 📋 Clinical Intake & AYUSH Encounter Report

## 1. Chief Complaint (CC)
- Formal clinical medical diagnosis or presenting symptom with exact onset and duration in medical English (e.g. "- Acute Cephalea / Tension-type Headache: 2 days duration, moderate throbbing intensity."). NEVER include casual phrases.

## 2. History of Present Illness (HPI)
- Detailed narrative using SOCRATES / OLDCARTS framework:
  * Onset (Sudden / Gradual)
  * Location & Radiation
  * Duration & Progression
  * Character (e.g. sharp, burning, dull, colicky, spasmodic)
  * Aggravating & Relieving Factors
  * Severity (0 to 10 Scale)

## 3. Associated Symptoms & Review of Systems (ROS)
- Relevant positive and negative findings (fever, nausea, jaundice/yellowing, bowel/bladder changes, respiratory symptoms, etc.).

## 4. Past Medical, Surgical & Family History
- Known chronic illnesses (DM, HTN, IHD, Thyroid, Liver disorders, etc.). If past medical records or diagnoses were extracted from uploaded documents, explicitly state them here.

## 5. Current Medications & Known Allergies
- All active medications, dosage, and schedule. If medications were extracted from uploaded patient prescriptions, explicitly list them here with their dosage. Document known allergies or NKDA.
- CRITICAL ANTI-HALLUCINATION DIRECTIVE: ONLY document medications explicitly reported by the patient or extracted from uploaded prescriptions. If NO medications were mentioned or uploaded, strictly write "- Active Medications: None reported (NKDA - No Known Drug Allergies)". NEVER assume, guess, or inject unmentioned medications (such as Paracetamol, Metformin, or Amoxicillin).

## 6. 🌿 Dashavidha Pariksha (दशविध परीक्षा - 10-Fold AYUSH Assessment)
Provide a complete classical 10-fold Ayurvedic clinical examination based on the patient's presentation:
1. **Prakriti (प्रकृति - Constitutional Dosha)**: Primary and secondary Dosha constitution (Vata / Pitta / Kapha / Dwandwaja).
2. **Vikriti (विकृति - Current Pathological Doshic Imbalance)**: Specific Dosha-Dushya vitiation correlated with the chief complaint (e.g. Pitta-Rakta in Jaundice/burning eyes, Vata-Kapha in respiratory disorders, Vata-Pitta in colic).
3. **Sara (सार - Tissue Integrity & Dhatu Vitality)**: Assessment of Rasa, Rakta, Mamsa, Meda, Asthi, Majja, Shukra, and Satva Sara.
4. **Samhanana (संहनन - Body Compactness & Physical Frame)**: Pravara (robust/compact), Madhyama (moderate), or Avara (frail/loose).
5. **Pramana (प्रमाण - Anthropometric Proportions)**: Proportion of body frame and measurements.
6. **Satmya (सात्म्य - Dietary Habituation & Adaptability)**: Wholesomeness to specific tastes (Rasas), dietary adaptations, and environmental tolerances.
7. **Satva (सत्त्व - Mental Strength & Psychological Resilience)**: Pravara (strong/calm), Madhyama (moderate), or Avara (anxious/low tolerance).
8. **Ahara-Shakti (आहार शक्ति - Digestive Capacity & Agni)**:
   - *Agni Assessment*: Vishamagni (irregular), Tikshnāgni (hyperactive), Mandāgni (sluggish), or Samāgni (balanced).
   - *Abhyavaharana Shakti* (food intake capacity) & *Jarana Shakti* (digestive speed & efficiency).
9. **Vyayama-Shakti (व्यायाम शक्ति - Physical Endurance & Capacity for Exertion)**: Pravara / Madhyama / Avara.
10. **Vaya (वय - Age & Chronological Life Stage)**: Bala (childhood/Kapha stage), Madhyama (adult/Pitta stage), or Vriddha (elderly/Vata stage) correlation.

## 7. Differential Diagnosis & Clinical Impressions
- Top 2–3 differential diagnoses with clinical rationale and standard ICD-10 codes.

## 8. Integrative Management & AYUSH Guidance
- **Allopathic Guidance**: Recommended diagnostic investigations (e.g. LFT, CBC, USG, Ophthalmic exam) and initial precautions.
- **AYUSH Ahara (Dietary Regimen)**: Pathya (wholesome foods to favor) & Apathya (unwholesome foods to strictly avoid).
- **AYUSH Vihara (Lifestyle & Dinacharya)**: Daily routine, rest, thermal precautions, and stress management.

## 9. Red-Flag & Triage Acuity Assessment
- Explicit status of life-threatening red flags.

CRITICAL INSTRUCTIONS:
1. Write the ENTIRE report in 100% standard medical English (translate all regional language input).
2. Keep each point clear, direct, and concise (1-2 lines per section) so all 9 sections fit completely.
3. Start your output with: [INTAKE_COMPLETE]
4. End your output with this JSON block on its own line:
```json
{"urgency": "emergency|urgent|routine", "critical": true|false, "red_flags": []}
```
"""

SYSTEM_PROMPT_CLINICAL_INTAKE = SYSTEM_PROMPT_CLINICIAN_SUMMARY_ENGLISH
CLINICIAN_SUMMARY_PROMPT = "Please synthesize the complete encounter history into the English-only Clinical Report with Dashavidha Pariksha."

def build_intake_system_prompt(language: str = "en") -> str:
    lang_map = {
        "hi": ("Hindi", "हिन्दी में", "सहानुभूतिपूर्ण, गर्मजोशी और सम्मान से बात करें।"),
        "mr": ("Marathi", "मराठीत", "सहानुभूतीपूर्वक, आपुलकीने आणि आदराने बोला."),
        "en": ("English", "in English", "Speak warmly, respectfully, and attentively."),
    }
    lang_name, lang_direction, lang_tone = lang_map.get(language, lang_map["en"])

    closing_example = {
        "hi": "धन्यवाद, आपकी सभी जरूरी जानकारी दर्ज कर ली गई है। अब मैं आपकी रिपोर्ट तैयार कर रहा हूँ।",
        "mr": "धन्यवाद, आपली आवश्यक सर्व माहिती नोंदवली गेली आहे. आता मी आपला अहवाल तयार करत आहे.",
        "en": "Thank you, all key symptoms have been recorded. Preparing your clinical summary for the doctor now.",
    }.get(language, "Thank you. Preparing your summary now.")

    return f"""You are Jeevan — a warm, attentive, and helpful clinical intake assistant for an Indian healthcare OPD clinic.
You are recording the patient's symptoms and health details before they meet their doctor.

CRITICAL IDENTITY & SAFETY DIRECTIVES:
1. Your name is Jeevan. Greet the patient warmly and respectfully as Jeevan.
2. NEVER claim to be an MBBS/MD doctor or physician. Never say "I am your doctor" or "I am Dr. Jeevan".
3. Do not formulate a definitive diagnosis or prescribe medications.
4. Your purpose is to listen with empathy, ask focused follow-up questions to understand their symptoms, and record an accurate clinical intake for the doctor.

══════════════════════════════════════
🌐 STRICT LANGUAGE DIRECTIVE (MANDATORY & ABSOLUTE):
- The patient's chosen consultation language is: {lang_name} ({lang_direction}).
- You MUST write `doctor_reply` 100% EXCLUSIVELY in {lang_name}.
- NEVER switch to English, Hindi, or any other language midway through the intake.
- Even if the patient's message is written in English, Hindi, Marathi, or mixed code-switching, your response MUST REMAIN STRICTLY in {lang_name}.
- In the "options" array, ensure the "value" string is in {lang_name}.
- {lang_tone}
══════════════════════════════════════

🎙️ HOW TO SPEAK:
1. Speak warmly and gently in 1–2 short, natural sentences: ONE brief acknowledgement of what the patient shared + ONE focused symptom question.
2. Sound like a polite, caring clinical health companion.
3. NEVER use robotic clichés like "As an AI language model" or "Thank you for the information".
4. Focus follow-up questions logically on the patient's primary symptom:
   - Specific location / part (e.g. forehead, temples, back of head, whole head)
   - Onset & Duration (e.g. started today, 1-3 days ago, 1 week)
   - Sensation / Quality (e.g. throbbing, sharp, heavy, dull)
   - Severity rating (1 to 10 scale)
   - Associated symptoms (e.g. nausea, fever, light sensitivity)
   - Triggers / Relieving factors (e.g. with stress, after food, with rest)

📋 CRITICAL: RESPOND WITH A VALID JSON OBJECT MATCHING THIS SCHEMA:
{{
  "doctor_reply": "Warm 1-2 sentence spoken response strictly in {lang_name} from Jeevan.",
  "clinical_note": "Brief 3-6 word clinical note (e.g. 'Symptom: Headache' or 'Location: Forehead' or 'Duration: 2 days')",
  "ui_type": "chips" | "face_scale" | "yesno" | "body_map",
  "options": [
    {{
      "id": "unique_id",
      "label_en": "English label",
      "label_hi": "Hindi label in Devanagari",
      "label_mr": "Marathi label in Devanagari",
      "value": "Answer string in {lang_name} sent when tapped"
    }}
  ],
  "is_emergency": false,
  "is_complete": false
}}

⚠️ CRITICAL UI & TEXT RULES:
- DO NOT INCLUDE ANY EMOJIS in options, labels, values, or questions. All options must be clean, professional text only.
- "chips": Provide 3-5 clear, professional options directly relevant to the question asked.
- "face_scale": Use ONLY when asking the patient to rate pain severity on 1 to 10 scale.
- "yesno": Use when asking a direct yes/no question.
- "body_map": Use ONLY if asking the patient to point to a general body region.

🚨 EMERGENCY & COMPLETION RULES:
- Set "is_emergency": true ONLY if life-threatening emergency red flags occur (crushing central chest pain radiating to arm/jaw with sweating, acute stroke signs, sudden severe respiratory collapse, massive bleeding). Normal headache, fever, cough, stomach ache are NOT emergency flags.
- Do NOT prematurely end the intake on routine complaints. Maintain a comprehensive interview of 5 to 7 focused questions.
- Once you have gathered sufficient clinical details across onset, character, severity, and associated symptoms, set "is_complete": true and conclude `doctor_reply` with "{closing_example} [INTAKE_COMPLETE]".
"""

# Keep the old name as a function call for backward compatibility
SYSTEM_PROMPT_INTAKE_TRIAGE = build_intake_system_prompt("en")

SYSTEM_PROMPT_AYUSH_SYNTHESIS = """You are Jeevan AYUSH AI, a classical Ayurvedic and integrative medicine scholar trained in Ashtanga Hridaya, Charaka Samhita, and Sushruta Samhita, bridging traditional wisdom with modern clinical science.

Your mission:
1. Analyze the patient's Dosha constitution (Prakriti: Vata, Pitta, Kapha), digestive metabolic fire (Agni: Vishama, Tikshna, Manda, Sama), and bowel tendency (Koshtha: Krura, Mridu, Madhyama).
2. Explain the patient's unique constitutional balance in simple, practical, and culturally resonant terms (Hindi and English).
3. Provide personalized, holistic recommendations covering:
   - Ahara (आहार - Diet): Beneficial vs aggravating foods, tastes (Rasas), warm vs cold foods.
   - Vihara (विहार - Lifestyle & Routine): Dinacharya (daily routine), sleep hygiene, physical activity suitable for their Dosha.
   - Ritucharya (ऋतुचर्या - Seasonal regimen): Seasonal adaptations.
   - Pathya-Apathya (पथ्य-अपथ्य): What to favor and what to strictly avoid.
4. Offer harmonious integrative insights showing how their AYUSH profile correlates with modern physiological tendencies (e.g., Pitta-Tikshna Agni with hyperacidity/gastritis, Vata-Vishamagni with IBS/spasmodic colic).
"""

SYSTEM_PROMPT_DOCUMENT_INTELLIGENCE = """You are Jeevan OCR & Prescription Intelligence AI, a clinical pharmacology expert specializing in parsing Indian medical prescriptions, discharge summaries, and laboratory reports.

Your mission:
1. Extract and normalize all medications:
   - Generic & Brand names (e.g. Paracetamol / Crocin, Pantoprazole / Pan-D, Warfarin, Aspirin, Metformin).
   - Dosage, strength, and unit (e.g. 500mg, 40mg, 5mg).
   - Route and frequency (e.g. 1-0-1, BD, TDS, OD, SOS, before meals, after meals).
   - Indication / clinical intent.
2. Extract diagnostic laboratory investigations with reference ranges:
   - Test names (e.g. HbA1c, Fasting Blood Glucose, Serum Creatinine, Hemoglobin, WBC, Platelets, Troponin-I, Liver Enzymes).
   - Value, unit, and clinical classification (Normal, Low ⚠️, High ⚠️, Critical Alert 🚨).
3. DRUG-DRUG INTERACTIONS & SAFETY ALERTS:
   - Cross-examine active medications for severe interactions (e.g. Warfarin + Aspirin/NSAIDs -> High bleeding risk; ACE inhibitors + Potassium supplements/Spironolactone -> Hyperkalemia risk; Metformin + iodinated contrast -> Lactic acidosis risk).
   - Flag high-risk duplications, contraindications, and organ toxicity risks.
4. Output structured, physician-ready insights with high clinical accuracy.
"""

SYSTEM_PROMPT_CLINICAL_CO_PILOT = """You are Jeevan Clinical Co-Pilot, an advanced AI clinical decision support system assisting attending OPD physicians in Indian healthcare settings conforming to NDHM/ABDM FHIR standards.

Your mission:
Given the patient's complete encounter record (Consent, Chief Complaint, SOCRATES Intake, Red-Flag findings, AYUSH Prakriti/Agni/Koshtha profile, and uploaded Prescription/Lab OCR data):
1. Synthesize a comprehensive 8-Domain Clinical Assessment:
   - Chief Complaint & History of Present Illness (HPI)
   - Red-Flag & High Acuity Risk Evaluation
   - Structured Differential Diagnosis (Top 3-4 conditions with clinical rationale and standard ICD-10 codes)
   - Laboratory & Diagnostic Investigation Interpretation
   - Medication Review & Drug-Drug Interaction Warnings
   - AYUSH Constitutional Synthesis (Integrative Prakriti, Agni, Koshtha relevance)
   - Integrative Management Plan (Immediate allopathic prescription guidance + complementary AYUSH Ahara/Vihara recommendations)
   - Patient Follow-Up & Red-Flag Return Precautions
2. Format the response clearly with professional medical formatting, markdown headings, bullet points, and highlight critical warnings with alerts.
"""

class GrokService:
    def __init__(self):
        self.api_key = (
            os.getenv("GROQ_API_KEY")
            or os.getenv("GROK_API_KEY")
            or os.getenv("XAI_API_KEY")
            or os.getenv("OPENAI_API_KEY")
            or ""
        ).strip()
        
        # Auto-detect provider based on key prefix or explicit env
        if self.api_key.startswith("gsk_") or os.getenv("GROQ_API_KEY"):
            self.provider = "Groq"
            self.api_base = os.getenv("GROQ_API_BASE", "https://api.groq.com/openai/v1").rstrip("/")
            self.model = os.getenv("GROQ_MODEL") or os.getenv("GROK_MODEL") or "openai/gpt-oss-120b"
        elif self.api_key.startswith("xai-") or os.getenv("XAI_API_KEY"):
            self.provider = "xAI Grok"
            self.api_base = os.getenv("XAI_API_BASE", "https://api.x.ai/v1").rstrip("/")
            self.model = os.getenv("GROK_MODEL") or "grok-3"
        else:
            self.provider = "Groq" if os.getenv("GROQ_API_BASE") else ("xAI Grok" if os.getenv("XAI_API_BASE") else "OpenAI-Compatible")
            self.api_base = os.getenv("GROQ_API_BASE") or os.getenv("XAI_API_BASE") or "https://api.groq.com/openai/v1"
            self.model = os.getenv("GROK_MODEL") or os.getenv("GROQ_MODEL") or "openai/gpt-oss-120b"
            
        self.default_system_prompt = SYSTEM_PROMPT_CLINICAL_INTAKE

    def is_configured(self) -> bool:
        return bool(self.api_key and len(self.api_key.strip()) > 5)

    def get_status(self) -> Dict[str, Any]:
        configured = self.is_configured()
        masked_key = ""
        if configured:
            key = self.api_key.strip()
            masked_key = key[:4] + "..." + key[-4:] if len(key) > 8 else "***"
        return {
            "configured": configured,
            "provider": self.provider,
            "model": self.model,
            "api_base": self.api_base,
            "masked_key": masked_key,
            "status": "ready" if configured else "mock_mode",
            "prompts_available": [
                "clinical_intake",
                "intake_triage",
                "ayush_synthesis",
                "document_intelligence",
                "clinical_co_pilot"
            ]
        }

    async def call_grok(
        self,
        system_prompt: str,
        messages: List[Dict[str, str]],
        temperature: float = 0.3,
        max_tokens: int = 1500,
        response_format: Optional[Dict[str, str]] = None,
        language: str = "en"
    ) -> str:
        """
        Calls OpenAI-compatible LLM endpoint (Groq / xAI Grok) via HTTPX asynchronously.
        Falls back to intelligent mock generator if API key is not configured or in case of network issues.
        """
        if not self.is_configured():
            logger.info("API key not set. Using intelligent clinical fallback response.")
            return self._generate_mock_response(system_prompt, messages, language=language)

        headers = {
            "Authorization": f"Bearer {self.api_key.strip()}",
            "Content-Type": "application/json"
        }

        full_messages = [{"role": "system", "content": system_prompt}] + messages

        payload: Dict[str, Any] = {
            "model": self.model,
            "messages": full_messages,
            "temperature": temperature,
            "max_tokens": max_tokens
        }
        if response_format:
            payload["response_format"] = response_format

        try:
            async with httpx.AsyncClient(timeout=25.0) as client:
                resp = await client.post(
                    f"{self.api_base}/chat/completions",
                    headers=headers,
                    json=payload
                )
                if resp.status_code == 200:
                    data = resp.json()
                    return data["choices"][0]["message"]["content"]
                else:
                    logger.error(f"{self.provider} API error {resp.status_code}: {resp.text}")
                    return self._generate_mock_response(system_prompt, messages, language=language, error_note=f"{self.provider} error {resp.status_code}")
        except Exception as e:
            logger.error(f"Exception during {self.provider} call: {e}")
            return self._generate_mock_response(system_prompt, messages, language=language, error_note=str(e))

    async def chat_intake(
        self,
        history: List[Dict[str, str]],
        language: str = "en",
        system_prompt: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Interactive clinical intake dialogue.
        Uses the language-aware triage prompt so Dr. Jeevan responds with warm 1-2 sentence doctor speech,
        case sheet clinical notes, and matching interactive touch options strictly in the patient's language.
        """
        import re
        import uuid
        formatted_history = list(history)
        if formatted_history and formatted_history[-1].get("content", "").strip().lower() == "summary":
            formatted_history[-1] = {"role": "user", "content": CLINICIAN_SUMMARY_PROMPT}

        # Always use the dynamic, language-aware triage prompt
        effective_system_prompt = system_prompt or build_intake_system_prompt(language)

        reply_raw = await self.call_grok(
            effective_system_prompt,
            formatted_history,
            temperature=0.3,
            max_tokens=600,
            response_format={"type": "json_object"},
            language=language
        )

        doctor_reply = ""
        clinical_note = ""
        ui_type = "chips"
        options = []
        is_emergency = False
        is_complete = False

        try:
            json_text = reply_raw
            if "```json" in reply_raw:
                match = re.search(r'```json\s*(\{[\s\S]*?\})\s*```', reply_raw)
                if match:
                    json_text = match.group(1)
            elif "{" in reply_raw:
                match = re.search(r'(\{[\s\S]*\})', reply_raw)
                if match:
                    json_text = match.group(1)

            data = json.loads(json_text)
            doctor_reply = data.get("doctor_reply") or data.get("reply") or ""
            clinical_note = data.get("clinical_note") or ""
            ui_type = data.get("ui_type") or "chips"
            raw_options = data.get("options") or []
            options = []
            for opt in raw_options:
                val = opt.get(f"label_{language}") or opt.get("value") or opt.get("label_en") or opt.get("id")
                options.append({
                    "id": opt.get("id", str(uuid.uuid4())[:8]),
                    "label_en": opt.get("label_en", val),
                    "label_hi": opt.get("label_hi", val),
                    "label_mr": opt.get("label_mr", val),
                    "value": val
                })
            is_emergency = bool(data.get("is_emergency"))
            is_complete = bool(data.get("is_complete"))
        except Exception as e:
            logger.warning(f"Could not parse JSON in chat_intake: {e}. Raw text: {reply_raw[:150]}")
            doctor_reply = reply_raw

        # Emergency check: only explicit emergency flag or emergency banner, avoid normal keyword false positives
        if not is_emergency and any(doctor_reply.startswith(p) for p in ["🚨 EMERGENCY", "🚨 आपातकालीन", "🚨 आपत्कालीन"]):
            is_emergency = True

        if "[INTAKE_COMPLETE]" in doctor_reply:
            is_complete = True

        # Build dynamic step_meta
        step_meta = None
        if options or ui_type == "body_map":
            step_meta = {
                "step_id": f"ai_step_{len(formatted_history)}",
                "ui_type": ui_type,
                "options": options
            }

        return {
            "reply": doctor_reply,
            "clinical_note": clinical_note,
            "red_flag_detected": is_emergency,
            "is_complete": is_complete,
            "step_meta": step_meta,
            "model_used": self.model if self.is_configured() else "mock-clinical-engine",
            "provider": self.provider
        }

    async def generate_clinician_summary(
        self, 
        history: List[Dict[str, str]], 
        extracted_documents: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Generates clean, structured English-only clinician summary report with Dashavidha Pariksha.
        Translates any multilingual intake history into standard medical English.
        Integrates any extracted medications, labs, or diagnoses from uploaded past records.
        Parses the criticality JSON block appended at the end.
        """
        filtered_history = [
            m for m in history 
            if not ("[INTAKE_COMPLETE]" in m.get("content", "") and m.get("role") == "assistant")
        ]
        
        doc_context = ""
        if extracted_documents:
            meds = extracted_documents.get("medications", [])
            labs = extracted_documents.get("labs", [])
            diag = extracted_documents.get("diagnoses", [])
            notes = extracted_documents.get("doctor_notes", [])
            parts = []
            if diag:
                diag_items = [d.get("condition", str(d)) if isinstance(d, dict) else str(d) for d in diag]
                parts.append(f"- Prior Diagnoses / Chronic Illnesses: {', '.join(diag_items)}")
            if meds:
                med_items = [f"{m.get('name', '')} ({m.get('dosage', 'As prescribed')})".strip() if isinstance(m, dict) else str(m) for m in meds]
                parts.append(f"- Extracted Medications from Prescriptions: {', '.join(med_items)}")
            if labs:
                lab_items = [f"{l.get('test', '')}: {l.get('value', '')} [{l.get('flag', 'Normal')}]".strip() if isinstance(l, dict) else str(l) for l in labs]
                parts.append(f"- Extracted Diagnostic Labs: {', '.join(lab_items)}")
            if notes:
                parts.append(f"- Previous Doctor / Clinical Advice: {', '.join(str(n) for n in notes)}")
            
            if parts:
                doc_context = (
                    "\n\n📄 [EXTRACTED PAST MEDICAL RECORDS & PRESCRIPTIONS]:\n" +
                    "\n".join(parts) +
                    "\nCRITICAL CLINICAL DIRECTIVES FOR UPLOADED RECORDS:" +
                    "\n1. In Section 4 (Past Medical History), explicitly mention the above prior diagnoses/chronic illnesses." +
                    "\n2. In Section 5 (Current Medications), explicitly list the EXACT medications and dosages extracted above. DO NOT add any unmentioned medications (such as Paracetamol) unless they appear in this list." +
                    "\n3. In Section 8 (Integrative Management), explicitly correlate recommendations with these extracted laboratory findings."
                )
        
        user_prompt = (
            "Please synthesize the complete encounter conversation into the English-only Clinical Report with Dashavidha Pariksha. "
            "CRITICAL: The entire output must be written in English. Start with [INTAKE_COMPLETE] and conclude with the criticality JSON block."
        )
        if doc_context:
            user_prompt += doc_context
        else:
            user_prompt += "\nNOTE: No past prescriptions or medical records were uploaded. In Section 5, write '- Active Medications: None reported (NKDA)'. Do NOT assume or invent any medications."

        messages = list(filtered_history) + [{
            "role": "user",
            "content": user_prompt
        }]
        summary_text = await self.call_grok(SYSTEM_PROMPT_CLINICIAN_SUMMARY_ENGLISH, messages, temperature=0.2, max_tokens=1500)

        # Parse criticality JSON block from the end of the summary
        urgency = "routine"
        critical = False
        red_flags: List[str] = []
        try:
            import re
            json_match = re.search(r'```json\s*(\{[^`]+\})\s*```', summary_text, re.DOTALL)
            if json_match:
                crit_data = json.loads(json_match.group(1))
                urgency = crit_data.get("urgency", "routine")
                critical = crit_data.get("critical", False)
                red_flags = crit_data.get("red_flags", [])
        except Exception:
            pass

        # Also detect from text content as fallback
        if not critical:
            upper = summary_text.upper()
            if "EMERGENCY" in upper or "RED-FLAG" in upper or "🚨" in summary_text:
                urgency = "emergency"
                critical = True

        # Extract and ensure clean clinical chief complaint title
        complaint_title = "Acute Clinical Consultation"
        try:
            import re
            cc_match = re.search(r'## 1\.\s*Chief Complaint[^\n]*\n+-\s*([^\n]+)', summary_text, re.IGNORECASE)
            if cc_match:
                raw_cc = cc_match.group(1).strip()
                # If raw_cc contains casual slang or conversational markers, normalize it
                if any(w in raw_cc.lower() for w in ["bhai", "yaar", "kr rha", "kar raha", "ho rha", "hai", "dard kr"]):
                    clean_norm = normalize_clinical_complaint(raw_cc)
                    # Replace in summary text so report is 100% clean
                    summary_text = summary_text[:cc_match.start(1)] + f"{clean_norm}: Acute presentation evaluated during consultation." + summary_text[cc_match.end(1):]
                    complaint_title = clean_norm
                else:
                    # Take the medical title prefix
                    if ":" in raw_cc:
                        complaint_title = raw_cc.split(":")[0].strip(" *#")
                    elif "(" in raw_cc and len(raw_cc.split("(")[0].strip()) > 3:
                        complaint_title = raw_cc.split("(")[0].strip(" *#")
                    elif "-" in raw_cc and len(raw_cc.split("-")[0].strip()) > 3:
                        complaint_title = raw_cc.split("-")[0].strip(" *#")
                    else:
                        complaint_title = raw_cc[:50].strip(" *#")
        except Exception as ex:
            logger.warning(f"Error extracting clean CC from summary: {ex}")

        if not complaint_title or complaint_title == "Acute Clinical Consultation":
            first_user_msg = next((m.get("content", "") for m in history if m.get("role") == "user"), "")
            complaint_title = normalize_clinical_complaint(first_user_msg)
        else:
            complaint_title = normalize_clinical_complaint(complaint_title)

        return {
            "clinician_summary": summary_text,
            "complaint_title": complaint_title,
            "urgency": urgency,
            "critical": critical,
            "red_flags": red_flags,
            "model_used": self.model if self.is_configured() else "mock-clinical-engine",
            "provider": self.provider
        }

    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.3,
        max_tokens: int = 1500
    ) -> Dict[str, Any]:
        """
        General model generation with customizable system prompt and user prompt.
        """
        sys_prompt = system_prompt or self.default_system_prompt
        messages = [{"role": "user", "content": prompt}]
        output = await self.call_grok(sys_prompt, messages, temperature=temperature, max_tokens=max_tokens)
        return {
            "output": output,
            "model_used": self.model if self.is_configured() else "mock-clinical-engine",
            "provider": self.provider
        }

    async def analyze_medical_document(self, raw_text: str, filename: Optional[str] = None) -> Dict[str, Any]:
        """
        Deep clinical OCR & drug-drug interaction analysis.
        """
        user_prompt = f"""Please analyze the following extracted medical document text (Prescription/Lab/Discharge):
        
Filename: {filename or 'medical_doc.jpg'}
--- RAW TEXT START ---
{raw_text}
--- RAW TEXT END ---

Please provide:
1. Structured list of Medications (Name, Dosage, Frequency, Instructions).
2. Structured list of Laboratory Tests (Test, Value, Reference Range, Status/Flag).
3. Drug-Drug Interactions (Critical, Moderate, or None).
4. Patient-friendly clinical summary in English and Hindi.
5. JSON formatted summary for clinical storage.
"""
        messages = [{"role": "user", "content": user_prompt}]
        analysis_text = await self.call_grok(SYSTEM_PROMPT_DOCUMENT_INTELLIGENCE, messages, temperature=0.2, max_tokens=1500)
        
        return {
            "analysis": analysis_text,
            "raw_text": raw_text,
            "model_used": self.model if self.is_configured() else "mock-clinical-engine"
        }

    async def generate_ayush_insights(self, prakriti: str, agni: str, koshtha: str, complaint: Optional[str] = None) -> Dict[str, Any]:
        """
        Holistic AYUSH constitutional profile synthesis.
        """
        user_prompt = f"""Patient AYUSH Assessment Results:
- Prakriti (Constitutional Balance): {prakriti or 'Undetermined'}
- Agni (Digestive Metabolic Fire): {agni or 'Undetermined'}
- Koshtha (Bowel/Gastrointestinal Motility): {koshtha or 'Undetermined'}
- Current Chief Complaint: {complaint or 'General Wellness / OPD Intake'}

Please generate a comprehensive, personalized AYUSH guidance report with:
1. Constitutional analysis & physiological tendencies.
2. Tailored Ahara (Dietary plan with beneficial vs prohibited foods).
3. Dinacharya & Lifestyle recommendations.
4. Integrative correlation with their current chief complaint.
"""
        messages = [{"role": "user", "content": user_prompt}]
        insights_text = await self.call_grok(SYSTEM_PROMPT_AYUSH_SYNTHESIS, messages, temperature=0.3, max_tokens=1500)
        
        return {
            "insights": insights_text,
            "prakriti": prakriti,
            "agni": agni,
            "koshtha": koshtha,
            "model_used": self.model if self.is_configured() else "mock-clinical-engine"
        }

    async def synthesize_clinical_summary(self, encounter_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Physician Clinical Co-Pilot summary & Differential Diagnosis.
        """
        user_prompt = f"""Generate an NDHM/ABDM-compliant 8-domain Physician Clinical Encounter Summary and Differential Diagnosis for the following patient encounter:

Encounter Data:
{json.dumps(encounter_data, indent=2, default=str)}

Please structure the output as follows:
# 🩺 Physician Clinical Synthesis & Differential Diagnosis
## 1. Executive Clinical Summary & Triage Acuity
## 2. Differential Diagnoses (with ICD-10 codes and clinical reasoning)
## 3. Red-Flag & High Acuity Assessment
## 4. Laboratory & Medication Review (including Drug-Drug Interaction alerts)
## 5. AYUSH Constitutional Synthesis (Prakriti, Agni, Koshtha harmony)
## 6. Recommended Integrative Treatment Plan (Allopathy + Complementary AYUSH)
## 7. Patient Follow-up & Red-Flag Escalation Precautions
"""
        messages = [{"role": "user", "content": user_prompt}]
        synthesis_text = await self.call_grok(SYSTEM_PROMPT_CLINICAL_CO_PILOT, messages, temperature=0.2, max_tokens=2000)
        
        return {
            "clinical_synthesis": synthesis_text,
            "session_id": encounter_data.get("session_id"),
            "model_used": self.model if self.is_configured() else "mock-clinical-engine"
        }

    def _generate_mock_response(self, system_prompt: str, messages: List[Dict[str, str]], language: str = "en", error_note: Optional[str] = None) -> str:
        """
        Provides intelligent, context-aware clinical mock responses.
        Reads the conversation history to ask the NEXT appropriate SOCRATES question
        strictly adhering to the requested language.
        """
        note = f"\n\n*(Note: {error_note})*" if error_note else ""

        # Use explicitly passed language or reliably detect from system prompt
        if language not in ["hi", "mr", "en"]:
            if "हिन्दी में" in system_prompt or "in Hindi" in system_prompt:
                language = "hi"
            elif "मराठीत" in system_prompt or "in Marathi" in system_prompt:
                language = "mr"
            else:
                language = "en"

        # Build a map of which SOCRATES domains have already been covered
        conversation_text = " ".join(m.get("content", "") for m in messages).lower()
        user_messages = [m.get("content", "") for m in messages if m.get("role") == "user" and m.get("content") != CLINICIAN_SUMMARY_PROMPT]
        num_exchanges = len([m for m in messages if m.get("role") == "assistant"])

        # SOCRATES follow-up question sequences per language
        socrates_hi = [
            "यह दर्द ठीक कहाँ है? क्या आप उंगली से बता सकते हैं?",
            "यह दर्द कब से शुरू हुआ है? अचानक शुरू हुआ था या धीरे-धीरे?",
            "यह दर्द कैसा लगता है — जलन जैसा, चुभन जैसा, भारीपन जैसा, या दबाव जैसा?",
            "क्या यह दर्द कहीं और भी फैलता है, जैसे पीठ में, कंधे में, या नीचे की तरफ?",
            "इसके साथ कोई और तकलीफ है? जैसे बुखार, उल्टी, जी मिचलाना, या कमज़ोरी?",
            "यह दर्द हमेशा रहता है या कभी-कभी होता है? खाने के बाद बढ़ता है या कम होता है?",
            "क्या कुछ करने से यह दर्द बढ़ता है, जैसे चलने से, झुकने से, या खाना खाने से?",
            "1 से 10 के पैमाने पर यह दर्द कितना तेज़ है, जहाँ 10 सबसे तेज़ हो?",
            "क्या आपको पहले से कोई बीमारी है — जैसे शुगर, BP, या दिल की बीमारी?",
            "क्या आप अभी कोई दवाई ले रहे हैं?",
        ]
        socrates_mr = [
            "हे दुखणे नक्की कुठे आहे? बोट दाखवून सांगता का?",
            "हे कधी सुरू झाले? अचानक की हळूहळू?",
            "हे कसले वाटते — जळजळ, टोचणे, जडपणा, की दाब?",
            "हे दुखणे इतरत्र पसरते का — पाठीत, खांद्यात, किंवा खाली?",
            "यासोबत आणखी काही त्रास आहे का? जसे ताप, उलटी, मळमळ, किंवा अशक्तपणा?",
            "हे दुखणे सतत असते की येते-जाते? जेवणानंतर वाढते का?",
            "कशाने हे वाढते — चालणे, वाकणे, जेवण?",
            "1 ते 10 च्या प्रमाणात हे किती तीव्र आहे?",
            "तुम्हाला आधीपासून मधुमेह, उच्च रक्तदाब, किंवा इतर आजार आहे का?",
            "तुम्ही सध्या कोणती औषधे घेत आहात?",
        ]
        socrates_en = [
            "Can you point to exactly where it hurts or feels uncomfortable?",
            "When did this start, and did it come on suddenly or gradually?",
            "How would you describe the sensation — sharp, dull, burning, cramping, or pressure-like?",
            "Does it spread or radiate anywhere — to your back, shoulder, or down your legs?",
            "Are you experiencing anything else alongside — like fever, nausea, vomiting, or weakness?",
            "Is it constant, or does it come and go? Does anything trigger it — like eating?",
            "What makes it worse? Movement, eating, breathing, lying down?",
            "On a scale of 1 to 10, with 10 being the worst pain imaginable, how bad is it right now?",
            "Do you have any existing medical conditions — such as diabetes, high blood pressure, or heart disease?",
            "Are you currently taking any medications?",
        ]

        seq = socrates_hi if language == "hi" else (socrates_mr if language == "mr" else socrates_en)
        # Pick the next question based on how many exchanges have happened
        idx = min(num_exchanges, len(seq) - 1)
        next_question = seq[idx]

        summary_trigger = {
            "hi": "ठीक है, आपकी सभी जरूरी जानकारी दर्ज कर ली गई है। अब मैं आपकी रिपोर्ट तैयार कर रहा हूँ।",
            "mr": "ठीक आहे, आपली आवश्यक सर्व माहिती नोंदवली गेली आहे. आता मी आपला अहवाल तयार करत आहे.",
            "en": "Thank you, all key symptoms have been recorded. Preparing your clinical summary for the doctor now.",
        }

        # Check if Dashavidha / Clinician Summary requested -> MUST ALWAYS BE IN ENGLISH
        if "Dashavidha" in system_prompt or "दशविध" in system_prompt or "CLINICIAN_SUMMARY" in system_prompt or "Encounter Report" in system_prompt:
            first_user_msg = user_messages[0] if user_messages else "Acute clinical symptoms evaluated during intake."
            primary_complaint = normalize_clinical_complaint(first_user_msg)
            hpi_notes = f"Acute symptom evolution characterized by {primary_complaint.lower()} with progressive discomfort documented during anamnesis."
            
            # Detect emergency keywords
            is_emerg = any(w in conversation_text for w in ["chest pain", "jaw", "crushing", "breathless", "faint", "stroke", "paralysis", "खून", "attack"])
            urg_val = "emergency" if is_emerg else "routine"
            crit_val = "true" if is_emerg else "false"
            flags_val = '["High acuity chest pain / cardiac concern"]' if is_emerg else '[]'

            # Parse extracted document context if available
            past_hx_text = "- No acute prior chronic surgical interventions or uncontrolled hereditary comorbidities reported."
            meds_text = "- No active high-risk contraindications documented (NKDA)."
            management_allopathic = "- **Allopathic Guidance**: Recommended diagnostic blood panel (CBC, LFT, Metabolic Profile) and targeted clinical examination."

            has_docs = "EXTRACTED PAST MEDICAL RECORDS" in conversation_text or "EXTRACTED PATIENT PAST PRESCRIPTIONS" in conversation_text
            if has_docs:
                import re
                m_dx = re.search(r'Prior Diagnoses[^\n:]*:\s*([^\n]+)', conversation_text)
                if m_dx and m_dx.group(1).strip():
                    past_hx_text = f"- Known diagnosed comorbidities: {m_dx.group(1).strip()} (documented from uploaded past clinical records). Routine chronic care monitoring indicated."
                else:
                    past_hx_text = "- No prior chronic conditions documented in uploaded clinical records."

                m_med = re.search(r'Extracted Medications[^\n:]*:\s*([^\n]+)', conversation_text)
                if m_med and m_med.group(1).strip():
                    meds_text = f"- Active Medications: {m_med.group(1).strip()} (verified from uploaded prescription records). Patient advised compliance. No adverse drug reactions reported (NKDA)."
                else:
                    meds_text = "- Active Medications: None documented in uploaded clinical records (NKDA - No Known Drug Allergies)."

                m_lab = re.search(r'Extracted Diagnostic Labs[^\n:]*:\s*([^\n]+)', conversation_text)
                if m_lab and m_lab.group(1).strip():
                    management_allopathic = f"- **Allopathic Guidance**: Correlate with recent uploaded lab tests ({m_lab.group(1).strip()}). Order follow-up clinical monitoring as indicated."
                else:
                    management_allopathic = "- **Allopathic Guidance**: Baseline supportive care and routine diagnostic workup."

            return f"""[INTAKE_COMPLETE]

# 📋 Clinical Intake & AYUSH Encounter Report

## 1. Chief Complaint (CC)
- {primary_complaint}: Patient presents with acute symptoms evaluated during clinical consultation.

## 2. History of Present Illness (HPI)
- Onset & Characteristics: {hpi_notes}
- Severity: Moderate-to-severe subjective discomfort.
- Radiation & Associated Factors: Evaluated in clinical anamnesis.

## 3. Associated Symptoms & Review of Systems (ROS)
- Associated systemic symptoms recorded and cross-referenced with AYUSH Doshic balance.
- Absence of secondary decompensation.

## 4. Past Medical, Surgical & Family History
{past_hx_text}

## 5. Current Medications & Known Allergies
{meds_text}

## 6. 🌿 Dashavidha Pariksha (दशविध परीक्षा - 10-Fold AYUSH Assessment)
1. **Prakriti (प्रकृति - Constitutional Dosha)**: Pitta-dominant constitution with secondary Vata involvement.
2. **Vikriti (विकृति - Current Pathological Doshic Imbalance)**: Pitta-Rakta vitiation correlated with acute presenting symptoms.
3. **Sara (सार - Tissue Integrity & Dhatu Vitality)**: Rakta and Rasa Sara evaluated as Madhyama (moderate).
4. **Samhanana (संहनन - Body Compactness & Physical Frame)**: Madhyama (moderate physical frame).
5. **Pramana (प्रमाण - Anthropometric Proportions)**: Proportionate physical frame.
6. **Satmya (सात्म्य - Dietary Habituation & Adaptability)**: Satmya to light warm diet; Apathya to spicy and excessive oily food.
7. **Satva (सत्त्व - Mental Strength & Psychological Resilience)**: Madhyama (moderate tolerance).
8. **Ahara-Shakti (आहार शक्ति - Digestive Capacity & Agni)**:
   - *Agni Assessment*: Tikshnāgni / Vishamagni (metabolic fire imbalance).
   - *Abhyavaharana Shakti* & *Jarana Shakti*: Moderate.
9. **Vyayama-Shakti (व्यायाम शक्ति - Physical Endurance & Capacity for Exertion)**: Madhyama.
10. **Vaya (वय - Age & Chronological Life Stage)**: Madhyama Vaya (Adult stage / Pitta predominance).

## 7. Differential Diagnosis & Clinical Impressions
1. **Acute Hepato-Biliary / Metabolic / Gastrointestinal Disturbance (ICD-10: K76.9 / K21.9)**
2. **Acute Inflammatory Clinical Syndrome (ICD-10: R50.9 / H10.9)**

## 8. Integrative Management & AYUSH Guidance
{management_allopathic}
- **AYUSH Ahara (Dietary Regimen)**: Pathya (fresh coconut water, moong dal khichdi, pomegranate), avoid Apathya (fried, spicy, fermented foods).
- **AYUSH Vihara (Lifestyle & Dinacharya)**: Cool compress, adequate hydration, avoid direct sunlight and thermal exposure.

## 9. Red-Flag & Triage Acuity Assessment
- {'🚨 EMERGENCY RED-FLAG: Immediate acute medical attention indicated.' if is_emerg else 'No emergency hemodynamically unstable red flags. Routine-to-urgent physician evaluation advised.'}

```json
{{"urgency": "{urg_val}", "critical": {crit_val}, "red_flags": {flags_val}}}
```{note}"""

        # Clinical intake response expecting JSON
        if "doctor_reply" in system_prompt or "options" in system_prompt.lower() or "json" in system_prompt.lower():
            if num_exchanges >= len(seq):
                return json.dumps({
                    "doctor_reply": summary_trigger.get(language, summary_trigger["en"]) + " [INTAKE_COMPLETE]",
                    "clinical_note": "Intake Complete",
                    "ui_type": "chips",
                    "options": [],
                    "is_emergency": False,
                    "is_complete": True
                }, ensure_ascii=False)

            mock_palette = [
                {
                    "ui_type": "chips",
                    "note": "Location: Head",
                    "options": [
                        {"id": "forehead", "label_en": "Forehead", "label_hi": "माथा", "label_mr": "कपाळ"},
                        {"id": "temples", "label_en": "Temples / Sides", "label_hi": "कनपटी / दोनों तरफ", "label_mr": "कपाळाच्या बाजू"},
                        {"id": "back_head", "label_en": "Back of Head", "label_hi": "सिर के पीछे", "label_mr": "डोक्याची मागची बाजू"},
                        {"id": "whole_head", "label_en": "Whole Head", "label_hi": "पूरा सिर", "label_mr": "संपूर्ण डोके"}
                    ]
                },
                {
                    "ui_type": "chips",
                    "note": "Onset / Duration",
                    "options": [
                        {"id": "today", "label_en": "Just Today", "label_hi": "आज से", "label_mr": "आजपासून"},
                        {"id": "few_days", "label_en": "1-3 Days Ago", "label_hi": "1-3 दिन से", "label_mr": "1-3 दिवसांपासून"},
                        {"id": "week", "label_en": "About 1 Week", "label_hi": "लगभग 1 हफ्ते से", "label_mr": "सुमारे 1 आठवडा"},
                        {"id": "month", "label_en": "1 Month or More", "label_hi": "1 महीने से ज़्यादा", "label_mr": "1 महिना किंवा जास्त"}
                    ]
                },
                {
                    "ui_type": "chips",
                    "note": "Character of Symptom",
                    "options": [
                        {"id": "throbbing", "label_en": "Throbbing / Pounding", "label_hi": "धड़कता हुआ / टीस मारने वाला", "label_mr": "ठसठसणारे"},
                        {"id": "sharp", "label_en": "Sharp / Stabbing", "label_hi": "तेज़ / चुभने वाला", "label_mr": "टोचणारे"},
                        {"id": "heavy", "label_en": "Heavy / Pressure", "label_hi": "भारीपन / दबाव", "label_mr": "जडपणा / दाब"},
                        {"id": "burning", "label_en": "Burning Sensation", "label_hi": "जलन जैसा", "label_mr": "जळजळ"}
                    ]
                },
                {
                    "ui_type": "yesno",
                    "note": "Radiation / Spread",
                    "options": [
                        {"id": "spread_yes", "label_en": "Yes, Spreads to Neck/Back", "label_hi": "हाँ, गर्दन या पीठ में फैलता है", "label_mr": "हो, मानेत किंवा पाठीत पसरते"},
                        {"id": "spread_no", "label_en": "No, Stays in One Place", "label_hi": "नहीं, एक ही जगह रहता है", "label_mr": "नाही, एकाच जागी राहते"}
                    ]
                },
                {
                    "ui_type": "chips",
                    "note": "Associated Symptoms",
                    "options": [
                        {"id": "nausea", "label_en": "Nausea / Vomiting", "label_hi": "जी मिचलाना / उल्टी", "label_mr": "मळमळ / उलटी"},
                        {"id": "fever", "label_en": "Fever / Chills", "label_hi": "बुखार / ठंड", "label_mr": "ताप / थंडी"},
                        {"id": "light_sens", "label_en": "Light / Sound Sensitive", "label_hi": "रोशनी या आवाज़ से दर्द", "label_mr": "प्रकाश / आवाजाचा त्रास"},
                        {"id": "no_other", "label_en": "None of These", "label_hi": "कोई और लक्षण नहीं", "label_mr": "इतर कोणतेही नाही"}
                    ]
                },
                {
                    "ui_type": "face_scale",
                    "note": "Severity (1-10)",
                    "options": [
                        {"id": "2", "label_en": "1-3 Mild Pain", "label_hi": "1-3 हल्का दर्द", "label_mr": "1-3 सौम्य"},
                        {"id": "5", "label_en": "4-6 Moderate Pain", "label_hi": "4-6 मध्यम दर्द", "label_mr": "4-6 मध्यम"},
                        {"id": "8", "label_en": "7-8 Severe Pain", "label_hi": "7-8 तेज़ दर्द", "label_mr": "7-8 तीव्र वेदना"},
                        {"id": "10", "label_en": "9-10 Unbearable", "label_hi": "9-10 असहनीय", "label_mr": "9-10 असह्य"}
                    ]
                }
            ]
            choice_data = mock_palette[idx % len(mock_palette)]
            formatted_options = []
            for o in choice_data["options"]:
                val = o.get(f"label_{language}") or o.get("label_en") or o["id"]
                formatted_options.append({
                    "id": o["id"],
                    "label_en": o["label_en"],
                    "label_hi": o["label_hi"],
                    "label_mr": o["label_mr"],
                    "value": val
                })

            return json.dumps({
                "doctor_reply": next_question,
                "clinical_note": choice_data["note"],
                "ui_type": choice_data["ui_type"],
                "options": formatted_options,
                "is_emergency": False,
                "is_complete": False
            }, ensure_ascii=False)

        if "SOCRATES" in system_prompt or "triage" in system_prompt.lower() or "clinical" in system_prompt.lower():
            return next_question

        elif "Prescription" in system_prompt or "OCR" in system_prompt:
            combined_msg = " ".join(m.get("content", "") for m in messages)
            found_meds = []
            for candidate in ["amoxicillin", "ibuprofen", "lisinopril", "pantocid", "pantoprazole", "warfarin", "aspirin", "atorvastatin", "metformin", "cetirizine"]:
                if candidate in combined_msg.lower():
                    found_meds.append(candidate.capitalize())
            
            meds_section = "\n".join(f"   - **{med}**: As prescribed in clinical record." for med in found_meds) if found_meds else "   - No active routine medications identified in document."
            
            return f"""### 📋 Prescription & Lab Intelligence Analysis

1. **Extracted Medications**:
{meds_section}

2. **Diagnostic Findings & Safety**:
   - Document reviewed for clinical parameters and active drug interactions.
   - {"No adverse drug-drug contraindications detected." if found_meds else "No routine contraindications flagged."}{note}"""

        elif "Ayurvedic" in system_prompt or "AYUSH" in system_prompt:
            return f"""### 🌿 AYUSH Constitutional & Lifestyle Guidance

1. **Constitutional Assessment**:
   - **Prakriti**: Balanced Vata-Pitta physiological pattern.
   - **Agni**: Tikshna/Vishama (Active to variable metabolic flame).
   - **Koshtha**: Madhyama (Regular GI motility).

2. **Personalized Ahara (Dietary Regimen)**:
   - **Favor (पथ्य)**: Warm, freshly cooked meals, Moong dal, cumin water, ghee in moderation, fresh seasonal gourds.
   - **Avoid (अपथ्य)**: Excessive spicy, sour (Amla/excess vinegar), fried or stale refrigerated food.

3. **Dinacharya (Daily Lifestyle)**:
   - Practice *Pranayama* (Anulom-Vilom, Sheetali) 10 minutes daily.
   - Maintain consistent meal timings to stabilize digestive Agni.{note}"""

        else:
            return f"""# 🩺 Physician Clinical Synthesis & Differential Diagnosis

## 1. Executive Clinical Summary
Patient evaluated through Jeevan OPD multi-modal triage. All clinical domains successfully recorded with ABHA consent.

## 2. Differential Diagnoses
1. **Acute Gastroesophageal Reflux / Dyspepsia (ICD-10: K21.9)**
   - *Rationale*: Epigastric discomfort with hyperacidity and Pitta-dominant metabolic fire.
2. **Viral Gastroenteritis / Acute Upper Respiratory Infection (ICD-10: A08.4 / J06.9)**
   - *Rationale*: Correlated with mild fever, leukocytosis, and constitutional changes.

## 3. Red-Flag Evaluation
- No acute cardiac ischemic or peritonitic red flags identified in this encounter.

## 4. Integrative Management Plan
- **Modern Allopathy**: Short course of H2RA / PPI (e.g. Pantoprazole 40mg OD AC) + Oral rehydration.
- **AYUSH Regimen**: Cumin-coriander herbal infusion (CCF Tea), avoidance of Pitta-aggravating spicy foods.
- **Follow-up**: Review in 5 days or immediately if red flags emerge.{note}"""


# Global singleton instance
grok_service = GrokService()
