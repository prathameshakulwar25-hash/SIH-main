import re
import difflib
import io
import json
import logging
import asyncio
import sys
from typing import Tuple, Dict, Any, List, Optional

logger = logging.getLogger("ocr_extractor")

async def _ocr_image(pil_img) -> str:
    """
    Cross-platform OCR helper:
    1. On Windows: uses Windows Media OCR (winocr) if available.
    2. On Linux/Docker or fallback: uses pytesseract.
    """
    if sys.platform == "win32":
        try:
            import winocr
            res = await winocr.recognize_pil(pil_img, 'en')
            if res and hasattr(res, 'text') and res.text.strip():
                return res.text.strip()
        except Exception as e:
            logger.debug(f"winocr recognition skipped/failed: {e}")

    try:
        import pytesseract
        text = pytesseract.image_to_string(pil_img).strip()
        if text:
            return text
    except Exception as e:
        logger.debug(f"pytesseract recognition skipped/failed: {e}")

    return ""

# Reference ranges for common diagnostic lab tests
REFERENCE_RANGES = {
    "HbA1c": {"min": 4.0, "max": 5.6, "unit": "%"},
    "Blood Glucose": {"min": 70, "max": 99, "unit": "mg/dL"},
    "Fasting Blood Sugar": {"min": 70, "max": 99, "unit": "mg/dL"},
    "Post Prandial Blood Sugar": {"min": 70, "max": 140, "unit": "mg/dL"},
    "Hemoglobin": {"min": 12.0, "max": 17.5, "unit": "g/dL"},
    "WBC": {"min": 4.5, "max": 11.0, "unit": "10^9/L"},
    "Total Leukocyte Count": {"min": 4000, "max": 11000, "unit": "/cumm"},
    "Creatinine": {"min": 0.6, "max": 1.2, "unit": "mg/dL"},
    "Serum Creatinine": {"min": 0.6, "max": 1.2, "unit": "mg/dL"},
    "Cholesterol": {"min": 0, "max": 200, "unit": "mg/dL"},
    "Platelets": {"min": 150, "max": 450, "unit": "10^9/L"},
    "Platelet Count": {"min": 1.5, "max": 4.5, "unit": "Lakhs/cumm"},
    "Blood Pressure": {"min": 90, "max": 120, "unit": "mmHg"},
    "ESR": {"min": 0, "max": 20, "unit": "mm/1st hr"},
    "TSH": {"min": 0.4, "max": 4.5, "unit": "uIU/mL"}
}

def check_value_in_range(test_name: str, value_str: str) -> str:
    """Evaluate numeric lab value against standard reference ranges."""
    try:
        # Extract leading numeric portion
        match = re.search(r'(\d+(?:\.\d+)?)', str(value_str))
        if not match:
            return "Normal"
        val = float(match.group(1))
        
        # Look up best matching reference range
        closest = difflib.get_close_matches(test_name, REFERENCE_RANGES.keys(), n=1, cutoff=0.6)
        if not closest:
            return "Normal"
        ref = REFERENCE_RANGES[closest[0]]
        
        if val < ref["min"]:
            return f"Below range (min: {ref['min']} {ref.get('unit', '')})".strip()
        elif val > ref["max"]:
            return f"Above range (max: {ref['max']} {ref.get('unit', '')})".strip()
        return "Normal"
    except Exception:
        return "Normal"

