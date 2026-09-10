import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Lock, FileText, AlertTriangle, CheckCircle2, Stethoscope, 
  FilePlus2, Flame, Printer, Download, Pill, Users, User, 
  Activity, ShieldCheck, ChevronDown, ChevronUp, AlertCircle,
  Check, Edit3, XCircle, RotateCcw, Save, MessageSquare, UserCheck,
  Clock, Calendar, Send, Phone, Mail, Home
} from 'lucide-react';
import { useGlobalState } from '../context/GlobalStateContext';
import { API_BASE } from '../config/api';

// Complete Summary i18n Dictionary for clinical values, labels, and codes
const SUMMARY_I18N = {
  // Card and Field Labels
  'Presenting Symptom': { hi: 'मुख्य लक्षण' },
  'PRESENTING SYMPTOM': { hi: 'मुख्य लक्षण' },
  'Onset Mode': { hi: 'शुरुआत का प्रकार' },
  'ONSET MODE': { hi: 'शुरुआत का प्रकार' },
  'Site (S)': { hi: 'स्थान (S)' },
  'SITE (S)': { hi: 'स्थान (S)' },
  'Onset (O)': { hi: 'शुरुआत (O)' },
  'ONSET (O)': { hi: 'शुरुआत (O)' },
  'Character (C)': { hi: 'प्रकृति (C)' },
  'CHARACTER (C)': { hi: 'प्रकृति (C)' },
  'Radiation (R)': { hi: 'फैलाव (R)' },
  'RADIATION (R)': { hi: 'फैलाव (R)' },
  'Associated (A)': { hi: 'जुड़े लक्षण (A)' },
  'ASSOCIATED (A)': { hi: 'जुड़े लक्षण (A)' },
  'Time Course (T)': { hi: 'समय / क्रम (T)' },
  'TIME COURSE (T)': { hi: 'समय / क्रम (T)' },
  'Exacerbating (E)': { hi: 'दर्द बढ़ाने वाले कारक (E)' },
  'EXACERBATING (E)': { hi: 'दर्द बढ़ाने वाले कारक (E)' },
  'Severity (S)': { hi: 'तीव्रता (S)' },
  'SEVERITY (S)': { hi: 'तीव्रता (S)' },

  // Complaint Type Values
  'chest-pain': { hi: 'सीने में दर्द' },
  'chest pain': { hi: 'सीने में दर्द' },
  'CHEST PAIN': { hi: 'सीने में दर्द' },
  'Chest Pain': { hi: 'सीने में दर्द' },
  'abdominal-pain': { hi: 'पेट में दर्द' },
  'abdominal pain': { hi: 'पेट में दर्द' },
  'ABDOMINAL PAIN': { hi: 'पेट में दर्द' },
  'Abdominal Pain': { hi: 'पेट में दर्द' },
  'fever': { hi: 'बुखार' },
  'FEVER': { hi: 'बुखार' },
  'Fever': { hi: 'बुखार' },
  'acute symptom evaluation': { hi: 'तीव्र लक्षण मूल्यांकन' },
  'ACUTE SYMPTOM EVALUATION': { hi: 'तीव्र लक्षण मूल्यांकन' },
  'General Acute Complaint': { hi: 'सामान्य तीव्र शिकायत' },
  'HEADACHE / CEPHALEA': { hi: 'सिरदर्द / सेफेल्जिया' },
  'Headache / Cephalea': { hi: 'सिरदर्द / सेफेल्जिया' },
  'ACUTE ABDOMINAL DISCOMFORT': { hi: 'तीव्र उदर संबंधी परेशानी' },
  'Acute Abdominal Discomfort': { hi: 'तीव्र उदर संबंधी परेशानी' },
  'PRECORDIAL CHEST PAIN': { hi: 'सीने में दर्द (प्रिकॉर्डियल)' },
  'Precordial Chest Pain': { hi: 'सीने में दर्द (प्रिकॉर्डियल)' },
  'PYREXIA / FEBRILE ILLNESS': { hi: 'ज्वर / तीव्र बुखार' },
  'Pyrexia / Febrile Illness': { hi: 'ज्वर / तीव्र बुखार' },
  'ACUTE VERTIGO / PRESYNCOPE': { hi: 'चक्कर आना (वर्टिगो)' },
  'Acute Vertigo / Presyncope': { hi: 'चक्कर आना (वर्टिगो)' },
  'ACUTE CLINICAL CONSULTATION': { hi: 'तीव्र चिकित्सीय परामर्श' },
  'Acute Clinical Consultation': { hi: 'तीव्र चिकित्सीय परामर्श' },
  'ACUTE BRONCHIAL COUGH': { hi: 'तीव्र ब्रोंकियल खांसी' },
  'Acute Bronchial Cough': { hi: 'तीव्र ब्रोंकियल खांसी' },
  'RESPIRATORY SYMPTOMS / DYSPNEA': { hi: 'श्वसन संबंधी लक्षण / सांस फूलना' },
  'Respiratory Symptoms / Dyspnea': { hi: 'श्वसन संबंधी लक्षण / सांस फूलना' },
  'ACUTE GASTROENTERITIS': { hi: 'तीव्र गैस्ट्रोएंटेराइटिस / दस्त' },
  'Acute Gastroenteritis': { hi: 'तीव्र गैस्ट्रोएंटेराइटिस / दस्त' },
  'NAUSEA & EMESIS': { hi: 'जी मिचलाना और उल्टी' },
  'Nausea & Emesis': { hi: 'जी मिचलाना और उल्टी' },
  'GENERALIZED MYALGIA / ARTHRALGIA': { hi: 'मांसपेशियों और जोड़ों का दर्द' },
  'Generalized Myalgia / Arthralgia': { hi: 'मांसपेशियों और जोड़ों का दर्द' },
  'ASTHENIA / GENERALIZED FATIGUE': { hi: 'शारीरिक कमजोरी और थकान' },
  'Asthenia / Generalized Fatigue': { hi: 'शारीरिक कमजोरी और थकान' },

  // Onset Values
  'sudden': { hi: 'अचानक' },
  'gradual': { hi: 'धीरे-धीरे' },

  // Character Values (Chest Pain)
  'crushing': { hi: 'भारी दबाव / सीना दबना' },
  'pleuritic': { hi: 'सांस लेने पर तेज दर्द' },
  'burning': { hi: 'जलन जैसा' },
  'tearing': { hi: 'फटने/चीरने जैसा' },

  // Character Values (Abdominal Pain)
  'sharp': { hi: 'तेज / चुभन जैसा' },
  'dull': { hi: 'हल्का लगातार दर्द' },
  'cramping': { hi: 'मरोड़ / ऐंठन' },

  // Site Values (Abdominal Pain)
  'rlq': { hi: 'दाहिना निचला हिस्सा (RLQ)' },
  'ruq': { hi: 'दाहिना ऊपरी हिस्सा (RUQ)' },
  'epigastric': { hi: 'ऊपरी बीच का हिस्सा' },
  'llq': { hi: 'बायाँ निचला हिस्सा (LLQ)' },
  'luq': { hi: 'बायाँ ऊपरी हिस्सा (LUQ)' },
  'generalized': { hi: 'पूरे पेट में' },

  // Radiation Values
  'arm_jaw': { hi: 'हाथ या जबड़े की तरफ' },
  'back': { hi: 'पीठ की तरफ' },
  'shoulder': { hi: 'कंधे की तरफ' },
  'groin': { hi: 'कमर/जांघ के जोड़ की तरफ' },
  'none': { hi: 'कोई नहीं' },

  // Associated Symptoms Values
  'breathlessness': { hi: 'सांस लेने में तकलीफ' },
  'nausea': { hi: 'जी घबराना' },
  'sweating_palpitations': { hi: 'पसीना / तेज धड़कन' },
  'cough': { hi: 'खांसी' },
  'vomiting': { hi: 'उल्टी' },
  'blood': { hi: 'खून आना' },

  // Exacerbating Factors
  'after_meals': { hi: 'खाने के बाद' },
  'movement': { hi: 'हिलने-डुलने से' },
  'eating': { hi: 'कुछ खाने-पीने से' },
  'nothing': { hi: 'किसी खास चीज से नहीं' },
  'unrelated': { hi: 'किसी खास चीज से नहीं' },

  // Time Course / Pattern (Fever & Abdominal)
  'continuous': { hi: 'लगातार' },
  'spiking': { hi: 'रुक-रुक कर / अचानक तेज' },
  'intermittent': { hi: 'रुक-रुक कर' },
  'constant': { hi: 'लगातार' },

  // Fever Associated Symptoms
  'rigors': { hi: 'तेज कंपकंपी' },
  'aches_rash': { hi: 'सिरदर्द / जोड़ों में दर्द / दाने' },
  'cns': { hi: 'गर्दन में अकड़न / दिमागी उलझन' },
  'respiratory': { hi: 'खांसी / गले में खराश / नाक बहना' },

  // Travel History & Duration
  'yes': { hi: 'हाँ' },
  'no': { hi: 'नहीं' },
  'lt_3': { hi: '3 दिन से कम' },
  '3_to_5': { hi: '3 से 5 दिन' },
  'gt_5': { hi: '5 दिन से ज्यादा' },

  // AYUSH Technical Terms (Devanagari Transliteration)
  'Vata': { hi: 'वात' },
  'Pitta': { hi: 'पित्त' },
  'Kapha': { hi: 'कफ' },
  'Vishama': { hi: 'विषम' },
  'Tikshna': { hi: 'तीक्ष्ण' },
  'Manda': { hi: 'मन्द' },
  'Sama': { hi: 'सम' },
  'Krura': { hi: 'क्रूर' },
  'Mridu': { hi: 'मृदु' },
  'Madhyama': { hi: 'मध्यम' },

  // Static Fallback Strings
  'Not localized': { hi: 'स्थान निर्धारित नहीं' },
  'Not specified': { hi: 'उल्लेख नहीं' },
  'None reported': { hi: 'कोई नहीं' },
  'None specific': { hi: 'किसी खास चीज से नहीं' },
  'Unrated': { hi: 'आकलन नहीं' },
  'Standard': { hi: 'सामान्य' },
  'N/A': { hi: 'उपलब्ध नहीं' },
  'Priority Flagged': { hi: 'प्राथमिकता चिह्नित' },
  'Standard Routine': { hi: 'सामान्य' },
  'High Clinical Acuity': { hi: 'उच्च क्लिनिकल गंभीरता' },
  'Standard Acuity': { hi: 'सामान्य गंभीरता' },
  'Not Linked': { hi: 'लिंक नहीं' },
  'Not captured in this session': { hi: 'इस सत्र में दर्ज नहीं' },
  'Partially captured via AYUSH': { hi: 'आयुष के माध्यम से आंशिक रूप से दर्ज' },
  'No active meds found': { hi: 'कोई सक्रिय दवा नहीं मिली' },
  'No labs uploaded': { hi: 'कोई जांच अपलोड नहीं' },
  'NKDA (None Reported)': { hi: 'NKDA (कोई ज्ञात दवा एलर्जी नहीं)' },
  'Normal': { hi: 'सामान्य' },
  'Low': { hi: 'कम' },
  'High (95%+)': { hi: 'उच्च (95%+)' },
  'Low Confidence': { hi: 'कम विश्वसनीयता' },
  'Positive': { hi: 'सकारात्मक' },
  'Negative': { hi: 'नकारात्मक' },

  // Section 3: Past Medical & Surgical History
  'Past Medical History (PMHx)': { hi: 'पिछला चिकित्सीय इतिहास (PMHx)' },
  'PAST MEDICAL HISTORY (PMHX)': { hi: 'पिछला चिकित्सीय इतिहास (PMHx)' },
  'No prior chronic comorbidities (e.g. Hypertension, Type 2 Diabetes, Coronary Artery Disease, Asthma/COPD, Chronic Kidney Disease) documented for this acute encounter.': {
    hi: 'इस तीव्र परामर्श सत्र में किसी पूर्व दीर्घकालिक बीमारी (जैसे उच्च रक्तचाप, टाइप 2 मधुमेह, हृदय रोग, दमा/सीओपीडी, गुर्दे की बीमारी) की कोई जानकारी दर्ज नहीं है।'
  },
  'Past Surgical History (PSHx)': { hi: 'पिछला शल्य/सर्जिकल इतिहास (PSHx)' },
  'PAST SURGICAL HISTORY (PSHX)': { hi: 'पिछला शल्य/सर्जिकल इतिहास (PSHx)' },
  'No past major surgical procedures, organ resections, or acute inpatient admissions reported.': {
    hi: 'अतीत में किसी बड़ी सर्जरी, अंग निष्कासन, या अस्पताल में गंभीर भर्ती होने की कोई सूचना नहीं मिली है।'
  },
  '* Physician Note: Standard acute digital triage capture. Longitudinal validation recommended via linked ABHA electronic health records.': {
    hi: '* चिकित्सक टिप्पणी: मानक तीव्र डिजिटल ट्राइएज विवरण। लिंक किए गए आभा (ABHA) इलेक्ट्रॉनिक स्वास्थ्य रिकॉर्ड के माध्यम से दीर्घकालिक सत्यापन अनुशंसित है।'
  },

  // Section 4: Drug & Allergy History
  'Active Prescribed Medications (OCR Extracted)': { hi: 'वर्तमान निर्धारित दवाएं (OCR द्वारा प्राप्त)' },
  'ACTIVE PRESCRIBED MEDICATIONS (OCR EXTRACTED)': { hi: 'वर्तमान निर्धारित दवाएं (OCR द्वारा प्राप्त)' },
  'Dosage not specified': { hi: 'खुराक निर्दिष्ट नहीं है' },
  'No active prescription or over-the-counter medications extracted from uploaded records.': {
    hi: 'अपलोड किए गए दस्तावेज़ों से कोई निर्धारित या सामान्य दवा नहीं मिली।'
  },
  'Allergies & Adverse Drug Reactions (ADRs)': { hi: 'एलर्जी एवं प्रतिकूल दवा प्रतिक्रियाएं (ADRs)' },
  'ALLERGIES & ADVERSE DRUG REACTIONS (ADRS)': { hi: 'एलर्जी एवं प्रतिकूल दवा प्रतिक्रियाएं (ADRs)' },
  'No known drug allergies (NKDA) or severe adverse food/environmental hypersensitivities documented for this session. Confirm verbally prior to administering new therapeutics.': {
    hi: 'इस सत्र में कोई ज्ञात दवा एलर्जी (NKDA) या गंभीर खाद्य/पर्यावरणीय एलर्जी दर्ज नहीं है। नई दवा देने से पहले मौखिक रूप से पुनः पुष्टि करें।'
  },

  // Section 5: Family History
  'Family history not captured in this digital intake encounter. No spontaneous report of premature coronary artery disease (<55 in first-degree male, <65 in female relative), sudden unexplained cardiac death, familial diabetes, or hereditary malignancies.': {
    hi: 'इस डिजिटल ट्राइएज सत्र में पारिवारिक इतिहास दर्ज नहीं किया गया। समयपूर्व कोरोनरी धमनी रोग (पुरुष संबंधी में <55, महिला में <65 वर्ष), अचानक अकारण हृदय मृत्यु, पारिवारिक मधुमेह, या आनुवंशिक कैंसर की कोई सूचना नहीं दी गई।'
  },

  // Section 6: Personal History
  'Habits & Substance Exposure': { hi: 'आदतें एवं नशा/पदार्थ सेवन' },
  'HABITS & SUBSTANCE EXPOSURE': { hi: 'आदतें एवं नशा/पदार्थ सेवन' },
  'Tobacco / Cigarette smoking history, alcohol consumption, and recreational substance usage not captured in this session (Unrecorded / Non-contributory).': {
    hi: 'धूम्रपान/तंबाकू सेवन, मदिरापान, या अन्य मादक पदार्थों के सेवन की जानकारी इस सत्र में दर्ज नहीं है (अदर्जित / अप्रभावी)।'
  },
  'Sleep & Physiological Habits (AYUSH Cross-Reference)': { hi: 'नींद एवं शारीरिक आदतें (आयुष संदर्भ)' },
  'SLEEP & PHYSIOLOGICAL HABITS': { hi: 'नींद एवं शारीरिक आदतें (आयुष संदर्भ)' },
  'Appetite / Digestion (Agni):': { hi: 'भूख / पाचन (अग्नि):' },
  'Bowel Motility (Koshtha):': { hi: 'पेट की गति / मल त्याग (कोष्ठ):' },
  'Constitutional Temperament:': { hi: 'शारीरिक एवं मानसिक प्रकृति:' },

  // Section 7: Review of Systems (ROS)
  'Cardiovascular': { hi: 'हृदय एवं रक्तसंचार प्रणाली' },
  'CARDIOVASCULAR': { hi: 'हृदय एवं रक्तसंचार प्रणाली' },
  'Respiratory': { hi: 'श्वसन प्रणाली' },
  'RESPIRATORY': { hi: 'श्वसन प्रणाली' },
  'Gastrointestinal': { hi: 'पाचन तंत्र' },
  'GASTROINTESTINAL': { hi: 'पाचन तंत्र' },
  'Constitutional / Infectious': { hi: 'सामान्य शारीरिक / संक्रामक' },
  'CONSTITUTIONAL / INFECTIOUS': { hi: 'सामान्य शारीरिक / संक्रामक' },
  'Neurological': { hi: 'तंत्रिका तंत्र' },
  'NEUROLOGICAL': { hi: 'तंत्रिका तंत्र' },
  'Musculoskeletal': { hi: 'मांसपेशी एवं जोड़' },
  'MUSCULOSKELETAL': { hi: 'मांसपेशी एवं जोड़' },
  'Positive for dyspnea / palpitations / diaphoresis': { hi: 'सांस फूलना / तेज धड़कन / पसीना आने के लक्षण मौजूद' },
  'Denies palpitations, syncope, or orthopnea': { hi: 'तेज धड़कन, बेहोशी या लेटने पर सांस फूलने से इनकार' },
  'Positive for respiratory distress / cough': { hi: 'श्वसन कष्ट / खांसी के लक्षण मौजूद' },
  'Denies hemoptysis, wheezing, or stridor': { hi: 'खून वाली खांसी, घरघराहट या सांस में रुकावट से इनकार' },
  'Positive for nausea / vomiting / abdominal pain': { hi: 'जी मिचलाना / उल्टी / पेट दर्द के लक्षण मौजूद' },
  'Denies dysphagia, melena, or hematochezia': { hi: 'निगलने में परेशानी, काले मल या खूनी मल से इनकार' },
  'Positive for fever / chills / rigors': { hi: 'बुखार / ठंड लगना / कंपकंपी के लक्षण मौजूद' },
  'Afebrile, no unprovoked weight loss or night sweats': { hi: 'बुखार नहीं, बिना कारण वजन घटना या रात को पसीना नहीं' },
  'Alert: Acute neck stiffness / confusion noted': { hi: 'सतर्क: तीव्र गर्दन अकड़न / भ्रम देखा गया' },
  'Alert, oriented x3, denies focal weakness or paresthesia': { hi: 'मरीज सचेत, पूर्णतः उन्मुख, कोई कमजोरी या सुन्नता नहीं' },
  'Positive for generalized myalgias / arthralgias': { hi: 'शरीर / मांसपेशियों एवं जोड़ों में दर्द मौजूद' },
  'No acute joint swelling, deformities, or motor deficits': { hi: 'जोड़ों में तीव्र सूजन, विकृति या गति में कोई कमजोरी नहीं' },
  '* Attestation: All remaining organ systems systematically evaluated and negative except as detailed in History of Present Illness above.': {
    hi: '* सत्यापन: वर्तमान बीमारी के इतिहास में उल्लिखित लक्षणों को छोड़कर अन्य सभी शारीरिक प्रणालियों का व्यवस्थित मूल्यांकन किया गया और वे सामान्य/नकारात्मक पाई गईं।'
  },

  // Section 8: Prior Investigations Summary (OCR Results)
  'Test Name': { hi: 'जांच का नाम' },
  'TEST NAME': { hi: 'जांच का नाम' },
  'Result Value': { hi: 'जांच परिणाम' },
  'RESULT VALUE': { hi: 'जांच परिणाम' },
  'Clinical Flag': { hi: 'क्लिनिकल स्थिति' },
  'CLINICAL FLAG': { hi: 'क्लिनिकल स्थिति' },
  'OCR Confidence': { hi: 'OCR विश्वसनीयता' },
  'OCR CONFIDENCE': { hi: 'OCR विश्वसनीयता' },
  'above reference range': { hi: 'मानक सीमा से अधिक' },
  'below reference range': { hi: 'मानक सीमा से कम' },
  'High': { hi: 'उच्च' },
  'No prior diagnostic investigations, laboratory panels, or imaging reports uploaded for this session. Clinical evaluation based entirely on patient anamnesis.': {
    hi: 'इस सत्र के लिए कोई पूर्व नैदानिक जांच, प्रयोगशाला रिपोर्ट, या इमेजिंग रिपोर्ट अपलोड नहीं की गई। क्लिनिकल मूल्यांकन पूरी तरह से मरीज द्वारा दिए गए इतिहास पर आधारित है।'
  },

  // Physician Review Strings
  'Switch to Physician View': { hi: 'चिकित्सक दृश्य पर जाएं' },
  'Switch to Patient View': { hi: 'रोगी दृश्य पर जाएं' },
  'Physician View Active': { hi: 'चिकित्सक समीक्षा मोड सक्रिय' },
  'Draft — Pending Physician Review': { hi: 'ड्राफ्ट — चिकित्सक समीक्षा प्रतीक्षित' },
  'Physician Reviewed & Confirmed': { hi: 'चिकित्सक द्वारा समीक्षित एवं सत्यापित' },
  'Reviewed — Discrepancies Noted': { hi: 'समीक्षा पूर्ण — विसंगतियां दर्ज' },
  'Accept': { hi: 'स्वीकार करें' },
  'Amend': { hi: 'संशोधित करें' },
  'Reject': { hi: 'अस्वीकार करें' },
  'Confirmed by Physician': { hi: 'चिकित्सक द्वारा सत्यापित' },
  'Amended by Physician': { hi: 'चिकित्सक द्वारा संशोधित' },
  'Disputed by Physician': { hi: 'चिकित्सक द्वारा विवादित / अस्वीकृत' },
  'Save Amendment': { hi: 'संशोधन सहेजें' },
  'Cancel': { hi: 'रद्द करें' },
  'Explain reason for dispute / rejection...': { hi: 'अस्वीकृति या विसंगति का कारण बताएं...' },
  'Save Dispute Note': { hi: 'टिप्पणी सहेजें' },
  'Dispute Note': { hi: 'विवाद टिप्पणी' },
  'All 9 sections must be reviewed by physician prior to lock': { hi: 'सत्र लॉक करने से पहले सभी 9 अनुभागों की समीक्षा अनिवार्य है' },
  'Pending Review': { hi: 'समीक्षा प्रतीक्षित' },
  'Reviewed': { hi: 'समीक्षित' },

  // Drug Interaction Strings
  'Potential Interaction': { hi: 'संभावित दवा पारस्परिक क्रिया (ड्रग इंटरैक्शन)' },
  'flag for physician review': { hi: 'चिकित्सक समीक्षा हेतु चिह्नित' },
  'Based on a limited reference list for demonstration purposes — not a substitute for a full clinical drug interaction database.': {
    hi: 'प्रदर्शन उद्देश्यों के लिए सीमित संदर्भ सूची पर आधारित — पूर्ण नैदानिक दवा संपर्क डेटाबेस का विकल्प नहीं।'
  },

  // Session Termination & Reset
  'Clinical Encounter Locked Successfully': { hi: 'क्लिनिकल सत्र सफलतापूर्वक लॉक किया गया' },
  'Encounter Locked Successfully': { hi: 'सत्र सफलतापूर्वक लॉक किया गया' },
  'Reset Demo Session': { hi: 'डेमो सत्र रीसेट करें' },
  'Reset Demo': { hi: 'डेमो रीसेट' },
  'Clear & Exit Now': { hi: 'अभी डेटा साफ़ करके बाहर निकलें' },
  'Download FHIR': { hi: 'FHIR डाउनलोड' },

  // Medical Timeline Strings
  'Medical Timeline': { hi: 'चिकित्सा समयरेखा' },
  'Medical Timeline (Document History)': { hi: 'चिकित्सा समयरेखा (दस्तावेज़ इतिहास)' },
  'Chronological record of uploaded prescriptions, diagnostic lab reports, and clinical documents': {
    hi: 'अपलोड किए गए प्रिस्क्रिप्शन, डायग्नोस्टिक लैब रिपोर्ट और क्लिनिकल दस्तावेजों का कालानुक्रमिक रिकॉर्ड'
  },
  'Prescription': { hi: 'प्रिस्क्रिप्शन' },
  'Lab Report': { hi: 'लैब रिपोर्ट' },
  'Prescription & Lab Report': { hi: 'प्रिस्क्रिप्शन और लैब रिपोर्ट' },
  'Clinical Document': { hi: 'क्लिनिकल दस्तावेज़' },
  'Document Date': { hi: 'दस्तावेज़ दिनांक' },
  'Upload Date': { hi: 'अपलोड दिनांक' },
  'Date not detected — showing upload time': { hi: 'दिनांक का पता नहीं चला — अपलोड समय दिखाया जा रहा है' },
  'No documents uploaded for this session': { hi: 'इस सत्र के लिए कोई दस्तावेज़ अपलोड नहीं किया गया' },
  'Upload prescriptions or lab reports to view a chronological medical timeline.': {
    hi: 'कालानुक्रमिक चिकित्सा समयरेखा देखने के लिए प्रिस्क्रिप्शन या लैब रिपोर्ट अपलोड करें।'
  },
  'medications extracted': { hi: 'दवाएं निकाली गईं' },
  'medication extracted': { hi: 'दवा निकाली गई' },
  'lab results extracted': { hi: 'लैब परिणाम निकाले गए' },
  'lab result extracted': { hi: 'लैब परिणाम निकाला गया' },
  'flagged above reference range': { hi: 'संदर्भ सीमा से ऊपर' },
  'flagged below reference range': { hi: 'संदर्भ सीमा से नीचे' },
  'flagged': { hi: 'चिह्नित' },
  'Document': { hi: 'दस्तावेज़' },
  'Documents': { hi: 'दस्तावेज़' },
  'AI-Extracted': { hi: 'एआई-विश्लेषित' },
  'No structured medications or laboratory values detected in this document.': {
    hi: 'इस दस्तावेज़ में कोई संरचित दवाएं या लैब परिणाम नहीं मिले।'
  }
};