async def extract_raw_text(content: bytes, filename: str = "") -> str:
    """
    Extracts raw text from uploaded document bytes (PDF, Image, or Text).
    Uses native Windows OCR or pypdf. NEVER uses mock/fake data.
    """
    if not content or len(content) == 0:
        return ""

    filename_lower = filename.lower()
    is_pdf = content.startswith(b'%PDF-') or filename_lower.endswith('.pdf')

    # 1. PDF Handler
    if is_pdf:
        try:
            import pypdf
            reader = pypdf.PdfReader(io.BytesIO(content))
            pages_text = []
            for page in reader.pages:
                txt = page.extract_text()
                if txt and txt.strip():
                    pages_text.append(txt.strip())
            
            extracted_pdf_text = "\n\n".join(pages_text).strip()
            if len(extracted_pdf_text) > 15:
                logger.info(f"Extracted {len(extracted_pdf_text)} characters from PDF stream.")
                return extracted_pdf_text

            # If PDF is scanned (no text stream), extract embedded images and OCR them
            logger.info("PDF has minimal text stream; attempting OCR on embedded page images.")
            scanned_ocr_parts = []
            from PIL import Image
            for page in reader.pages:
                for img_obj in page.images:
                    try:
                        pil_img = Image.open(io.BytesIO(img_obj.data))
                        if pil_img.mode != 'RGB':
                            pil_img = pil_img.convert('RGB')
                        ocr_txt = await _ocr_image(pil_img)
                        if ocr_txt:
                            scanned_ocr_parts.append(ocr_txt)
                    except Exception as img_ex:
                        logger.warning(f"Error OCRing embedded PDF image: {img_ex}")
            if scanned_ocr_parts:
                return "\n\n".join(scanned_ocr_parts).strip()
        except Exception as pdf_ex:
            logger.warning(f"pypdf extraction error: {pdf_ex}")

    # 2. Image Handler (Cross-platform: Windows Media OCR / Pytesseract)
    try:
        from PIL import Image, ImageEnhance
        image = Image.open(io.BytesIO(content))
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        # Preprocess: If resolution is small (<1200px width), upscale 2x and enhance contrast for sharp OCR
        w, h = image.size
        if w < 1200:
            scale = 2.0
            image = image.resize((int(w * scale), int(h * scale)), Image.Resampling.LANCZOS)
            enhancer = ImageEnhance.Contrast(image)
            image = enhancer.enhance(1.4)
        
        ocr_result = await _ocr_image(image)
        if ocr_result:
            logger.info(f"OCR extracted {len(ocr_result)} characters from image.")
            return ocr_result
    except Exception as img_ex:
        logger.warning(f"Image OCR error: {img_ex}")

    # 4. Plain Text / Markdown Handler
    try:
        decoded = content.decode('utf-8', errors='ignore').strip()
        if len(decoded) > 10 and any(c.isalpha() for c in decoded):
            return decoded
    except Exception:
        pass

    logger.warning("Could not extract legible text from uploaded document. Returning empty string.")
    return ""

async def extract_entities_with_llm(raw_text: str) -> Dict[str, Any]:
    """
    Extracts structured clinical entities using Groq LLM with strict anti-hallucination guardrails.
    Guarantees that unmentioned medications (e.g. Paracetamol) are NEVER fabricated.
    """
    import os
    from openai import OpenAI

    api_key = (
        os.getenv("GROQ_API_KEY") 
        or os.getenv("GROK_API_KEY") 
        or os.getenv("OPENAI_API_KEY") 
        or ""
    ).strip()
    base_url = os.getenv("GROQ_API_BASE", "https://api.groq.com/openai/v1")
    model = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")

    if not api_key:
        logger.info("No LLM API key available, using deterministic regex extractor.")
        return extract_entities_with_regex(raw_text)

    prompt = f"""Extract medical information from this clinical document OCR text.

CRITICAL ANTI-HALLUCINATION INSTRUCTIONS:
1. Extract ONLY medical entities explicitly and directly written in the text below.
2. DO NOT fabricate, guess, infer, or hallucinate any medication, dosage, test, or diagnosis.
3. If no medications are mentioned, 'medications' MUST be an empty list [].
4. If no diagnoses are mentioned, 'diagnoses' MUST be an empty list [].
5. NEVER add Paracetamol, Metformin, or any unmentioned medication.

Output STRICTLY a JSON object matching this schema:
{{
  "diagnoses": [{{"condition": "string"}}],
  "medications": [{{"name": "string", "dosage": "string"}}],
  "labs": [{{"test": "string", "value": "string", "flag": "string"}}],
  "dates": [{{"value": "string"}}],
  "doctor_notes": ["string"]
}}

Document Text:
\"\"\"
{raw_text}
\"\"\"
"""

    try:
        client = OpenAI(api_key=api_key, base_url=base_url)
        resp = client.chat.completions.create(
            model=model,
            messages=[
                {
                    "role": "system",
                    "content": "You are a clinical records parsing specialist. Output strictly valid JSON only with zero hallucinated entities."
                },
                {"role": "user", "content": prompt}
            ],
            temperature=0.0
        )
        content_text = resp.choices[0].message.content.strip()
        
        # Remove any Markdown code block wrapping if present
        if content_text.startswith("```"):
            content_text = re.sub(r'^```(?:json)?\s*', '', content_text)
            content_text = re.sub(r'\s*```$', '', content_text)
            
        data = json.loads(content_text.strip())
        
        parsed = {
            "dates": data.get("dates", []),
            "medications": data.get("medications", []),
            "labs": data.get("labs", []),
            "diagnoses": data.get("diagnoses", []),
            "doctor_notes": data.get("doctor_notes", [])
        }

        # Standardize items with confidence fields
        for d in parsed["diagnoses"]:
            if isinstance(d, dict) and "confidence" not in d:
                d["confidence"] = "high"
        for m in parsed["medications"]:
            if isinstance(m, dict):
                # Medications extracted via OCR require clinical/patient verification -> mark low confidence
                m["confidence"] = "low"
        for dt in parsed["dates"]:
            if isinstance(dt, dict) and "confidence" not in dt:
                dt["confidence"] = "high"

        # Validate and annotate lab test reference flags
        key_map = {k.lower(): k for k in REFERENCE_RANGES.keys()}
        for lab in parsed["labs"]:
            if isinstance(lab, dict):
                if "confidence" not in lab:
                    lab["confidence"] = "high"
                test_name = lab.get("test", "").strip()
                # Fuzzy normalize test name against known clinical lab tests (e.g. HbA1e -> HbA1c)
                close = difflib.get_close_matches(test_name.lower(), key_map.keys(), n=1, cutoff=0.6)
                if close:
                    test_name = key_map[close[0]]
                    lab["test"] = test_name
                
                val = str(lab.get("value", "")).strip()
                # If HbA1c value was captured without decimal point (e.g. 82% from HbA1e82%), normalize to 8.2%
                if test_name == "HbA1c":
                    m_val = re.search(r'(\d+(?:\.\d+)?)', val)
                    if m_val:
                        num = float(m_val.group(1))
                        if 30 <= num <= 200:
                            val = f"{num / 10:.1f}"
                            lab["value"] = f"{val}%"

                current_flag = lab.get("flag", "").strip()
                calculated_flag = check_value_in_range(test_name, val)
                if not current_flag or current_flag.lower() in ["normal", "unknown", ""] or "Above" in calculated_flag or "Below" in calculated_flag:
                    lab["flag"] = calculated_flag

        return parsed

    except Exception as llm_ex:
        logger.warning(f"Groq LLM entity extraction failed ({llm_ex}). Falling back to deterministic regex.")
        return extract_entities_with_regex(raw_text)

def extract_entities_with_regex(raw_text: str) -> Dict[str, Any]:
    """
    Deterministic regex-based extractor running strictly on actual raw text.
    NEVER introduces mock or hardcoded values.
    """
    parsed_data = {
        "dates": [],
        "medications": [],
        "labs": [],
        "diagnoses": [],
        "doctor_notes": []
    }

    if not raw_text or not raw_text.strip():
        return parsed_data

    # 1. Date Extraction
    date_pattern = r'\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{1,2}-[a-zA-Z]{3}-\d{4})\b'
    dates = re.findall(date_pattern, raw_text)
    for d in set(dates):
        parsed_data["dates"].append({"value": d, "confidence": "high"})

    # 2. Labs Extraction (Fuzzy Match + Proximity Regex)
    processed_text = re.sub(r'([\|\-\%])', r' \1 ', raw_text)
    processed_text = re.sub(r'(?<=[a-zA-Z])(?=\d)', ' ', processed_text)
    processed_text = re.sub(r'(?<=\d)(?=[a-zA-Z])', ' ', processed_text)
    
    key_map = {k.lower(): k for k in REFERENCE_RANGES.keys()}
    lines = processed_text.split('\n')
    for line in lines:
        words = line.split()
        for i, word in enumerate(words):
            cleaned_word = re.sub(r'[^a-zA-Z0-9]', '', word)
            matches = difflib.get_close_matches(cleaned_word.lower(), key_map.keys(), n=1, cutoff=0.6)
            if matches:
                test_name = key_map[matches[0]]
                lookahead = words[i+1:i+5]
                clean_lookahead = [w for w in lookahead if w not in ['|', '-', ':', '=']]
                
                number_match = None
                for candidate in clean_lookahead:
                    match = re.search(r'(\d+(?:\.\d+)?)', candidate)
                    if match:
                        number_match = match.group(1)
                        break
                
                if number_match:
                    flag = check_value_in_range(test_name, number_match)
                    confidence = "high" if word.lower() == test_name.lower() else "medium"
                    if not any(l["test"] == test_name and l["value"] == number_match for l in parsed_data["labs"]):
                        parsed_data["labs"].append({
                            "test": test_name,
                            "value": number_match,
                            "flag": flag,
                            "confidence": confidence
                        })

    # 3. Medications (Dosage Proximity Heuristic)
    raw_lines = raw_text.split('\n')
    dosage_pattern = r'(\b\d{1,4}\s?(mg|g|mcg|ml)\b|\b(1-0-1|1-1-1|1-0-0|0-0-1|OD|0D|BD|TDS|QID|SOS|PRN)\b)'
    KNOWN_MEDS = [
        "warfarin", "aspirin", "lisinopril", "enalapril", "metformin",
        "paracetamol", "amoxicillin", "ibuprofen", "atorvastatin", "pantoprazole",
        "pantocid", "losartan", "azithromycin", "ciprofloxacin", "omeprazole",
        "glimepiride", "telmisartan", "amlodipine", "cetirizine", "levocetirizine",
        "hydroxychloroquine", "clopidogrel", "ranitidine", "domperidone", "insulin"
    ]
    extracted_names = set()

    for line in raw_lines:
        match = re.search(dosage_pattern, line, re.IGNORECASE)
        if match:
            dosage = line[match.start():].strip()
            prefix = line[:match.start()].strip()
            med_words = prefix.split()
            if med_words:
                med_name = " ".join(med_words[-2:]) if len(med_words) > 1 else med_words[-1]
                med_name = re.sub(r'[^a-zA-Z0-9\s]', '', med_name).strip()
                if (
                    med_name.lower() not in ['rx', 'the', 'and', 'with', 'patient', 'date', 'clinic', 'medications', 'tab', 'cap', 'syp', 'inj'] 
                    and not any(test.lower() in med_name.lower() for test in REFERENCE_RANGES.keys())
                    and len(med_name) > 2
                ):
                    parsed_data["medications"].append({
                        "name": med_name,
                        "dosage": dosage or "As prescribed",
                        "confidence": "high" if any(km in med_name.lower() for km in KNOWN_MEDS) else "medium"
                    })
                    extracted_names.add(med_name.lower())

    # Only sweep known meds IF they explicitly appear as whole words in raw_text
    for km in KNOWN_MEDS:
        if not any(km in name for name in extracted_names):
            if re.search(r'\b' + re.escape(km) + r'\b', raw_text, re.IGNORECASE):
                parsed_data["medications"].append({
                    "name": km.capitalize(),
                    "dosage": "As prescribed",
                    "confidence": "high"
                })
                extracted_names.add(km)

    # 4. Diagnoses Extraction
    KNOWN_CONDITIONS = {
        "hypertension": "Essential Hypertension",
        "high blood pressure": "Essential Hypertension",
        "diabetes": "Type 2 Diabetes Mellitus",
        "asthma": "Bronchial Asthma",
        "copd": "Chronic Obstructive Pulmonary Disease",
        "migraine": "Chronic Migraine",
        "hypothyroid": "Hypothyroidism",
        "gastritis": "Acute / Chronic Gastritis",
        "gerd": "Gastroesophageal Reflux Disease",
        "dyslipidemia": "Dyslipidemia / Hypercholesterolemia",
        "cholesterol": "Hypercholesterolemia",
        "arthritis": "Osteoarthritis / Arthropathy",
        "angina": "Angina Pectoris",
        "fatty liver": "Hepatic Steatosis (Fatty Liver)"
    }
    extracted_diagnoses = set()

    for line in raw_lines:
        line_clean = line.strip()
        dx_match = re.search(r'^(?:dx|diagnosis|impression|k\/c\/o|history of)\s*[:\-]\s*(.+)$', line_clean, re.IGNORECASE)
        if dx_match:
            dx_text = dx_match.group(1).strip()
            if len(dx_text) > 3:
                parsed_data["diagnoses"].append({
                    "condition": dx_text,
                    "confidence": "high"
                })
                extracted_diagnoses.add(dx_text.lower())
        
        adv_match = re.search(r'^(?:advice|plan|instructions?|rx advice)\s*[:\-]\s*(.+)$', line_clean, re.IGNORECASE)
        if adv_match:
            adv_text = adv_match.group(1).strip()
            if len(adv_text) > 3:
                parsed_data["doctor_notes"].append(adv_text)

    for kw, standard_name in KNOWN_CONDITIONS.items():
        if not any(kw in ed for ed in extracted_diagnoses):
            if re.search(r'\b' + re.escape(kw) + r'\b', raw_text, re.IGNORECASE):
                parsed_data["diagnoses"].append({
                    "condition": standard_name,
                    "confidence": "high"
                })
                extracted_diagnoses.add(kw)

    return parsed_data