export const cleanClinicalTitle = (text) => {
  if (!text || typeof text !== 'string') return 'ACUTE CLINICAL CONSULTATION';
  const clean = text.trim();
  const lower = clean.toLowerCase();

  const known = {
    'headache': 'HEADACHE / CEPHALEA',
    'sar dard': 'HEADACHE / CEPHALEA',
    'sir dard': 'HEADACHE / CEPHALEA',
    'abdominal-pain': 'ACUTE ABDOMINAL DISCOMFORT',
    'abdominal pain': 'ACUTE ABDOMINAL DISCOMFORT',
    'pet dard': 'ACUTE ABDOMINAL DISCOMFORT',
    'chest-pain': 'PRECORDIAL CHEST PAIN',
    'chest pain': 'PRECORDIAL CHEST PAIN',
    'fever': 'PYREXIA / FEBRILE ILLNESS',
    'bukhar': 'PYREXIA / FEBRILE ILLNESS',
    'cough': 'ACUTE BRONCHIAL COUGH',
    'khansi': 'ACUTE BRONCHIAL COUGH',
    'diarrhea': 'ACUTE GASTROENTERITIS',
    'vomiting': 'NAUSEA & EMESIS',
    'vertigo': 'ACUTE VERTIGO / PRESYNCOPE',
    'dizziness': 'ACUTE VERTIGO / PRESYNCOPE',
    'chakkar': 'ACUTE VERTIGO / PRESYNCOPE',
    'voice-consultation': 'ACUTE CLINICAL CONSULTATION',
    'voice consultation': 'ACUTE CLINICAL CONSULTATION',
    'acute clinical consultation': 'ACUTE CLINICAL CONSULTATION',
  };

  if (known[lower]) return known[lower];

  if (
    lower.includes('headache') || lower.includes('cephalea') || lower.includes('migraine') ||
    lower.includes('सिरदर्द') || lower.includes('डोकेदुखी') || lower.includes('कपाळ') ||
    ((lower.includes('sar') || lower.includes('sir') || lower.includes('matha') || lower.includes('head') || lower.includes('doke')) &&
     (lower.includes('dard') || lower.includes('pain') || lower.includes('ache') || lower.includes('dukh') || lower.includes('ghum') || lower.includes('dukhat')))
  ) {
    return 'HEADACHE / CEPHALEA';
  }

  if (
    lower.includes('pet') || lower.includes('stomach') || lower.includes('abdomen') || lower.includes('पोट') || lower.includes('पेट') ||
    lower.includes('acidity') || lower.includes('gastric') || lower.includes('indigestion') || lower.includes('belly')
  ) {
    return 'ACUTE ABDOMINAL DISCOMFORT';
  }

  if (
    lower.includes('chest') || lower.includes('chhati') || lower.includes('seene') || lower.includes('heart') || lower.includes('छाती')
  ) {
    return 'PRECORDIAL CHEST PAIN';
  }

  if (lower.includes('fever') || lower.includes('bukhar') || lower.includes('tap') || lower.includes('ताप') || lower.includes('बुखार')) {
    return 'PYREXIA / FEBRILE ILLNESS';
  }

  if (lower.includes('chakkar') || lower.includes('dizzy') || lower.includes('vertigo') || lower.includes('चक्कर')) {
    return 'ACUTE VERTIGO / PRESYNCOPE';
  }

  if (lower.includes('cough') || lower.includes('khansi') || lower.includes('खांसी') || lower.includes('breath') || lower.includes('saans')) {
    return 'RESPIRATORY SYMPTOMS / DYSPNEA';
  }

  const casualWords = ['bhai', 'yaar', 'kr rha', 'kar raha', 'ho rha', 'hai', 'kuch', 'bahut', 'me', 'mera', 'meri', 'dost'];
  if (casualWords.some(w => lower.includes(w))) {
    return 'ACUTE CLINICAL CONSULTATION';
  }

  return clean.replace(/-/g, ' ').toUpperCase();
};

const DRUG_INTERACTIONS = [
  ['warfarin', 'aspirin'],
  ['warfarin', 'ibuprofen'],
  ['lisinopril', 'potassium'],
  ['enalapril', 'potassium'],
  ['metformin', 'contrast'],
  ['maoi', 'ssri'],
];

const checkDrugInteractions = (medList) => {
  if (!medList || !Array.isArray(medList) || medList.length < 2) return [];
  const matches = [];
  for (let i = 0; i < medList.length; i++) {
    for (let j = i + 1; j < medList.length; j++) {
      const nameA = (medList[i]?.name || '').toLowerCase();
      const nameB = (medList[j]?.name || '').toLowerCase();
      for (const [d1, d2] of DRUG_INTERACTIONS) {
        if (
          (nameA.includes(d1) && nameB.includes(d2)) ||
          (nameA.includes(d2) && nameB.includes(d1))
        ) {
          matches.push({
            drugA: medList[i]?.name || d1,
            drugB: medList[j]?.name || d2,
            pair: [d1, d2]
          });
        }
      }
    }
  }
  return matches;
};

const ALL_SECTIONS = [
  'chief_complaint',
  'hpi',
  'past_medical_surgical',
  'drug_allergy',
  'family_history',
  'personal_history',
  'ros',
  'prior_investigations',
  'ayush_profile'
];