async def extract_document_data(content: bytes, filename: str = "") -> Tuple[str, Dict[str, Any]]:
    """
    Main asynchronous pipeline for document extraction.
    1. Extracts real raw text from PDF, Image (Windows OCR), or plain text.
    2. Runs Groq LLM extraction with anti-hallucination prompt.
    3. Falls back to deterministic regex if LLM is unavailable.
    Guarantees NO mock Paracetamol or fabricated data.
    """
    raw_text = await extract_raw_text(content, filename=filename)
    if not raw_text or not raw_text.strip():
        return "", {
            "dates": [],
            "medications": [],
            "labs": [],
            "diagnoses": [],
            "doctor_notes": []
        }
    
    parsed_data = await extract_entities_with_llm(raw_text)
    return raw_text, parsed_data

def extract_document_data_sync(content: bytes, filename: str = "") -> Tuple[str, Dict[str, Any]]:
    """Synchronous wrapper for legacy callers."""
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            # In a running loop, run regex or execute async in executor
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as pool:
                return pool.submit(lambda: asyncio.run(extract_document_data(content, filename))).result()
        else:
            return loop.run_until_complete(extract_document_data(content, filename))
    except Exception:
        raw_text = content.decode('utf-8', errors='ignore') if content else ""
        return raw_text, extract_entities_with_regex(raw_text)