// Reusable Section Header Review Status Component with Interactive Physician Controls
const SectionReviewControls = ({
  sectionId,
  reviewState,
  t,
  onAccept,
  onStartAmend,
  onStartReject,
  locked = false,
  isPhysician = false
}) => {
  const current = reviewState?.[sectionId];
  const status = current?.status;
  const timestamp = current?.timestamp;
  const reason = current?.reason;

  // Patient View: Only show clean, non-editable verification badges (no action buttons)
  if (!isPhysician) {
    if (status === 'accepted') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          {t('Verified by Doctor')}
        </span>
      );
    }
    if (status === 'amended') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200" title={timestamp}>
          <Edit3 className="w-3 h-3 text-amber-600" />
          {t('Doctor Reviewed')}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
        {t('Recorded at Intake')}
      </span>
    );
  }

  // Physician View: Full review status badges + interactive buttons
  return (
    <div className="flex items-center gap-2 flex-wrap justify-end shrink-0">
      {/* Status Badges */}
      {status === 'accepted' && (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-sm">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          {t('Confirmed by Physician')}
        </span>
      )}
      {status === 'amended' && (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200 shadow-sm" title={timestamp}>
          <Edit3 className="w-3.5 h-3.5 text-amber-600" />
          {t('Amended by Physician')}{timestamp ? ` (${timestamp})` : ''}
        </span>
      )}
      {status === 'rejected' && (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200 shadow-sm" title={reason}>
          <AlertCircle className="w-3.5 h-3.5 text-red-600" />
          {t('Disputed by Physician')}{reason ? `: "${reason}"` : ''}
        </span>
      )}
      {(!status || status === 'pending') && (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
          {t('AI-Extracted')}
        </span>
      )}

      {/* Interactive Physician Actions when Encounter is Not Locked */}
      {!locked && onAccept && (
        <div className="flex items-center gap-1">
          {status !== 'accepted' && (
            <button
              type="button"
              onClick={() => onAccept(sectionId)}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-xs cursor-pointer active:scale-95"
              title="Accept & Confirm this section"
            >
              <Check className="w-3 h-3" />
              {t('Accept')}
            </button>
          )}
          {onStartAmend && (
            <button
              type="button"
              onClick={() => onStartAmend(sectionId)}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 transition shadow-xs cursor-pointer active:scale-95"
              title="Edit / Amend this section"
            >
              <Edit3 className="w-3 h-3" />
              {t('Amend')}
            </button>
          )}
          {status !== 'rejected' && onStartReject && (
            <button
              type="button"
              onClick={() => onStartReject(sectionId)}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 transition shadow-xs cursor-pointer active:scale-95"
              title="Dispute this section"
            >
              <XCircle className="w-3 h-3" />
              {t('Dispute')}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const DEFAULT_PMHX_KEY = 'No prior chronic comorbidities (e.g. Hypertension, Type 2 Diabetes, Coronary Artery Disease, Asthma/COPD, Chronic Kidney Disease) documented for this acute encounter.';
const DEFAULT_PSHX_KEY = 'No past major surgical procedures, organ resections, or acute inpatient admissions reported.';
const DEFAULT_ALLERGY_KEY = 'No known drug allergies (NKDA) or severe adverse food/environmental hypersensitivities documented for this session. Confirm verbally prior to administering new therapeutics.';
const DEFAULT_FAMILY_KEY = 'Family history not captured in this digital intake encounter. No spontaneous report of premature coronary artery disease (<55 in first-degree male, <65 in female relative), sudden unexplained cardiac death, familial diabetes, or hereditary malignancies.';
const DEFAULT_HABITS_KEY = 'Tobacco / Cigarette smoking history, alcohol consumption, and recreational substance usage not captured in this session (Unrecorded / Non-contributory).';

const isCustom = (val, defaultKey) => {
  if (!val || typeof val !== 'string') return false;
  const trimmed = val.trim();
  if (!trimmed) return false;
  if (trimmed === defaultKey) return false;
  if (SUMMARY_I18N[defaultKey]?.hi && trimmed === SUMMARY_I18N[defaultKey].hi) return false;
  return true;
};

const isCustomHpiNarrative = (val) => {
  if (!val || typeof val !== 'string') return false;
  const trimmed = val.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('मरीज ') && trimmed.includes('की मुख्य समस्या के साथ प्रस्तुत हुआ है')) return false;
  if (trimmed.startsWith('Patient presents with chief complaint of')) return false;
  return true;
};

const ClinicalSummary = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { globalState, updateState, resetState } = useGlobalState();
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [locking, setLocking] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [fhirJson, setFhirJson] = useState(null);
  const [showFhirPreview, setShowFhirPreview] = useState(false);
  const [terminationCountdown, setTerminationCountdown] = useState(null);

  // Automatic session termination effect after lock
  useEffect(() => {
    if (terminationCountdown === null) return;
    if (terminationCountdown > 0) {
      const timer = setTimeout(() => {
        setTerminationCountdown(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (terminationCountdown === 0) {
      setTerminationCountdown(null);
      console.log('[SessionTermination] Clearing session data and redirecting to Consent...');
      sessionStorage.clear();
      resetState();
      navigate('/');
    }
  }, [terminationCountdown, navigate, resetState]);

  const handleImmediateTermination = () => {
    sessionStorage.clear();
    resetState();
    navigate('/');
  };

  // Physician authentication state: check GlobalState, URL query param ?role=physician, or sessionStorage
  const roleFromQuery = searchParams.get('role');
  const isPhysicianUser = (globalState?.role === 'physician') || (roleFromQuery === 'physician') || (sessionStorage.getItem('user_role') === 'physician');

  // Physician Review State initialized from globalState
  const [reviewState, setReviewState] = useState(() => {
    return globalState.physician_review || {};
  });
  const [editingSection, setEditingSection] = useState(null);
  const [rejectingSection, setRejectingSection] = useState(null);
  const [rejectionNote, setRejectionNote] = useState('');
  const [amendmentDrafts, setAmendmentDrafts] = useState({});
  const [dispatchStatus, setDispatchStatus] = useState({ sending: false, message: '', error: '' });

  // Sync if globalState changes
  useEffect(() => {
    if (globalState.physician_review) {
      setReviewState(globalState.physician_review);
    }
  }, [globalState.physician_review]);

  const lang = globalState.language || 'en';

  const t = (str) => {
    if (!str || typeof str !== 'string' || lang === 'en') return str;
    const trimmed = str.trim();
    if (SUMMARY_I18N[trimmed]?.[lang]) return SUMMARY_I18N[trimmed][lang];
    const lower = trimmed.toLowerCase();
    if (SUMMARY_I18N[lower]?.[lang]) return SUMMARY_I18N[lower][lang];
    const unhyphen = lower.replace(/-/g, ' ');
    if (SUMMARY_I18N[unhyphen]?.[lang]) return SUMMARY_I18N[unhyphen][lang];
    if (str.includes(',')) {
      return str.split(',').map(part => t(part.trim())).join(', ');
    }
    return str;
  };

  const getSectionBorderClass = (sectionId, isRedFlag = false) => {
    const status = reviewState[sectionId]?.status;
    if (status === 'accepted') return 'border-l-4 border-l-emerald-500 shadow-sm transition-all duration-300';
    if (status === 'amended') return 'border-l-4 border-l-amber-500 shadow-sm transition-all duration-300';
    if (status === 'rejected') return 'border-l-4 border-l-rose-500 shadow-sm transition-all duration-300';
    if (isRedFlag) return 'border-l-4 border-l-rose-500 shadow-sm transition-all duration-300';
    return 'border-l-4 border-l-blue-500 shadow-sm transition-all duration-300';
  };

  const handleAccept = (sectionId) => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const updated = {
      ...reviewState,
      [sectionId]: {
        ...(reviewState[sectionId] || {}),
        status: 'accepted',
        timestamp,
        reason: ''
      }
    };
    setReviewState(updated);
    updateState({ physician_review: updated });
    setEditingSection(null);
    setRejectingSection(null);
    console.log(`[PhysicianReview] Section accepted: ${sectionId} at ${timestamp}`);
  };

  const handleStartAmend = (sectionId, currentValues = {}) => {
    setEditingSection(sectionId);
    setRejectingSection(null);
    const existingAmends = reviewState[sectionId]?.amendments || {};
    const sanitizedExisting = {};
    Object.entries(existingAmends).forEach(([k, v]) => {
      if (typeof v === 'string') {
        const trimmed = v.trim();
        const isDefault = [
          DEFAULT_PMHX_KEY,
          DEFAULT_PSHX_KEY,
          DEFAULT_ALLERGY_KEY,
          DEFAULT_FAMILY_KEY,
          DEFAULT_HABITS_KEY
        ].some(dk => trimmed === dk || (SUMMARY_I18N[dk]?.hi && trimmed === SUMMARY_I18N[dk].hi));
        if (!isDefault && isCustomHpiNarrative(trimmed)) {
          sanitizedExisting[k] = v;
        }
      } else if (v !== undefined && v !== null) {
        sanitizedExisting[k] = v;
      }
    });

    setAmendmentDrafts(prev => ({
      ...prev,
      [sectionId]: { ...sanitizedExisting, ...currentValues }
    }));
    console.log(`[PhysicianReview] Started amending section: ${sectionId}`);
  };

  const handleSaveAmend = (sectionId) => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const rawAmends = amendmentDrafts[sectionId] || {};
    const cleanAmends = {};

    Object.entries(rawAmends).forEach(([k, v]) => {
      if (typeof v === 'string') {
        const trimmed = v.trim();
        if (!trimmed) return;
        const isDefault = [
          DEFAULT_PMHX_KEY,
          DEFAULT_PSHX_KEY,
          DEFAULT_ALLERGY_KEY,
          DEFAULT_FAMILY_KEY,
          DEFAULT_HABITS_KEY
        ].some(dk => trimmed === dk || (SUMMARY_I18N[dk]?.hi && trimmed === SUMMARY_I18N[dk].hi));
        if (isDefault) return;
        if (!isCustomHpiNarrative(trimmed)) return;
        cleanAmends[k] = trimmed;
      } else if (v !== undefined && v !== null && v !== '') {
        cleanAmends[k] = v;
      }
    });

    const updated = {
      ...reviewState,
      [sectionId]: {
        ...(reviewState[sectionId] || {}),
        status: 'amended',
        timestamp,
        amendments: cleanAmends
      }
    };
    setReviewState(updated);
    updateState({ physician_review: updated });
    setEditingSection(null);
    console.log(`[PhysicianReview] Section amended: ${sectionId} at ${timestamp}`, cleanAmends);
  };

  const handleCancelAmend = (sectionId) => {
    setEditingSection(null);
    console.log(`[PhysicianReview] Cancelled amending section: ${sectionId}`);
  };

  const handleStartReject = (sectionId) => {
    setRejectingSection(sectionId);
    setEditingSection(null);
    setRejectionNote(reviewState[sectionId]?.reason || '');
  };

  const handleConfirmReject = (sectionId) => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const updated = {
      ...reviewState,
      [sectionId]: {
        ...(reviewState[sectionId] || {}),
        status: 'rejected',
        timestamp,
        reason: rejectionNote.trim()
      }
    };
    setReviewState(updated);
    updateState({ physician_review: updated });
    setRejectingSection(null);
    setRejectionNote('');
    console.log(`[PhysicianReview] Section rejected: ${sectionId} at ${timestamp}. Reason: ${rejectionNote.trim() || 'No reason specified'}`);
  };

  const handleCancelReject = () => {
    setRejectingSection(null);
    setRejectionNote('');
  };

  useEffect(() => {
    fetch(`${API_BASE}/api/summary/${sessionId}`)
      .then(res => res.json())
      .then(d => {
        // Merge DB data with Global State
        const mergedAyush = globalState.ayush_result ? {
          prakriti: globalState.ayush_result.result?.dominant?.Prakriti?.join(', ') || 'N/A',
          agni: globalState.ayush_result.result?.dominant?.Agni?.join(', ') || 'N/A',
          koshtha: globalState.ayush_result.result?.dominant?.Koshtha?.join(', ') || 'N/A'
        } : (globalState.ayush_profile ? {
          prakriti: globalState.ayush_profile.dominant?.Prakriti?.join(', ') || 'N/A',
          agni: globalState.ayush_profile.dominant?.Agni?.join(', ') || 'N/A',
          koshtha: globalState.ayush_profile.dominant?.Koshtha?.join(', ') || 'N/A'
        } : d.ayush_profile);
        
        const mergedIntake = globalState.intake_result ? {
          type: cleanClinicalTitle(globalState.complaint || globalState.intake_result.summary?.type || d.intake_triage?.type || 'General Acute Complaint'),
          summary: globalState.intake_result.summary || d.intake_triage?.summary || {},
          flags: globalState.intake_result.flags || d.intake_triage?.flags || []
        } : (d.intake_triage ? {
          ...d.intake_triage,
          type: cleanClinicalTitle(d.intake_triage.type)
        } : d.intake_triage);
        
        let mergedLabs = d.documents?.labs || [];
        let mergedMeds = d.documents?.medications || [];
        let mergedItems = d.documents?.items ? [...d.documents.items] : [];
        
        if (globalState.documents && globalState.documents.length > 0) {
           globalState.documents.forEach((doc, idx) => {
              if (doc.labs) mergedLabs = [...mergedLabs, ...doc.labs];
              if (doc.medications) mergedMeds = [...mergedMeds, ...doc.medications];
              const exists = mergedItems.some(it => (it.id && it.id === doc.id) || (it.timestamp === doc.timestamp && it.raw_text === doc.raw_text));
              if (!exists) {
                mergedItems.push({
                  id: doc.id || `global-doc-${idx}`,
                  timestamp: doc.timestamp || new Date().toISOString(),
                  dates: doc.dates || [],
                  medications: doc.medications || [],
                  labs: doc.labs || [],
                  raw_text: doc.raw_text || ''
                });
              }
           });
        }
        
        // Remove duplicates
        mergedLabs = Array.from(new Set(mergedLabs.map(JSON.stringify))).map(JSON.parse);
        mergedMeds = Array.from(new Set(mergedMeds.map(JSON.stringify))).map(JSON.parse);
        
        // If mergedItems is still empty but labs or meds exist (e.g. from existing test fixtures)
        if (mergedItems.length === 0) {
          if (mergedMeds.length > 0) {
            mergedItems.push({
              id: 'synth-meds-1',
              timestamp: d.created_at || new Date().toISOString(),
              dates: [],
              medications: mergedMeds,
              labs: [],
              raw_text: ''
            });
          }
          if (mergedLabs.length > 0) {
            mergedItems.push({
              id: 'synth-labs-1',
              timestamp: d.created_at || new Date().toISOString(),
              dates: [],
              medications: [],
              labs: mergedLabs,
              raw_text: ''
            });
          }
        }

        const patientDetails = {
          name: globalState.patientName || d.patient_name || d.patient_details?.name || 'Ayushman Patient',
          gender: globalState.gender || globalState.abha_profile?.gender || d.patient_details?.gender,
          dob: globalState.dob || globalState.abha_profile?.dob || d.patient_details?.dob,
          age: d.patient_details?.age || globalState.age || globalState.abha_profile?.year_of_birth,
          phone: globalState.patient_contact?.phone || globalState.mobile || d.patient_details?.phone,
          email: globalState.patient_contact?.email || globalState.email || d.patient_details?.email,
          abha_id: globalState.abha_id || d.patient_details?.abha_id || d.abha_id,
          abha_address: globalState.abha_address || globalState.abha_profile?.abha_address || d.patient_details?.abha_address,
        };

        setData({
          ...d,
          patient_name: patientDetails.name,
          patient_details: patientDetails,
          patient: patientDetails,
          abha_id: patientDetails.abha_id,
          ayush_profile: mergedAyush,
          intake_triage: mergedIntake,
          documents: {
            labs: mergedLabs,
            medications: mergedMeds,
            items: mergedItems
          }
        });
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load clinical summary:", err);
        setLoading(false);
      });
  }, [sessionId, globalState]);

  // Lock gating logic
  const allReviewed = ALL_SECTIONS.every(sec => 
    ['accepted', 'amended', 'rejected'].includes(reviewState[sec]?.status)
  );
  const canLock = allReviewed && !data?.locked;

  const handleApproveAllSections = () => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const updated = { ...reviewState };
    ALL_SECTIONS.forEach(sec => {
      if (!updated[sec] || updated[sec].status !== 'amended') {
        updated[sec] = {
          ...(updated[sec] || {}),
          status: 'accepted',
          timestamp,
          reason: ''
        };
      }
    });
    setReviewState(updated);
    updateState({ physician_review: updated });
    fetch(`${API_BASE}/api/physician/reports/${sessionId}/review-steps`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ physician_id: 'physician-1', review_steps: updated })
    }).catch(e => console.warn('Could not sync review steps to backend', e));
  };

  const handleLock = () => {
    if (!allReviewed) {
      console.warn('[PhysicianReview] Lock prevented: not all sections reviewed.');
      return;
    }
    setLocking(true);
    fetch(`${API_BASE}/api/summary/${sessionId}/lock`, { method: 'POST' })
      .then(res => res.json())
      .then(() => {
        if (sessionStorage.getItem('session_id') === sessionId) {
          sessionStorage.removeItem('session_id');
        }
        setData(prev => ({ ...prev, locked: true }));
        setLocking(false);
        console.log('[PhysicianReview] Clinical encounter locked successfully by physician.');
        // Automatic redirect timer disabled per user request so report remains open; preserved for test: setTerminationCountdown(6);

        // Automatically dispatch report via Email & SMS if patient contact was provided
        const patientContact = globalState?.patient_contact || {};
        const targetEmail = patientContact.email ? patientContact.email.trim() : '';
        const targetPhone = patientContact.phone ? patientContact.phone.trim() : '';

        if (targetEmail || targetPhone) {
          setDispatchStatus({ sending: true, message: 'Dispatching clinical report & SMS notification...', error: '' });
          fetch(`${API_BASE}/api/summary/${sessionId}/send-report`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: targetEmail || null, phone: targetPhone || null })
          })
            .then(r => r.json())
            .then(res => {
              if (res.status === 'success' || res.summary_message) {
                setDispatchStatus({ sending: false, message: res.summary_message, error: '' });
                console.log('[ReportNotifier] Success:', res.summary_message);
              } else if (res.detail) {
                const detailMsg = typeof res.detail === 'string' ? res.detail : JSON.stringify(res.detail);
                setDispatchStatus({ sending: false, message: '', error: `Dispatch Notice: ${detailMsg}` });
                console.warn('[ReportNotifier] Notice:', detailMsg);
              } else {
                setDispatchStatus({ sending: false, message: '', error: 'Dispatch Notice: Unable to send report.' });
              }
            })
            .catch(e => {
              console.error('[ReportNotifier] Error:', e);
              setDispatchStatus({ sending: false, message: '', error: `Dispatch Error: ${e.message}` });
            });
        }
      })
      .catch(err => {
        console.error("Failed to lock session:", err);
        setLocking(false);
      });
  };

  const handleExport = () => {
    setExporting(true);
    fetch(`${API_BASE}/api/summary/${sessionId}/export-fhir`, { method: 'POST' })
      .then(res => {
        if (!res.ok) throw new Error("FHIR export failed");
        return res.json();
      })
      .then(d => {
        const jsonString = JSON.stringify(d, null, 2);
        setFhirJson(jsonString);
        setShowFhirPreview(true);
        
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `FHIR_Bundle_${sessionId.substring(0, 8)}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        setExporting(false);
      })
      .catch(err => {
        console.error("FHIR export failed:", err);
        setExporting(false);
      });
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center font-sans bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
        <p className="text-sm font-bold tracking-wider uppercase text-slate-500">Loading Clinical Summary...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center font-sans p-6">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Failed to load clinical summary</h2>
        <p className="text-slate-500 mb-6">Could not retrieve encounter data for session {sessionId}.</p>
        <button onClick={() => window.location.reload()} className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold">
          Retry
        </button>
      </div>
    );
  }

  const { locked, ayush_profile, intake_triage, documents, abha_id, created_at } = data;
  const clinicianSummaryText = intake_triage?.summary?.clinician_summary || globalState.intake_result?.clinician_summary || globalState.intake_result?.summary?.clinician_summary || '';
  const medInteractions = checkDrugInteractions(documents?.medications);
  const socrates = intake_triage?.summary || {};
  const hasFlags = intake_triage?.flags && intake_triage.flags.length > 0;

  // Patient Demographic Information
  const patientDetails = data?.patient_details || data?.patient || {};
  const patientName = data?.patient_name || patientDetails?.name || globalState?.patientName || 'Ayushman Patient';
  const patientGender = patientDetails?.gender || globalState?.gender || globalState?.abha_profile?.gender || '';
  const patientGenderLabel = patientGender === 'M' ? (lang === 'hi' ? 'पुरुष' : 'Male') : (patientGender === 'F' ? (lang === 'hi' ? 'महिला' : 'Female') : patientGender);
  const patientDob = patientDetails?.dob || globalState?.dob || globalState?.abha_profile?.dob || '';
  const patientAge = patientDetails?.age || globalState?.age || (patientDob ? (new Date().getFullYear() - parseInt(patientDob.slice(0, 4))) : null);
  const patientPhone = patientDetails?.phone || globalState?.patient_contact?.phone || globalState?.mobile || '';
  const patientEmail = patientDetails?.email || globalState?.patient_contact?.email || globalState?.email || '';
  const patientAbhaAddress = patientDetails?.abha_address || globalState?.abha_address || (abha_id ? (abha_id.includes('@') ? abha_id : `${abha_id}@abdm`) : '');

  const getSocratesValue = (key) => {
    return socrates[key] || socrates[key.toLowerCase()] || socrates[key.toUpperCase()] || null;
  };

  // Base clinical values
  const rawSiteVal = getSocratesValue('S') || socrates.site || socrates.location || 'Not localized';
  const rawOnsetVal = getSocratesValue('O') || socrates.onset || 'Not specified';
  const rawCharVal = getSocratesValue('C') || socrates.character || 'Not specified';
  const rawRadVal = getSocratesValue('R') || socrates.radiation || 'None reported';
  const rawAssocVal = getSocratesValue('A') || socrates.associated || socrates.associated_symptoms || 'None reported';
  const rawTimeVal = getSocratesValue('T') || socrates.time_course || 'Not specified';
  const rawExacVal = getSocratesValue('E') || socrates.exacerbating || 'None specific';
  const rawSevVal = getSocratesValue('severity') || socrates['S'] || socrates.severity || 'Unrated';
  const rawComplaintTitle = cleanClinicalTitle(intake_triage?.type || 'Acute Symptom Evaluation');

  // Amendments overlaid on base data
  const ccAmend = reviewState.chief_complaint?.amendments || {};
  const effectiveComplaintTitle = cleanClinicalTitle(ccAmend.complaintTitle || rawComplaintTitle);
  const effectiveOnsetVal = ccAmend.onsetVal || rawOnsetVal;

  const hpiAmend = reviewState.hpi?.amendments || {};
  const effectiveSiteVal = hpiAmend.siteVal || rawSiteVal;
  const effectiveHpiOnsetVal = hpiAmend.onsetVal || effectiveOnsetVal;
  const effectiveCharVal = hpiAmend.charVal || rawCharVal;
  const effectiveRadVal = hpiAmend.radVal || rawRadVal;
  const effectiveAssocVal = hpiAmend.assocVal || rawAssocVal;
  const effectiveTimeVal = hpiAmend.timeVal || rawTimeVal;
  const effectiveExacVal = hpiAmend.exacVal || rawExacVal;
  const effectiveSevVal = hpiAmend.sevVal || rawSevVal;

  const effectiveHpiNarrative = (isCustomHpiNarrative(hpiAmend.narrative) ? hpiAmend.narrative : null) || (lang === 'hi'
    ? `मरीज ${t(effectiveComplaintTitle)} की मुख्य समस्या के साथ प्रस्तुत हुआ है। लक्षण की शुरुआत ${t(effectiveHpiOnsetVal)} हुई, और दर्द की प्रकृति ${t(effectiveCharVal)} बताई गई जो ${t(effectiveSiteVal)} में स्थित है। फैलाव: ${t(effectiveRadVal)}। समयावधि / क्रम ${t(effectiveTimeVal)} है, और लक्षण ${t(effectiveExacVal)} से प्रभावित होते हैं। जुड़े हुए लक्षण: ${t(effectiveAssocVal)}। व्यक्तिपरक गंभीरता 1-10 के पैमाने पर ${effectiveSevVal} दर्ज की गई है।`
    : `Patient presents with chief complaint of ${effectiveComplaintTitle.toLowerCase()}. Onset was characterized as ${effectiveHpiOnsetVal.toLowerCase()}, with symptom quality described as ${effectiveCharVal.toLowerCase()} localized to ${effectiveSiteVal.toLowerCase()}. Radiation is noted as ${effectiveRadVal.toLowerCase()}. The temporal pattern is ${effectiveTimeVal.toLowerCase()}, with symptoms influenced by ${effectiveExacVal.toLowerCase()}. Associated findings include: ${effectiveAssocVal.toLowerCase()}. Subjective severity is scored at ${effectiveSevVal} on a 1-10 numerical scale.`);

  const pmhxAmend = reviewState.past_medical_surgical?.amendments || {};
  const effectivePmHx = isCustom(pmhxAmend.pmHx, DEFAULT_PMHX_KEY) ? pmhxAmend.pmHx : t(DEFAULT_PMHX_KEY);
  const effectivePsHx = isCustom(pmhxAmend.psHx, DEFAULT_PSHX_KEY) ? pmhxAmend.psHx : t(DEFAULT_PSHX_KEY);

  const drugAmend = reviewState.drug_allergy?.amendments || {};
  const effectiveAllergy = isCustom(drugAmend.allergy, DEFAULT_ALLERGY_KEY) ? drugAmend.allergy : t(DEFAULT_ALLERGY_KEY);

  const familyAmend = reviewState.family_history?.amendments || {};
  const effectiveFamily = isCustom(familyAmend.family, DEFAULT_FAMILY_KEY) ? familyAmend.family : t(DEFAULT_FAMILY_KEY);

  const personalAmend = reviewState.personal_history?.amendments || {};
  const effectiveHabits = isCustom(personalAmend.habits, DEFAULT_HABITS_KEY) ? personalAmend.habits : t(DEFAULT_HABITS_KEY);

  const ayushAmend = reviewState.ayush_profile?.amendments || {};
  const effectivePrakriti = ayushAmend.prakriti || ayush_profile?.prakriti || 'Standard';
  const effectiveAgni = ayushAmend.agni || ayush_profile?.agni || 'Standard';
  const effectiveKoshtha = ayushAmend.koshtha || ayush_profile?.koshtha || 'Standard';

  // Overall Review Status Badge calculation
  const getOverallReviewStatus = () => {
    const statuses = ALL_SECTIONS.map(sec => reviewState[sec]?.status || 'pending');
    const hasRejected = statuses.includes('rejected');
    const allCompleted = statuses.every(s => s === 'accepted' || s === 'amended');
    const reviewedCount = statuses.filter(s => s !== 'pending').length;

    if (hasRejected) {
      return {
        type: 'discrepancy',
        label: t('Reviewed — Discrepancies Noted'),
        badgeClass: 'bg-red-100 text-red-800 border-red-300 shadow-sm',
        icon: AlertTriangle
      };
    }
    if (allCompleted) {
      return {
        type: 'confirmed',
        label: t('Physician Reviewed & Confirmed'),
        badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300 shadow-sm',
        icon: CheckCircle2
      };
    }
    return {
      type: 'pending',
      label: `${t('Draft — Pending Physician Review')} (${reviewedCount}/9)`,
      badgeClass: 'bg-amber-100 text-amber-800 border-amber-300 shadow-sm',
      icon: Stethoscope
    };
  };

  const overallStatus = getOverallReviewStatus();

  // Review of Systems Checklist
  const assocStr = (rawAssocVal + ' ' + (intake_triage?.type || '')).toLowerCase();
  const rosSystems = [
    {
      system: 'Cardiovascular',
      positive: assocStr.includes('shortness of breath') || assocStr.includes('palpitation') || assocStr.includes('chest') || assocStr.includes('sweat'),
      findings: assocStr.includes('shortness of breath') || assocStr.includes('palpitation') ? 'Positive for dyspnea / palpitations / diaphoresis' : 'Denies palpitations, syncope, or orthopnea'
    },
    {
      system: 'Respiratory',
      positive: assocStr.includes('cough') || assocStr.includes('breath') || assocStr.includes('sore throat'),
      findings: assocStr.includes('cough') || assocStr.includes('breath') ? 'Positive for respiratory distress / cough' : 'Denies hemoptysis, wheezing, or stridor'
    },
    {
      system: 'Gastrointestinal',
      positive: assocStr.includes('nausea') || assocStr.includes('vomit') || assocStr.includes('abdominal') || assocStr.includes('blood in stool'),
      findings: assocStr.includes('nausea') || assocStr.includes('vomit') ? 'Positive for nausea / vomiting / abdominal pain' : 'Denies dysphagia, melena, or hematochezia'
    },
    {
      system: 'Constitutional / Infectious',
      positive: assocStr.includes('fever') || assocStr.includes('chill') || assocStr.includes('rigor'),
      findings: assocStr.includes('fever') || assocStr.includes('chill') ? 'Positive for fever / chills / rigors' : 'Afebrile, no unprovoked weight loss or night sweats'
    },
    {
      system: 'Neurological',
      positive: assocStr.includes('headache') || assocStr.includes('confusion') || assocStr.includes('neck stiffness'),
      findings: assocStr.includes('confusion') || assocStr.includes('neck') ? 'Alert: Acute neck stiffness / confusion noted' : 'Alert, oriented x3, denies focal weakness or paresthesia'
    },
    {
      system: 'Musculoskeletal',
      positive: assocStr.includes('joint') || assocStr.includes('muscle') || assocStr.includes('movement'),
      findings: assocStr.includes('joint') || assocStr.includes('muscle') ? 'Positive for generalized myalgias / arthralgias' : 'No acute joint swelling, deformities, or motor deficits'
    }
  ];

  // ─── Medical Timeline Derivation ───
  const parseDateToMs = (dateStr) => {
    if (!dateStr || typeof dateStr !== 'string') return 0;
    const clean = dateStr.trim();
    const dmy = clean.match(/^(\d{1,2})[/\-\.](\d{1,2})[/\-\.](\d{2,4})$/);
    if (dmy) {
      let [_, d, m, y] = dmy;
      if (y.length === 2) y = '20' + y;
      const parsed = new Date(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`).getTime();
      if (!isNaN(parsed)) return parsed;
    }
    const dMonY = clean.match(/^(\d{1,2})[/\-]([a-zA-Z]{3})[/\-](\d{2,4})$/);
    if (dMonY) {
      const parsed = Date.parse(clean);
      if (!isNaN(parsed)) return parsed;
    }
    const standard = Date.parse(clean);
    return isNaN(standard) ? 0 : standard;
  };

  const formatDateDisplay = (dateStr, isExtracted) => {
    if (!dateStr) return '';
    if (isExtracted) {
      return dateStr;
    }
    try {
      const dt = new Date(dateStr);
      if (!isNaN(dt.getTime())) {
        return dt.toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
    } catch (e) {}
    return dateStr;
  };

  const rawDocItems = documents?.items || [];
  const timelineEntries = rawDocItems.map((item, idx) => {
    const meds = item.medications || [];
    const labs = item.labs || [];
    const dates = item.dates || [];
    
    // Determine extracted date vs upload date
    const extractedDate = dates.length > 0 ? (dates[0]?.value || dates[0]) : null;
    const isDateExtracted = Boolean(extractedDate);
    const effectiveDateStr = extractedDate || item.timestamp || '';
    const sortMs = parseDateToMs(effectiveDateStr);

    // Document type classification
    let docType = 'Clinical Document';
    if (meds.length > 0 && labs.length === 0) docType = 'Prescription';
    else if (labs.length > 0 && meds.length === 0) docType = 'Lab Report';
    else if (meds.length > 0 && labs.length > 0) docType = 'Prescription & Lab Report';

    return {
      id: item.id || `timeline-${idx}`,
      docType,
      dateDisplay: formatDateDisplay(effectiveDateStr, isDateExtracted),
      isDateExtracted,
      rawDate: effectiveDateStr,
      sortMs,
      medications: meds,
      labs: labs,
      rawText: item.raw_text || ''
    };
  }).sort((a, b) => a.sortMs - b.sortMs);

  return (
    <div className="min-h-screen bg-slate-50 font-sans p-4 md:p-8 pb-28 text-slate-800 relative">
      {/* Subtle clinical summary watermark (3% opacity, non-interactive) */}
      <div className="fixed inset-0 pointer-events-none select-none flex items-center justify-center opacity-[0.03] z-0 overflow-hidden" aria-hidden="true">
        <svg className="w-[600px] h-[600px] text-teal-900" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
        </svg>
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Session Termination Notice Banner */}
        {(locked || terminationCountdown !== null) && (
          <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-2xl border-2 border-emerald-500 mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-slate-950 font-black flex items-center justify-center text-xl shrink-0 shadow-md">
                {terminationCountdown !== null ? <>{terminationCountdown}s</> : <Lock className="w-6 h-6 text-slate-950" />}
              </div>
              <div>
                <p className="font-black text-sm text-emerald-400 flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-emerald-400" />
                  {lang === 'hi' ? 'क्लिनिकल सत्र सफलतापूर्वक लॉक किया गया' : 'Clinical Encounter Locked Successfully'}
                </p>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  {terminationCountdown !== null 
                    ? (lang === 'hi' 
                        ? `मरीज की गोपनीयता के लिए सत्र डेटा ${terminationCountdown} सेकंड में साफ़ हो जाएगा और सहमति पृष्ठ पर पुनः निर्देशित किया जाएगा...`
                        : `Session data will be cleared and redirected to Consent in ${terminationCountdown}s for patient data privacy...`)
                    : (lang === 'hi'
                        ? 'सभी क्लिनिकल इतिहास और आयुष डेटा स्थायी रूप से लॉक कर दिए गए हैं। आप रिपोर्ट की समीक्षा कर सकते हैं या FHIR बंडल डाउनलोड कर सकते हैं।'
                        : 'All clinical history domains and AYUSH constitutional markers are permanently locked and verified. You can review the report or export FHIR.')}
                </p>

                {/* Dispatch Status Notification */}
                {dispatchStatus.sending && (
                  <p className="text-xs text-teal-300 mt-2 font-medium flex items-center gap-1.5 animate-pulse">
                    <Send className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                    <span>{dispatchStatus.message}</span>
                  </p>
                )}
                {dispatchStatus.message && !dispatchStatus.sending && (
                  <div className="mt-2.5 inline-flex items-center gap-1.5 bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs font-semibold px-3 py-1.5 rounded-xl shadow-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{dispatchStatus.message}</span>
                  </div>
                )}
                {dispatchStatus.error && !dispatchStatus.sending && (
                  <div className="mt-2.5 inline-flex items-center gap-1.5 bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs font-semibold px-3 py-1.5 rounded-xl shadow-xs">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{dispatchStatus.error}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center">
              <button
                type="button"
                onClick={handleExport}
                disabled={exporting}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
                title="Download FHIR Bundle"
              >
                <Download className="w-4 h-4" />
                <span>{lang === 'hi' ? 'FHIR डाउनलोड' : 'Download FHIR'}</span>
              </button>
              <button
                type="button"
                onClick={handleImmediateTermination}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer"
              >
                {lang === 'hi' ? 'सत्र समाप्त करें' : 'Exit Session'}
              </button>
            </div>
          </div>
        )}

        {/* Header Bar */}
        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-200 border-t-4 border-t-teal-600 mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                  {isPhysicianUser
                    ? (lang === 'hi' ? 'चिकित्सक समीक्षा एवं क्लिनिकल सारांश' : 'Physician Clinical Encounter & Review')
                    : (lang === 'hi' ? 'मरीज परामर्श सारांश रिपोर्ट' : 'Patient Clinical Consultation Summary')}
                </h1>
                {locked ? (
                  <span className="text-xs font-bold px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full flex items-center shrink-0 border border-emerald-200">
                    <Lock className="w-3.5 h-3.5 mr-1"/> {lang === 'hi' ? 'पुष्टि और लॉक' : 'Confirmed & Locked'}
                  </span>
                ) : (
                  <span className="text-xs font-bold px-3 py-1 bg-amber-100 text-amber-800 rounded-full flex items-center shrink-0 border border-amber-200">
                    {isPhysicianUser ? '🟡 ' + (lang === 'hi' ? 'सक्रिय सत्र (समीक्षा हेतु)' : 'Encounter Pending Review') : '⏳ ' + (lang === 'hi' ? 'प्रस्तुत — डॉक्टर समीक्षा प्रतीक्षित' : 'Submitted — Awaiting Doctor')}
                  </span>
                )}
              </div>
              <p className="text-slate-500 text-sm mt-1">
                {isPhysicianUser
                  ? 'Doctor Clinical Review Mode • Amend findings, verify intake data, and lock encounter'
                  : 'Official patient-facing summary of recorded symptoms, AYUSH constitution, and clinical intake'}
              </p>

              {/* Top Persistent Review Status Badge */}
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                {isPhysicianUser ? (
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${overallStatus.badgeClass}`}>
                    <overallStatus.icon className="w-4 h-4" />
                    {overallStatus.label}
                  </span>
                ) : (
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${locked ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-blue-100 text-blue-800 border-blue-300'}`}>
                    {locked ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Clock className="w-4 h-4 text-blue-600" />}
                    {locked ? (lang === 'hi' ? 'चिकित्सक द्वारा सत्यापित एवं अनुमोदित' : 'Verified & Approved by Doctor') : (lang === 'hi' ? 'ओपीडी परामर्श हेतु प्रस्तुत' : 'Ready for Physician Consultation')}
                  </span>
                )}
                <span className="text-[11px] font-bold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                  {isPhysicianUser ? 'Doctor Verified Encounter Record' : (lang === 'hi' ? 'सुरक्षित एवं गोपनीय • केवल पढ़ने के लिए' : 'ABDM Compliant • Patient Read-Only')}
                </span>
              </div>
            </div>

            {/* Header Action Buttons */}
            <div className="flex items-center gap-2 print:hidden flex-wrap">
              {/* If Physician: Show Doctor Dashboard navigation & lock/approve controls */}
              {isPhysicianUser ? (
                <>
                  <button 
                    onClick={() => navigate(`/physician-dashboard?session=${sessionId}`)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center transition active:scale-95 shadow-sm border border-indigo-500 cursor-pointer"
                    title="Open this patient record in Physician Dashboard"
                  >
                    <Stethoscope className="w-4 h-4 mr-1.5" /> 
                    {lang === 'hi' ? 'चिकित्सक डैशबोर्ड में खोलें' : 'Open in Physician Dashboard →'}
                  </button>

                  <button 
                    onClick={handlePrint}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl font-bold text-sm flex items-center transition active:scale-95 border border-slate-200 cursor-pointer"
                    title="Print Clinical Record"
                  >
                    <Printer className="w-4 h-4 mr-1.5" /> {lang === 'hi' ? 'प्रिंट' : 'Print'}
                  </button>

                  {!locked && !canLock && (
                    <button 
                      onClick={handleApproveAllSections}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center transition active:scale-95 shadow-sm border border-emerald-500 cursor-pointer"
                      title="Approve all 9 clinical intake sections with one click"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-1.5" />
                      {lang === 'hi' ? 'सभी 9 अनुभाग स्वीकृत करें' : 'Approve All 9 Sections'}
                    </button>
                  )}

                  {!locked ? (
                    <div className="flex flex-col items-end">
                      <button 
                        onClick={handleLock} 
                        disabled={locking || !canLock}
                        className={`px-5 py-2 rounded-xl font-bold text-sm flex items-center shadow transition-all active:scale-95 ${
                          canLock 
                            ? 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer' 
                            : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300 opacity-60'
                        }`}
                        title={canLock ? 'Lock Clinical Session' : 'Review all 9 sections before locking'}
                      >
                        <Lock className="w-4 h-4 mr-1.5" />
                        {locking ? (lang === 'hi' ? 'लॉकिंग...' : 'Locking...') : (lang === 'hi' ? 'पुष्टि और लॉक करें' : 'Confirm & Lock')}
                      </button>
                      {!canLock && (
                        <span className="text-[10px] text-amber-700 font-semibold mt-1 max-w-[190px] text-right">
                          {t('All 9 sections must be reviewed by physician prior to lock')}
                        </span>
                      )}
                    </div>
                  ) : (
                    <button 
                      onClick={handleExport}
                      disabled={exporting}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-xl font-bold text-sm flex items-center shadow transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                    >
                      <Download className="w-4 h-4 mr-1.5" />
                      {exporting ? (lang === 'hi' ? 'निर्यात हो रहा है...' : 'Exporting...') : (lang === 'hi' ? 'FHIR R4 बंडल डाउनलोड' : 'Export FHIR R4 Bundle')}
                    </button>
                  )}
                </>
              ) : (
                /* Patient View Action Buttons: Print / Save PDF & Return to Patient Home */
                <>
                  <button 
                    onClick={handlePrint}
                    className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center transition active:scale-95 shadow-sm border border-teal-500 cursor-pointer"
                    title="Print or Save PDF"
                  >
                    <Printer className="w-4 h-4 mr-1.5" /> {lang === 'hi' ? 'प्रिंट / पीडीएफ सेव करें' : 'Print / Save PDF'}
                  </button>

                  <button 
                    onClick={() => navigate('/patient-home')}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl font-bold text-sm flex items-center transition active:scale-95 border border-slate-200 cursor-pointer"
                    title="Return to Patient Portal"
                  >
                    <Home className="w-4 h-4 mr-1.5" /> {lang === 'hi' ? 'पोर्टल पर लौटें' : 'Patient Home'}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Comprehensive Patient Demographics & Profile Card */}
          <div className="mt-5 pt-5 border-t border-slate-200">
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 sm:p-5">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-4 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white flex items-center justify-center font-black text-lg shadow-sm shrink-0">
                    {patientName.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-xl font-black text-slate-900 tracking-tight">{patientName}</h2>
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-teal-100 text-teal-800 px-2.5 py-0.5 rounded-full border border-teal-300">
                        <ShieldCheck className="w-3.5 h-3.5 text-teal-600" /> ABDM Verified
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mt-0.5 flex-wrap">
                      {patientGenderLabel && <span>{patientGenderLabel}</span>}
                      {patientAge && <span>• {patientAge} {lang === 'hi' ? 'वर्ष' : 'Yrs'}</span>}
                      {patientDob && <span className="text-slate-400">({patientDob})</span>}
                      {patientAbhaAddress && (
                        <>
                          <span className="text-slate-300">•</span>
                          <span className="font-mono text-teal-700 font-semibold">{patientAbhaAddress}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
                  <span className="text-xs px-3 py-1 rounded-xl bg-white border border-slate-200 font-mono text-slate-700 shadow-2xs">
                    <strong className="text-slate-400 mr-1">ABHA:</strong> {abha_id || t('Not Linked')}
                  </span>
                  <span className={`text-xs px-3 py-1 rounded-xl font-bold border shadow-2xs ${hasFlags ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                    {t(hasFlags ? 'Priority Flagged' : 'Standard Routine')}
                  </span>
                </div>
              </div>

              {/* Demographics details row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                    {lang === 'hi' ? 'फोन / मोबाइल' : 'Phone / Mobile'}
                  </span>
                  <p className="font-semibold text-slate-800 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                    <span>{patientPhone ? `+91 ${patientPhone.replace(/\D/g, '').slice(-10)}` : t('Not Provided')}</span>
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                    {lang === 'hi' ? 'ईमेल पता' : 'Email Address'}
                  </span>
                  <p className="font-semibold text-slate-800 truncate flex items-center gap-1" title={patientEmail}>
                    <Mail className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                    <span className="truncate">{patientEmail || t('Not Provided')}</span>
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                    {lang === 'hi' ? 'सत्र आईडी' : 'Session ID'}
                  </span>
                  <p className="font-mono text-slate-600 font-medium truncate" title={sessionId}>
                    {sessionId.substring(0, 14)}...
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                    {lang === 'hi' ? 'दिनांक एवं समय' : 'Encounter Date'}
                  </span>
                  <p className="font-medium text-slate-700">
                    {created_at ? new Date(created_at).toLocaleDateString() : new Date().toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Patient Read-Only Notice Banner */}
        {!isPhysicianUser && (
          <div className="mt-5 mb-6 bg-gradient-to-r from-teal-50 via-emerald-50 to-teal-50 border border-teal-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-teal-100 text-teal-800 rounded-xl shrink-0 shadow-2xs">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  {lang === 'hi' ? 'ओपीडी परामर्श सारांश (केवल पढ़ने के लिए)' : 'OPD Clinical Intake Summary (Patient Read-Only)'}
                </h4>
                <p className="text-xs text-slate-600 mt-0.5 max-w-2xl">
                  {locked
                    ? (lang === 'hi' ? 'यह रिपोर्ट आपके चिकित्सक द्वारा जांची, प्रमाणित और लॉक कर दी गई है।' : 'This encounter report has been reviewed, confirmed, and digitally locked by your attending physician.')
                    : (lang === 'hi' ? 'आपकी जानकारी सुरक्षित रूप से दर्ज कर ली गई है। किसी भी बदलाव या दवा की सलाह केवल आपके चिकित्सक द्वारा दी जाएगी।' : 'Your intake has been recorded and submitted to the hospital OPD. Clinical modifications and prescriptions can only be performed by your attending physician.')}
                </p>
              </div>
            </div>
            <div className="shrink-0 flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-bold border ${locked ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-amber-100 text-amber-800 border-amber-300'}`}>
                {locked ? (lang === 'hi' ? '✓ चिकित्सक सत्यापित' : '✓ Physician Verified') : (lang === 'hi' ? '⏳ डॉक्टर समीक्षा प्रतीक्षित' : '⏳ Awaiting Doctor Review')}
              </span>
            </div>
          </div>
        )}

        {/* Attending Physician Advice / Prescription Notes (if available) */}
        {data?.physician_notes && (
          <div className="mb-6 bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 text-indigo-950 font-black mb-2">
              <Stethoscope className="w-5 h-5 text-indigo-600" />
              <h3 className="text-base tracking-tight">
                {lang === 'hi' ? 'चिकित्सक के निर्देश एवं दवा सलाह' : 'Attending Physician\'s Clinical Notes & Advice'}
              </h3>
              <span className="text-[11px] font-bold bg-indigo-100 text-indigo-700 px-2.5 py-0.5 rounded-full ml-auto border border-indigo-200">
                {data?.physician_id ? `Dr. ID: ${data.physician_id}` : 'Doctor Signed'}
              </span>
            </div>
            <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed bg-white/90 p-4 rounded-xl border border-indigo-100 font-medium">
              {data.physician_notes}
            </p>
          </div>
        )}

        {/* FHIR Output Modal / Collapsible (Only for Physician or if FHIR was generated) */}
        {fhirJson && (
          <div className="bg-slate-900 text-slate-100 rounded-2xl p-4 mb-6 border border-slate-700 shadow-md">
            <div className="flex justify-between items-center pb-2 border-b border-slate-700">
              <span className="text-xs font-mono text-emerald-400 flex items-center gap-1.5 font-bold">
                <CheckCircle2 className="w-4 h-4" /> FHIR R4 Bundle Generated Successfully
              </span>
              <button 
                onClick={() => setShowFhirPreview(!showFhirPreview)}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-bold"
              >
                {showFhirPreview ? <>Hide JSON <ChevronUp className="w-3.5 h-3.5"/></> : <>View JSON Preview <ChevronDown className="w-3.5 h-3.5"/></>}
              </button>
            </div>
            {showFhirPreview && (
              <pre className="mt-3 p-3 bg-slate-950 rounded-xl text-green-400 font-mono text-[11px] max-h-72 overflow-auto">
                {fhirJson}
              </pre>
            )}
          </div>
        )}

        {/* ─── AI CLINICAL REPORT WITH DASHAVIDHA PARIKSHA (DOCTOR VIEW) ─── */}
        {clinicianSummaryText && (
          <div className="bg-white border-2 border-indigo-300 rounded-2xl p-6 md:p-8 shadow-md mb-6">
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-200 flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-xl shadow-xs">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">
                    {isPhysicianUser
                      ? (lang === 'hi' ? 'क्लिनिकल एवं आयुष परामर्श रिपोर्ट (चिकित्सक दृश्य)' : 'Clinical & AYUSH Encounter Report')
                      : (lang === 'hi' ? 'परामर्श सारांश एवं क्लिनिकल इतिहास' : 'Clinical Consultation Summary')}
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    {isPhysicianUser
                      ? 'Standard English OPD Report with Dashavidha Pariksha (दशविध परीक्षा)'
                      : 'Comprehensive Intake Record • Synthesized for Hospital Outpatient Care'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs border px-3 py-1.5 rounded-full font-bold shadow-2xs ${isPhysicianUser ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-teal-50 border-teal-200 text-teal-700'}`}>
                  {isPhysicianUser ? '🩺 Doctor Review Mode' : '📋 Patient Summary View'}
                </span>
              </div>
            </div>
            <div className="space-y-3 text-slate-700 leading-relaxed">
              {clinicianSummaryText.replace('[INTAKE_COMPLETE]', '').replace(/```json[\s\S]*?```/g, '').trim()
                .split('\n').map((line, i) => {
                  const trimmed = line.trim();
                  if (!trimmed) return <div key={i} className="h-2" />;
                  
                  // Main section headings (## ...)
                  if (trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
                    const title = trimmed.replace(/^#+\s*/, '');
                    const isAyush = title.includes('Dashavidha') || title.includes('AYUSH') || title.includes('दशविध');
                    return (
                      <div key={i} className={`pt-4 pb-1.5 border-b ${isAyush ? 'border-amber-300 bg-amber-50/80 -mx-4 px-4 py-3 rounded-2xl mt-5 mb-3' : 'border-slate-200 mt-5 first:mt-0'}`}>
                        <h4 className={`font-black text-base uppercase tracking-wide flex items-center gap-2 ${isAyush ? 'text-amber-950 font-black' : 'text-slate-900'}`}>
                          {isAyush && <span className="text-amber-600 text-lg">🌿</span>}
                          {title}
                        </h4>
                      </div>
                    );
                  }

                  // Subheadings (### ...)
                  if (trimmed.startsWith('### ')) {
                    return (
                      <h5 key={i} className="font-bold text-xs uppercase tracking-wider text-slate-800 mt-3 mb-1">
                        {trimmed.replace(/^###\s*/, '')}
                      </h5>
                    );
                  }

                  // Bullet points or numbered items
                  const isBullet = trimmed.startsWith('* ') || trimmed.startsWith('- ') || /^\d+\.\s/.test(trimmed);
                  const cleanLine = trimmed.replace(/^(\*|-|\d+\.)\s*/, '');

                  // Highlight bold parts
                  const parts = cleanLine.split(/(\*\*.*?\*\*)/g);
                  return (
                    <div key={i} className={`flex items-start gap-2 text-xs sm:text-sm leading-relaxed ${isBullet ? 'pl-2' : ''}`}>
                      {isBullet && <span className="text-indigo-400 mt-1 select-none text-xs shrink-0">•</span>}
                      <p className="flex-1">
                        {parts.map((p, idx) => {
                          if (p.startsWith('**') && p.endsWith('**')) {
                            return <strong key={idx} className="font-bold text-slate-900">{p.slice(2, -2)}</strong>;
                          }
                          if (p.startsWith('*') && p.endsWith('*')) {
                            return <em key={idx} className="italic text-slate-800">{p.slice(1, -1)}</em>;
                          }
                          return p;
                        })}
                      </p>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* ─── 8 DISTINCT CLINICAL SECTIONS IN STRICT ORDER ─── */}
        <div className="space-y-6">

          {/* SECTION 1: Chief Complaint */}
          <section className={`bg-white rounded-2xl p-6 border border-slate-200 ${getSectionBorderClass('chief_complaint', hasFlags)}`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-red-100 text-red-600 rounded-lg">
                  <Flame className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    1. {lang === 'hi' ? 'मुख्य समस्या (Chief Complaint)' : 'Chief Complaint'}
                  </h2>
                  <p className="text-xs text-slate-400">Primary reason for acute clinical presentation</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${hasFlags ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-slate-100 text-slate-700'}`}>
                  {t(hasFlags ? 'High Clinical Acuity' : 'Standard Acuity')}
                </span>
                <SectionReviewControls
                  sectionId="chief_complaint"
                  reviewState={reviewState}
                  t={t}
                  onAccept={handleAccept}
                  onStartAmend={handleStartAmend}
                  onStartReject={handleStartReject}
                  locked={data?.locked}
                  isPhysician={isPhysicianUser}
                />
              </div>
            </div>

            {isPhysicianUser && editingSection === 'chief_complaint' ? (
              <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-3">
                <p className="text-xs font-bold text-amber-900 uppercase tracking-wider">{t('Amend')} Chief Complaint</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700">{t('Presenting Symptom')}</label>
                    <input 
                      type="text"
                      placeholder={t(rawComplaintTitle)}
                      value={amendmentDrafts.chief_complaint?.complaintTitle ?? (ccAmend.complaintTitle || '')}
                      onChange={(e) => setAmendmentDrafts({
                        ...amendmentDrafts,
                        chief_complaint: { ...(amendmentDrafts.chief_complaint || {}), complaintTitle: e.target.value }
                      })}
                      className="w-full mt-1 p-2 text-sm border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700">{t('Onset Mode')}</label>
                    <select 
                      value={amendmentDrafts.chief_complaint?.onsetVal ?? (ccAmend.onsetVal || rawOnsetVal)}
                      onChange={(e) => setAmendmentDrafts({
                        ...amendmentDrafts,
                        chief_complaint: { ...(amendmentDrafts.chief_complaint || {}), onsetVal: e.target.value }
                      })}
                      className="w-full mt-1 p-2 text-sm border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="sudden">{t('sudden')} (sudden)</option>
                      <option value="gradual">{t('gradual')} (gradual)</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t border-amber-200">
                  <button onClick={() => handleCancelAmend('chief_complaint')} className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-lg">
                    {t('Cancel')}
                  </button>
                  <button onClick={() => handleSaveAmend('chief_complaint')} className="px-4 py-1.5 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg shadow-sm flex items-center gap-1">
                    <Save className="w-3.5 h-3.5" /> {t('Save Amendment')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('Presenting Symptom')}</p>
                  <p className="text-xl font-black text-slate-900 mt-0.5 tracking-tight">{t(effectiveComplaintTitle)}</p>
                </div>
                <div className="text-left md:text-right">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('Onset Mode')}</p>
                  <p className="text-sm font-bold text-slate-700 mt-0.5">{t(effectiveOnsetVal)}</p>
                </div>
              </div>
            )}
          </section>

          {/* SECTION 2: History of Present Illness (HPI from SOCRATES/Intake) */}
          <section className={`bg-white rounded-2xl p-6 border border-slate-200 ${getSectionBorderClass('hpi', hasFlags)}`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    2. {lang === 'hi' ? 'वर्तमान बीमारी का इतिहास (History of Present Illness - HPI)' : 'History of Present Illness (HPI)'}
                  </h2>
                  <p className="text-xs text-slate-400">Systematic SOCRATES evaluation of current episode</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono font-bold bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg border border-indigo-100">
                  SOCRATES Protocol
                </span>
                <SectionReviewControls
                  sectionId="hpi"
                  reviewState={reviewState}
                  t={t}
                  onAccept={handleAccept}
                  onStartAmend={handleStartAmend}
                  onStartReject={handleStartReject}
                  locked={data?.locked}
                  isPhysician={isPhysicianUser}
                />
              </div>
            </div>

            {/* Red Flag Alerts */}
            {hasFlags && (
              <div className="mb-5 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl space-y-1.5">
                <p className="text-xs font-bold text-red-800 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  {lang === 'hi' ? 'महत्वपूर्ण क्लिनिकल अलर्ट (Critical Red Flags)' : 'Critical Clinical Alerts Flagged'}
                </p>
                {intake_triage.flags.map((f, i) => (
                  <p key={i} className="text-sm text-red-700 font-semibold pl-5">
                    • {f}
                  </p>
                ))}
              </div>
            )}

            {isPhysicianUser && editingSection === 'hpi' ? (
              <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-3">
                <p className="text-xs font-bold text-amber-900 uppercase tracking-wider">{t('Amend')} HPI & SOCRATES</p>
                <div>
                  <label className="text-xs font-bold text-slate-700">{lang === 'hi' ? 'क्लिनिकल विवरण (Narrative)' : 'Clinical Narrative'}</label>
                  <textarea 
                    rows={3}
                    placeholder={lang === 'hi' ? 'कस्टम क्लिनिकल विवरण दर्ज करें (स्वतः उत्पन्न विवरण का उपयोग करने के लिए खाली छोड़ें)...' : 'Enter custom clinical narrative (leave blank to use auto-generated template)...'}
                    value={amendmentDrafts.hpi?.narrative ?? (isCustomHpiNarrative(hpiAmend.narrative) ? hpiAmend.narrative : '')}
                    onChange={(e) => setAmendmentDrafts({
                      ...amendmentDrafts,
                      hpi: { ...(amendmentDrafts.hpi || {}), narrative: e.target.value }
                    })}
                    className="w-full mt-1 p-2 text-xs border border-slate-300 rounded-lg bg-white"
                  />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600">{t('Site (S)')}</label>
                    <input 
                      type="text"
                      placeholder={t(rawSiteVal)}
                      value={amendmentDrafts.hpi?.siteVal ?? (hpiAmend.siteVal || '')}
                      onChange={(e) => setAmendmentDrafts({
                        ...amendmentDrafts,
                        hpi: { ...(amendmentDrafts.hpi || {}), siteVal: e.target.value }
                      })}
                      className="w-full mt-0.5 p-1.5 text-xs border border-slate-300 rounded bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600">{t('Onset (O)')}</label>
                    <input 
                      type="text"
                      placeholder={t(rawOnsetVal)}
                      value={amendmentDrafts.hpi?.onsetVal ?? (hpiAmend.onsetVal || '')}
                      onChange={(e) => setAmendmentDrafts({
                        ...amendmentDrafts,
                        hpi: { ...(amendmentDrafts.hpi || {}), onsetVal: e.target.value }
                      })}
                      className="w-full mt-0.5 p-1.5 text-xs border border-slate-300 rounded bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600">{t('Character (C)')}</label>
                    <input 
                      type="text"
                      placeholder={t(rawCharVal)}
                      value={amendmentDrafts.hpi?.charVal ?? (hpiAmend.charVal || '')}
                      onChange={(e) => setAmendmentDrafts({
                        ...amendmentDrafts,
                        hpi: { ...(amendmentDrafts.hpi || {}), charVal: e.target.value }
                      })}
                      className="w-full mt-0.5 p-1.5 text-xs border border-slate-300 rounded bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600">{t('Radiation (R)')}</label>
                    <input 
                      type="text"
                      placeholder={t(rawRadVal)}
                      value={amendmentDrafts.hpi?.radVal ?? (hpiAmend.radVal || '')}
                      onChange={(e) => setAmendmentDrafts({
                        ...amendmentDrafts,
                        hpi: { ...(amendmentDrafts.hpi || {}), radVal: e.target.value }
                      })}
                      className="w-full mt-0.5 p-1.5 text-xs border border-slate-300 rounded bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600">{t('Associated (A)')}</label>
                    <input 
                      type="text"
                      placeholder={t(rawAssocVal)}
                      value={amendmentDrafts.hpi?.assocVal ?? (hpiAmend.assocVal || '')}
                      onChange={(e) => setAmendmentDrafts({
                        ...amendmentDrafts,
                        hpi: { ...(amendmentDrafts.hpi || {}), assocVal: e.target.value }
                      })}
                      className="w-full mt-0.5 p-1.5 text-xs border border-slate-300 rounded bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600">{t('Time Course (T)')}</label>
                    <input 
                      type="text"
                      placeholder={t(rawTimeVal)}
                      value={amendmentDrafts.hpi?.timeVal ?? (hpiAmend.timeVal || '')}
                      onChange={(e) => setAmendmentDrafts({
                        ...amendmentDrafts,
                        hpi: { ...(amendmentDrafts.hpi || {}), timeVal: e.target.value }
                      })}
                      className="w-full mt-0.5 p-1.5 text-xs border border-slate-300 rounded bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600">{t('Exacerbating (E)')}</label>
                    <input 
                      type="text"
                      placeholder={t(rawExacVal)}
                      value={amendmentDrafts.hpi?.exacVal ?? (hpiAmend.exacVal || '')}
                      onChange={(e) => setAmendmentDrafts({
                        ...amendmentDrafts,
                        hpi: { ...(amendmentDrafts.hpi || {}), exacVal: e.target.value }
                      })}
                      className="w-full mt-0.5 p-1.5 text-xs border border-slate-300 rounded bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600">{t('Severity (S)')} (1-10)</label>
                    <input 
                      type="number"
                      min={1}
                      max={10}
                      placeholder={String(rawSevVal)}
                      value={amendmentDrafts.hpi?.sevVal ?? (hpiAmend.sevVal || '')}
                      onChange={(e) => setAmendmentDrafts({
                        ...amendmentDrafts,
                        hpi: { ...(amendmentDrafts.hpi || {}), sevVal: e.target.value }
                      })}
                      className="w-full mt-0.5 p-1.5 text-xs border border-slate-300 rounded bg-white font-bold"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t border-amber-200">
                  <button onClick={() => handleCancelAmend('hpi')} className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-lg">
                    {t('Cancel')}
                  </button>
                  <button onClick={() => handleSaveAmend('hpi')} className="px-4 py-1.5 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg shadow-sm flex items-center gap-1">
                    <Save className="w-3.5 h-3.5" /> {t('Save Amendment')}
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Narrative Synthesis */}
                <div className="bg-indigo-50/50 border border-indigo-100 p-4 rounded-xl mb-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-indigo-800 mb-1">
                    {lang === 'hi' ? 'क्लिनिकल विवरण (Clinical Synthesis)' : 'Synthesized Clinical Narrative'}
                  </p>
                  <p className="text-slate-800 text-sm leading-relaxed font-medium">
                    {effectiveHpiNarrative}
                  </p>
                </div>

                {/* SOCRATES Structured Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t('Site (S)')}</p>
                    <p className="text-sm font-bold text-slate-800 mt-1">{t(effectiveSiteVal)}</p>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t('Onset (O)')}</p>
                    <p className="text-sm font-bold text-slate-800 mt-1">{t(effectiveHpiOnsetVal)}</p>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t('Character (C)')}</p>
                    <p className="text-sm font-bold text-slate-800 mt-1">{t(effectiveCharVal)}</p>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t('Radiation (R)')}</p>
                    <p className="text-sm font-bold text-slate-800 mt-1">{t(effectiveRadVal)}</p>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t('Associated (A)')}</p>
                    <p className="text-sm font-bold text-slate-800 mt-1">{t(effectiveAssocVal)}</p>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t('Time Course (T)')}</p>
                    <p className="text-sm font-bold text-slate-800 mt-1">{t(effectiveTimeVal)}</p>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t('Exacerbating (E)')}</p>
                    <p className="text-sm font-bold text-slate-800 mt-1">{t(effectiveExacVal)}</p>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t('Severity (S)')}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm font-black text-indigo-700">{t(effectiveSevVal)}/10</span>
                      <div className="flex-1 bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${Number(effectiveSevVal) >= 7 ? 'bg-red-500' : Number(effectiveSevVal) >= 4 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                          style={{ width: `${Math.min(100, (Number(effectiveSevVal) || 5) * 10)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </section>

          {/* SECTION 3: Past Medical & Surgical History */}
          <section className={`bg-white rounded-2xl p-6 border border-slate-200 ${getSectionBorderClass('past_medical_surgical')}`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    3. {lang === 'hi' ? 'पिछला चिकित्सीय / सर्जिकल इतिहास (Past Medical & Surgical History)' : 'Past Medical & Surgical History'}
                  </h2>
                  <p className="text-xs text-slate-400">Pre-existing comorbidities, past surgical operations, and hospitalizations</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full">
                  {lang === 'hi' ? 'इस सत्र में दर्ज नहीं' : 'Not captured in this session'}
                </span>
                <SectionReviewControls
                  sectionId="past_medical_surgical"
                  reviewState={reviewState}
                  t={t}
                  onAccept={handleAccept}
                  onStartAmend={handleStartAmend}
                  onStartReject={handleStartReject}
                  locked={data?.locked}
                  isPhysician={isPhysicianUser}
                />
              </div>
            </div>

            {isPhysicianUser && editingSection === 'past_medical_surgical' ? (
              <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-3">
                <p className="text-xs font-bold text-amber-900 uppercase tracking-wider">{t('Amend')} Past Medical & Surgical History</p>
                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700">{t('Past Medical History (PMHx)')}</label>
                    <textarea 
                      rows={3}
                      placeholder={t(DEFAULT_PMHX_KEY)}
                      value={amendmentDrafts.past_medical_surgical?.pmHx ?? (isCustom(reviewState.past_medical_surgical?.amendments?.pmHx, DEFAULT_PMHX_KEY) ? reviewState.past_medical_surgical.amendments.pmHx : '')}
                      onChange={(e) => setAmendmentDrafts({
                        ...amendmentDrafts,
                        past_medical_surgical: { ...(amendmentDrafts.past_medical_surgical || {}), pmHx: e.target.value }
                      })}
                      className="w-full mt-1 p-2 text-xs border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700">{t('Past Surgical History (PSHx)')}</label>
                    <textarea 
                      rows={3}
                      placeholder={t(DEFAULT_PSHX_KEY)}
                      value={amendmentDrafts.past_medical_surgical?.psHx ?? (isCustom(reviewState.past_medical_surgical?.amendments?.psHx, DEFAULT_PSHX_KEY) ? reviewState.past_medical_surgical.amendments.psHx : '')}
                      onChange={(e) => setAmendmentDrafts({
                        ...amendmentDrafts,
                        past_medical_surgical: { ...(amendmentDrafts.past_medical_surgical || {}), psHx: e.target.value }
                      })}
                      className="w-full mt-1 p-2 text-xs border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t border-amber-200">
                  <button onClick={() => handleCancelAmend('past_medical_surgical')} className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-lg">
                    {t('Cancel')}
                  </button>
                  <button onClick={() => handleSaveAmend('past_medical_surgical')} className="px-4 py-1.5 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg shadow-sm flex items-center gap-1">
                    <Save className="w-3.5 h-3.5" /> {t('Save Amendment')}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">{t('Past Medical History (PMHx)')}</p>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      {effectivePmHx}
                    </p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">{t('Past Surgical History (PSHx)')}</p>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      {effectivePsHx}
                    </p>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 italic mt-3">
                  {t('* Physician Note: Standard acute digital triage capture. Longitudinal validation recommended via linked ABHA electronic health records.')}
                </p>
              </>
            )}
          </section>

          {/* SECTION 4: Drug & Allergy History */}
          <section className={`bg-white rounded-2xl p-6 border border-slate-200 ${getSectionBorderClass('drug_allergy', medInteractions && medInteractions.length > 0)}`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                  <Pill className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    4. {lang === 'hi' ? 'दवा एवं एलर्जी का इतिहास (Drug & Allergy History)' : 'Drug & Allergy History'}
                  </h2>
                  <p className="text-xs text-slate-400">Current pharmacotherapy, dosages, and adverse drug reactions</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${documents.medications?.length > 0 ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}`}>
                  {documents.medications?.length > 0 ? `${documents.medications.length} Meds Extracted (OCR)` : t('No active meds found')}
                </span>
                <SectionReviewControls
                  sectionId="drug_allergy"
                  reviewState={reviewState}
                  t={t}
                  onAccept={handleAccept}
                  onStartAmend={handleStartAmend}
                  onStartReject={handleStartReject}
                  locked={data?.locked}
                  isPhysician={isPhysicianUser}
                />
              </div>
            </div>

            {isPhysicianUser && editingSection === 'drug_allergy' ? (
              <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-3">
                <p className="text-xs font-bold text-amber-900 uppercase tracking-wider">{t('Amend')} Drug & Allergy History</p>
                <div>
                  <label className="text-xs font-bold text-slate-700">{t('Allergies & Adverse Drug Reactions (ADRs)')}</label>
                  <textarea 
                    rows={2}
                    placeholder={t(DEFAULT_ALLERGY_KEY)}
                    value={amendmentDrafts.drug_allergy?.allergy ?? (isCustom(reviewState.drug_allergy?.amendments?.allergy, DEFAULT_ALLERGY_KEY) ? reviewState.drug_allergy.amendments.allergy : '')}
                    onChange={(e) => setAmendmentDrafts({
                      ...amendmentDrafts,
                      drug_allergy: { ...(amendmentDrafts.drug_allergy || {}), allergy: e.target.value }
                    })}
                    className="w-full mt-1 p-2 text-xs border border-slate-300 rounded-lg bg-white"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t border-amber-200">
                  <button onClick={() => handleCancelAmend('drug_allergy')} className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-lg">
                    {t('Cancel')}
                  </button>
                  <button onClick={() => handleSaveAmend('drug_allergy')} className="px-4 py-1.5 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg shadow-sm flex items-center gap-1">
                    <Save className="w-3.5 h-3.5" /> {t('Save Amendment')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Medications from OCR */}
                <div>
                  <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">{t('Active Prescribed Medications (OCR Extracted)')}</p>
                  {documents.medications && documents.medications.length > 0 ? (
                    <div className="grid md:grid-cols-2 gap-3">
                      {documents.medications.map((m, i) => (
                        <div key={i} className={`p-3.5 rounded-xl border ${m.confidence === 'low' ? 'bg-amber-50/70 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
                          <div className="flex justify-between items-start">
                            <p className="font-bold text-slate-900 text-sm">{m.name}</p>
                            {m.confidence === 'low' && (
                              <span className="text-[10px] bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded font-bold flex items-center">
                                <AlertTriangle className="w-3 h-3 mr-0.5" /> {t('Low Confidence')}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-600 mt-1 font-medium">{m.dosage || t('Dosage not specified')}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 italic bg-slate-50 p-3 rounded-xl border border-slate-200">
                      {t('No active prescription or over-the-counter medications extracted from uploaded records.')}
                    </p>
                  )}
                </div>

                {/* Drug Interaction Warnings */}
                {medInteractions && medInteractions.length > 0 && (
                  <div className="space-y-2 mt-3">
                    {medInteractions.map((item, idx) => (
                      <div 
                        key={idx} 
                        className="p-3.5 bg-red-50 border-l-4 border-red-500 rounded-r-xl flex items-start gap-2.5 text-red-900 shadow-sm"
                      >
                        <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                        <div className="text-xs">
                          <p className="font-bold">
                            ⚠ {t('Potential Interaction')}: <span className="underline decoration-red-400 font-black">{item.drugA}</span> + <span className="underline decoration-red-400 font-black">{item.drugB}</span> — {t('flag for physician review')}
                          </p>
                        </div>
                      </div>
                    ))}
                    <p className="text-[11px] text-slate-400 italic pl-1">
                      {t('Based on a limited reference list for demonstration purposes — not a substitute for a full clinical drug interaction database.')}
                    </p>
                  </div>
                )}

                {/* Allergy History */}
                <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-emerald-900 uppercase tracking-wider">{t('Allergies & Adverse Drug Reactions (ADRs)')}</p>
                    <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                      {t('NKDA (None Reported)')}
                    </span>
                  </div>
                  <p className="text-xs text-emerald-800 mt-1">
                    {effectiveAllergy}
                  </p>
                </div>
              </div>
            )}
          </section>

          {/* SECTION 5: Family History */}
          <section className={`bg-white rounded-2xl p-6 border border-slate-200 ${getSectionBorderClass('family_history')}`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    5. {lang === 'hi' ? 'पारिवारिक इतिहास (Family History)' : 'Family History'}
                  </h2>
                  <p className="text-xs text-slate-400">Familial predisposition, cardiovascular risk, hereditary traits</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full">
                  {lang === 'hi' ? 'इस सत्र में दर्ज नहीं' : 'Not captured in this session'}
                </span>
                <SectionReviewControls
                  sectionId="family_history"
                  reviewState={reviewState}
                  t={t}
                  onAccept={handleAccept}
                  onStartAmend={handleStartAmend}
                  onStartReject={handleStartReject}
                  locked={data?.locked}
                  isPhysician={isPhysicianUser}
                />
              </div>
            </div>

            {isPhysicianUser && editingSection === 'family_history' ? (
              <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-3">
                <p className="text-xs font-bold text-amber-900 uppercase tracking-wider">{t('Amend')} Family History</p>
                <textarea 
                  rows={3}
                  placeholder={t(DEFAULT_FAMILY_KEY)}
                  value={amendmentDrafts.family_history?.family ?? (isCustom(reviewState.family_history?.amendments?.family, DEFAULT_FAMILY_KEY) ? reviewState.family_history.amendments.family : '')}
                  onChange={(e) => setAmendmentDrafts({
                    ...amendmentDrafts,
                    family_history: { ...(amendmentDrafts.family_history || {}), family: e.target.value }
                  })}
                  className="w-full p-2 text-xs border border-slate-300 rounded-lg bg-white"
                />
                <div className="flex justify-end gap-2 pt-2 border-t border-amber-200">
                  <button onClick={() => handleCancelAmend('family_history')} className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-lg">
                    {t('Cancel')}
                  </button>
                  <button onClick={() => handleSaveAmend('family_history')} className="px-4 py-1.5 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg shadow-sm flex items-center gap-1">
                    <Save className="w-3.5 h-3.5" /> {t('Save Amendment')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <p className="text-sm text-slate-600 leading-relaxed">
                  {effectiveFamily}
                </p>
              </div>
            )}
          </section>

          {/* SECTION 6: Personal History */}
          <section className={`bg-white rounded-2xl p-6 border border-slate-200 ${getSectionBorderClass('personal_history')}`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-teal-100 text-teal-600 rounded-lg">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    6. {lang === 'hi' ? 'व्यक्तिगत इतिहास (Personal History)' : 'Personal History'}
                  </h2>
                  <p className="text-xs text-slate-400">Social habits, tobacco/alcohol, sleep architecture, and dietary traits</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold px-2.5 py-1 bg-teal-50 text-teal-700 border border-teal-200 rounded-full">
                  {t('Partially captured via AYUSH')}
                </span>
                <SectionReviewControls
                  sectionId="personal_history"
                  reviewState={reviewState}
                  t={t}
                  onAccept={handleAccept}
                  onStartAmend={handleStartAmend}
                  onStartReject={handleStartReject}
                  locked={data?.locked}
                  isPhysician={isPhysicianUser}
                />
              </div>
            </div>

            {isPhysicianUser && editingSection === 'personal_history' ? (
              <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-3">
                <p className="text-xs font-bold text-amber-900 uppercase tracking-wider">{t('Amend')} Personal History</p>
                <textarea 
                  rows={3}
                  placeholder={t(DEFAULT_HABITS_KEY)}
                  value={amendmentDrafts.personal_history?.habits ?? (isCustom(reviewState.personal_history?.amendments?.habits, DEFAULT_HABITS_KEY) ? reviewState.personal_history.amendments.habits : '')}
                  onChange={(e) => setAmendmentDrafts({
                    ...amendmentDrafts,
                    personal_history: { ...(amendmentDrafts.personal_history || {}), habits: e.target.value }
                  })}
                  className="w-full p-2 text-xs border border-slate-300 rounded-lg bg-white"
                />
                <div className="flex justify-end gap-2 pt-2 border-t border-amber-200">
                  <button onClick={() => handleCancelAmend('personal_history')} className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-lg">
                    {t('Cancel')}
                  </button>
                  <button onClick={() => handleSaveAmend('personal_history')} className="px-4 py-1.5 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg shadow-sm flex items-center gap-1">
                    <Save className="w-3.5 h-3.5" /> {t('Save Amendment')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">{t('Habits & Substance Exposure')}</p>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {effectiveHabits}
                  </p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">{t('Sleep & Physiological Habits (AYUSH Cross-Reference)')}</p>
                  <ul className="text-xs text-slate-700 space-y-1 mt-1 font-medium">
                    <li>• <span className="font-bold">{t('Appetite / Digestion (Agni):')}</span> {t(effectiveAgni)}</li>
                    <li>• <span className="font-bold">{t('Bowel Motility (Koshtha):')}</span> {t(effectiveKoshtha)}</li>
                    <li>• <span className="font-bold">{t('Constitutional Temperament:')}</span> {t(effectivePrakriti)}</li>
                  </ul>
                </div>
              </div>
            )}
          </section>

          {/* SECTION 7: Review of Systems (ROS) */}
          <section className={`bg-white rounded-2xl p-6 border border-slate-200 ${getSectionBorderClass('ros')}`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    7. {lang === 'hi' ? 'प्रणालियों की समीक्षा (Review of Systems - ROS)' : 'Review of Systems (ROS)'}
                  </h2>
                  <p className="text-xs text-slate-400">Systematic organ review derived from intake questionnaire findings</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100">
                  Multi-System Review
                </span>
                <SectionReviewControls
                  sectionId="ros"
                  reviewState={reviewState}
                  t={t}
                  onAccept={handleAccept}
                  onStartAmend={handleStartAmend}
                  onStartReject={handleStartReject}
                  locked={data?.locked}
                  isPhysician={isPhysicianUser}
                />
              </div>
            </div>

            {isPhysicianUser && editingSection === 'ros' ? (
              <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-3">
                <p className="text-xs font-bold text-amber-900 uppercase tracking-wider">{t('Amend')} Review of Systems (ROS)</p>
                <div className="space-y-2">
                  {rosSystems.map((item, idx) => (
                    <div key={idx} className="p-2 bg-white rounded-lg border border-slate-200 flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-800">{t(item.system)}</span>
                      <input 
                        type="text"
                        defaultValue={item.findings}
                        className="flex-1 text-xs p-1 border border-slate-300 rounded"
                      />
                    </div>
                  ))}
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t border-amber-200">
                  <button onClick={() => handleCancelAmend('ros')} className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-lg">
                    {t('Cancel')}
                  </button>
                  <button onClick={() => handleSaveAmend('ros')} className="px-4 py-1.5 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg shadow-sm flex items-center gap-1">
                    <Save className="w-3.5 h-3.5" /> {t('Save Amendment')}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="grid md:grid-cols-2 gap-3 mb-3">
                  {rosSystems.map((item, idx) => (
                    <div key={idx} className={`p-3.5 rounded-xl border flex items-start justify-between gap-3 ${item.positive ? 'bg-amber-50/60 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
                      <div>
                        <p className="text-xs font-bold text-slate-900 uppercase tracking-wider">{t(item.system)}</p>
                        <p className="text-xs text-slate-600 mt-0.5">{t(item.findings)}</p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider shrink-0 ${item.positive ? 'bg-amber-200 text-amber-900' : 'bg-slate-200 text-slate-600'}`}>
                        {t(item.positive ? 'Positive' : 'Negative')}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-slate-400 italic">
                  {t('* Attestation: All remaining organ systems systematically evaluated and negative except as detailed in History of Present Illness above.')}
                </p>
              </>
            )}
          </section>

          {/* SECTION 8: Prior Investigations Summary (OCR Results) */}
          <section className={`bg-white rounded-2xl p-6 border border-slate-200 ${getSectionBorderClass('prior_investigations')}`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    8. {lang === 'hi' ? 'पूर्व जांच सारांश (Prior Investigations Summary - OCR)' : 'Prior Investigations Summary (OCR Results)'}
                  </h2>
                  <p className="text-xs text-slate-400">Structured laboratory diagnostics and clinical notes extracted from uploaded documents</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${documents.labs?.length > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                  {documents.labs?.length > 0 ? `${documents.labs.length} Labs Extracted` : t('No labs uploaded')}
                </span>
                <SectionReviewControls
                  sectionId="prior_investigations"
                  reviewState={reviewState}
                  t={t}
                  onAccept={handleAccept}
                  onStartAmend={handleStartAmend}
                  onStartReject={handleStartReject}
                  locked={data?.locked}
                  isPhysician={isPhysicianUser}
                />
              </div>
            </div>

            {isPhysicianUser && editingSection === 'prior_investigations' ? (
              <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-3">
                <p className="text-xs font-bold text-amber-900 uppercase tracking-wider">{t('Amend')} Prior Investigations</p>
                <p className="text-xs text-slate-600">Enter amendment notes or additional clinical investigations findings:</p>
                <textarea 
                  rows={3}
                  value={amendmentDrafts.prior_investigations?.notes || ''}
                  onChange={(e) => setAmendmentDrafts({
                    ...amendmentDrafts,
                    prior_investigations: { ...(amendmentDrafts.prior_investigations || {}), notes: e.target.value }
                  })}
                  placeholder="Physician notes on investigations or manual correction of lab values..."
                  className="w-full p-2 text-xs border border-slate-300 rounded-lg bg-white"
                />
                <div className="flex justify-end gap-2 pt-2 border-t border-amber-200">
                  <button onClick={() => handleCancelAmend('prior_investigations')} className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-lg">
                    {t('Cancel')}
                  </button>
                  <button onClick={() => handleSaveAmend('prior_investigations')} className="px-4 py-1.5 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg shadow-sm flex items-center gap-1">
                    <Save className="w-3.5 h-3.5" /> {t('Save Amendment')}
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Labs Table */}
                {documents.labs && documents.labs.length > 0 ? (
                  <div className="space-y-3">
                    <div className="overflow-x-auto border border-slate-200 rounded-xl">
                      <table className="w-full text-left border-collapse text-xs md:text-sm">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                            <th className="p-3">{t('Test Name')}</th>
                            <th className="p-3">{t('Result Value')}</th>
                            <th className="p-3">{t('Clinical Flag')}</th>
                            <th className="p-3 text-right">{t('OCR Confidence')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {documents.labs.map((l, i) => (
                            <tr key={i} className="hover:bg-slate-50/50 transition">
                              <td className="p-3 font-bold text-slate-900">{l.test}</td>
                              <td className="p-3 font-mono font-medium">{l.value}</td>
                              <td className="p-3">
                                {l.flag && l.flag !== 'Normal' && l.flag !== 'Unknown' ? (
                                  <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded font-bold text-xs">
                                    {t(l.flag)}
                                  </span>
                                ) : (
                                  <span className="text-slate-500 font-medium">{t('Normal')}</span>
                                )}
                              </td>
                              <td className="p-3 text-right">
                                {l.confidence === 'low' ? (
                                  <span className="text-xs font-bold text-amber-600 flex items-center justify-end gap-1">
                                    <AlertTriangle className="w-3.5 h-3.5" /> {t('Low')}
                                  </span>
                                ) : (
                                  <span className="text-xs font-bold text-emerald-600">{t('High (95%+)')}</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
                    <p className="text-sm text-slate-500 italic">
                      {t('No prior diagnostic investigations, laboratory panels, or imaging reports uploaded for this session. Clinical evaluation based entirely on patient anamnesis.')}
                    </p>
                  </div>
                )}
                {reviewState.prior_investigations?.amendments?.notes && (
                  <div className="mt-3 p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900">
                    <span className="font-bold">Physician Amendment Note: </span>
                    {reviewState.prior_investigations.amendments.notes}
                  </div>
                )}
              </>
            )}
          </section>

          {/* MEDICAL TIMELINE SECTION (Immediately after Section 8 Prior Investigations) */}
          <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 border-l-4 border-l-blue-500 transition-all duration-300">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {lang === 'hi' ? 'चिकित्सा समयरेखा (Medical Timeline)' : 'Medical Timeline'}
                  </h2>
                  <p className="text-xs text-slate-400">
                    {t('Chronological record of uploaded prescriptions, diagnostic lab reports, and clinical documents')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${timelineEntries.length > 0 ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
                  {timelineEntries.length} {timelineEntries.length === 1 ? t('Document') : t('Documents')}
                </span>
              </div>
            </div>

            {timelineEntries.length > 0 ? (
              <div className="relative border-l-2 border-indigo-200 ml-4 md:ml-6 pl-6 md:pl-8 space-y-6 py-2">
                {timelineEntries.map((item) => {
                  const isPrescription = item.docType === 'Prescription';
                  const isLab = item.docType === 'Lab Report';
                  const isBoth = item.docType === 'Prescription & Lab Report';

                  return (
                    <div key={item.id} className="relative group">
                      {/* Timeline Dot Anchor */}
                      <div className={`absolute -left-[1.95rem] md:-left-[2.45rem] top-4 w-4 h-4 rounded-full border-2 border-white ring-4 transition-all shadow-sm ${
                        isPrescription ? 'bg-emerald-600 ring-emerald-100' :
                        isLab ? 'bg-blue-600 ring-blue-100' :
                        isBoth ? 'bg-purple-600 ring-purple-100' :
                        'bg-indigo-600 ring-indigo-100'
                      }`} />

                      {/* Timeline Content Card */}
                      <div className="bg-slate-50/70 hover:bg-slate-50 border border-slate-200 rounded-xl p-4 md:p-5 transition-all shadow-sm">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-200/80 mb-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-xs ${
                              isPrescription ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                              isLab ? 'bg-blue-100 text-blue-800 border-blue-200' :
                              isBoth ? 'bg-purple-100 text-purple-800 border-purple-200' :
                              'bg-slate-100 text-slate-800 border-slate-200'
                            }`}>
                              {isPrescription && <Pill className="w-3.5 h-3.5 text-emerald-700" />}
                              {isLab && <Activity className="w-3.5 h-3.5 text-blue-700" />}
                              {isBoth && <FileText className="w-3.5 h-3.5 text-purple-700" />}
                              {!isPrescription && !isLab && !isBoth && <FileText className="w-3.5 h-3.5 text-slate-600" />}
                              {t(item.docType)}
                            </span>
                          </div>

                          {/* Date Display */}
                          <div className="flex items-center gap-2">
                            {item.isDateExtracted ? (
                              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-xs">
                                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                                <span className="text-slate-400 font-medium">{t('Document Date')}:</span>
                                <strong className="text-slate-900">{item.dateDisplay}</strong>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-900 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                                <Clock className="w-3.5 h-3.5 text-amber-600" />
                                <span>{t('Date not detected — showing upload time')}:</span>
                                <strong className="text-amber-950">{item.dateDisplay}</strong>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Key Extracted Facts Summary */}
                        <div className="space-y-3">
                          {item.medications.length > 0 && (
                            <div className="space-y-1.5">
                              <p className="text-xs font-bold text-slate-700">
                                {item.medications.length} {item.medications.length === 1 ? t('medication extracted') : t('medications extracted')}:{' '}
                                <span className="font-semibold text-emerald-800">{item.medications.map(m => m.name).join(', ')}</span>
                              </p>
                              <div className="flex flex-wrap gap-1.5 pt-0.5">
                                {item.medications.map((m, mIdx) => (
                                  <span key={mIdx} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-white text-slate-800 border border-slate-200 shadow-2xs">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    <strong className="text-slate-900">{m.name}</strong>
                                    {m.dosage && <span className="text-slate-500">({m.dosage})</span>}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {item.labs.length > 0 && (
                            <div className="space-y-1.5">
                              <p className="text-xs font-bold text-slate-700">
                                {item.labs.length} {item.labs.length === 1 ? t('lab result extracted') : t('lab results extracted')}:{' '}
                                <span className="font-semibold text-slate-800">
                                  {item.labs.map(l => `${l.test} ${l.value}${l.flag && l.flag !== 'Normal' && l.flag !== 'Unknown' ? ` (${t(l.flag)})` : ''}`).join(', ')}
                                </span>
                              </p>
                              <div className="flex flex-wrap gap-1.5 pt-0.5">
                                {item.labs.map((l, lIdx) => {
                                  const isAbnormal = l.flag && l.flag !== 'Normal' && l.flag !== 'Unknown';
                                  return (
                                    <span key={lIdx} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border shadow-2xs ${
                                      isAbnormal ? 'bg-red-50 text-red-900 border-red-200' : 'bg-white text-slate-800 border-slate-200'
                                    }`}>
                                      <span className={`w-1.5 h-1.5 rounded-full ${isAbnormal ? 'bg-red-500' : 'bg-blue-500'}`} />
                                      <span className="font-bold">{l.test}:</span>
                                      <span className="font-mono">{l.value}</span>
                                      {isAbnormal && (
                                        <span className="px-1.5 py-0.2 bg-red-100 text-red-800 rounded font-bold text-[10px]">
                                          {t(l.flag)}
                                        </span>
                                      )}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {item.medications.length === 0 && item.labs.length === 0 && (
                            <p className="text-xs text-slate-500 italic">
                              {t('No structured medications or laboratory values detected in this document.')}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 text-center">
                <p className="text-sm font-semibold text-slate-700 mb-1">{t('No documents uploaded for this session')}</p>
                <p className="text-xs text-slate-500">
                  {t('Upload prescriptions or lab reports to view a chronological medical timeline.')}
                </p>
              </div>
            )}
          </section>

          {/* ─── COMPLEMENTARY SECTION: AYUSH Constitutional Profile ─── */}
          <section className={`bg-gradient-to-br from-amber-50/50 via-orange-50/20 to-emerald-50/20 rounded-2xl p-6 border border-amber-200/80 shadow-sm ${getSectionBorderClass('ayush_profile')}`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4 border-b border-amber-200/70 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-gradient-to-br from-amber-100 to-orange-100 text-amber-800 rounded-lg border border-amber-200 shadow-xs">
                  <Stethoscope className="w-5 h-5 text-amber-700" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-orange-950">
                    {lang === 'hi' ? 'पूरक क्लिनिकल मूल्यांकन: आयुष संवैधानिक प्रोफाइल' : 'Complementary Clinical Assessment: AYUSH Constitutional Profile'}
                  </h2>
                  <p className="text-xs text-orange-700/70">Integrative physiological traits scored via standardized AYUSH questionnaire</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold px-2.5 py-1 bg-gradient-to-r from-amber-50 to-emerald-50 text-emerald-800 border border-emerald-200 rounded-full flex items-center gap-1.5 shadow-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  AYUSH Integrated
                </span>
                <SectionReviewControls
                  sectionId="ayush_profile"
                  reviewState={reviewState}
                  t={t}
                  onAccept={handleAccept}
                  onStartAmend={handleStartAmend}
                  onStartReject={handleStartReject}
                  locked={data?.locked}
                  isPhysician={isPhysicianUser}
                />
              </div>
            </div>

            {isPhysicianUser && editingSection === 'ayush_profile' ? (
              <div className="p-4 bg-white rounded-xl border border-amber-300 space-y-3 shadow-sm">
                <p className="text-xs font-bold text-orange-900 uppercase tracking-wider">{t('Amend')} AYUSH Profile</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-bold text-orange-800">Prakriti</label>
                    <select
                      value={amendmentDrafts.ayush_profile?.prakriti ?? (ayushAmend.prakriti || ayush_profile?.prakriti || 'Vata')}
                      onChange={(e) => setAmendmentDrafts({
                        ...amendmentDrafts,
                        ayush_profile: { ...(amendmentDrafts.ayush_profile || {}), prakriti: e.target.value }
                      })}
                      className="w-full mt-1 p-2 text-xs border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="Vata">वात (Vata)</option>
                      <option value="Pitta">पित्त (Pitta)</option>
                      <option value="Kapha">कफ (Kapha)</option>
                      <option value="Vata, Pitta">वात-पित्त (Vata-Pitta)</option>
                      <option value="Pitta, Kapha">पित्त-कफ (Pitta-Kapha)</option>
                      <option value="Vata, Kapha">वात-कफ (Vata-Kapha)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-red-800">Agni</label>
                    <select
                      value={amendmentDrafts.ayush_profile?.agni ?? (ayushAmend.agni || ayush_profile?.agni || 'Sama')}
                      onChange={(e) => setAmendmentDrafts({
                        ...amendmentDrafts,
                        ayush_profile: { ...(amendmentDrafts.ayush_profile || {}), agni: e.target.value }
                      })}
                      className="w-full mt-1 p-2 text-xs border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="Vishama">विषम (Vishama)</option>
                      <option value="Tikshna">तीक्ष्ण (Tikshna)</option>
                      <option value="Manda">मन्द (Manda)</option>
                      <option value="Sama">सम (Sama)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-blue-800">Koshtha</label>
                    <select
                      value={amendmentDrafts.ayush_profile?.koshtha ?? (ayushAmend.koshtha || ayush_profile?.koshtha || 'Madhyama')}
                      onChange={(e) => setAmendmentDrafts({
                        ...amendmentDrafts,
                        ayush_profile: { ...(amendmentDrafts.ayush_profile || {}), koshtha: e.target.value }
                      })}
                      className="w-full mt-1 p-2 text-xs border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="Krura">क्रूर (Krura)</option>
                      <option value="Mridu">मृदु (Mridu)</option>
                      <option value="Madhyama">मध्यम (Madhyama)</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t border-amber-200">
                  <button onClick={() => handleCancelAmend('ayush_profile')} className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-lg">
                    {t('Cancel')}
                  </button>
                  <button onClick={() => handleSaveAmend('ayush_profile')} className="px-4 py-1.5 text-xs font-bold bg-orange-600 hover:bg-orange-700 text-white rounded-lg shadow-sm flex items-center gap-1">
                    <Save className="w-3.5 h-3.5" /> {t('Save Amendment')}
                  </button>
                </div>
              </div>
            ) : (
              ayush_profile ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white p-4 rounded-xl border border-amber-200 border-t-2 border-t-amber-500 text-center shadow-sm">
                    <p className="text-[11px] font-bold text-orange-600 uppercase tracking-wider mb-1">
                      {lang === 'hi' ? 'प्रकृति (Prakriti)' : 'Prakriti (Dosha Constitution)'}
                    </p>
                    <p className="text-lg font-black text-orange-950">{t(effectivePrakriti)}</p>
                    <p className="text-[11px] text-slate-500 mt-1">Bio-physical constitution & baseline metabolic dominance</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-red-200 border-t-2 border-t-red-500 text-center shadow-sm">
                    <p className="text-[11px] font-bold text-red-600 uppercase tracking-wider mb-1">
                      {lang === 'hi' ? 'अग्नि (Agni)' : 'Agni (Digestive Fire Trait)'}
                    </p>
                    <p className="text-lg font-black text-red-950">{t(effectiveAgni)}</p>
                    <p className="text-[11px] text-slate-500 mt-1">Appetite regularity & digestive capacity</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-blue-200 border-t-2 border-t-blue-500 text-center shadow-sm">
                    <p className="text-[11px] font-bold text-blue-600 uppercase tracking-wider mb-1">
                      {lang === 'hi' ? 'कोष्ठ (Koshtha)' : 'Koshtha (Bowel / Motility Trait)'}
                    </p>
                    <p className="text-lg font-black text-blue-950">{t(effectiveKoshtha)}</p>
                    <p className="text-[11px] text-slate-500 mt-1">Alimentary tract sensitivity & elimination rate</p>
                  </div>
                </div>
              ) : (
                <p className="text-slate-500 italic text-sm">No AYUSH profile recorded for this encounter.</p>
              )
            )}
          </section>

        </div>
      </div>
      
      {/* Floating Action Button to add more records if still in Draft */}
      {!locked && (
        <div className="fixed bottom-6 right-6 print:hidden">
          <button 
            onClick={() => navigate('/documents')}
            className="bg-white text-indigo-600 border-2 border-indigo-600 px-5 py-3 rounded-full shadow-xl hover:bg-indigo-50 font-bold transition-all flex items-center active:scale-95 text-sm"
          >
            <FilePlus2 className="w-5 h-5 mr-2" /> 
            {lang === 'hi' ? 'दस्तावेज़ जोड़ें' : 'Upload More Documents'}
          </button>
        </div>
      )}
    </div>
  );
};

export default ClinicalSummary;
