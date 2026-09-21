# Jeevan OPD - Intelligent Clinical Triage & AYUSH Integration Platform

> **Smart India Hackathon (SIH)** • Interoperable Digital Health & Outpatient Assessment System conforming to NDHM / ABDM FHIR R4 Standards.

---

## Overview

**Jeevan** is an AI-augmented, bilingual (English & Hindi) clinical intake and assessment platform built for Indian outpatient departments (OPDs). It streamlines patient triage, bridges classical AYUSH constitutional evaluation with modern allopathic clinical assessment, detects life-threatening emergency red-flags, and delivers instant, physician-verified clinical summaries via Email (SendGrid) and SMS (Twilio).

---

## Key Features

1. **Granular ABDM Consent Management**
   - 5 independent consent scopes (Voice, Documents, AYUSH, HIS/EMR, ABHA FHIR).
   - Real-time bilingual voice reading of consent terms (Hindi/English).
   - Validates 14-character ABHA Health ID and captures optional patient contact info (Email & Phone).

2. **Multilingual Chief Complaint Selection**
   - Direct triage pathways: Abdominal Pain, Chest Pain, Fever, Cough, etc.
   - Immediate routing to integrated AYUSH or modern clinical flows.

3. **AYUSH Constitutional Assessment (Prakriti, Agni, Koshtha)**
   - Guided multi-domain questionnaire with real-time Speech-to-Text (STT) voice matching.
   - Dual-language audio readout for rural and illiterate patient accessibility.
   - Automatic classification of constitutional Dosha balance (Vata, Pitta, Kapha), digestive fire (Agni), and bowel habit (Koshtha).

4. **Structured SOCRATES Clinical Intake & Red-Flag Interruption**
   - Dynamic clinical decision trees capturing Site, Onset, Character, Radiation, Associated symptoms, Time course, Exacerbating factors, and Severity.
   - **Emergency Red-Flag Interruption**: High-acuity patterns (e.g. crushing chest pain radiating to arm/jaw) trigger immediate critical audio-visual alerts and divert to Emergency Priority Triage.

5. **Document OCR & Prescription Intelligence**
   - Digital upload for prescriptions and lab reports.
   - Automated entity extraction for active medications and diagnostic values.
   - Real-time drug-drug interaction alerts (e.g. Warfarin + Aspirin bleed hazard).

6. **Physician Review & Clinical Summary**
   - 8-domain structured summary compliant with NDHM standards.
   - Attending physician view with Accept, Amend, or Reject workflow for every section.
   - Digital locking mechanism ensuring tamper-proof encounter records.
   - Interoperable **FHIR R4 Bundle** generation and JSON export.

7. **Automated Multi-Channel Report Dispatch**
   - Automatically generates a complete clinical summary upon physician lock.
   - Delivers a structured HTML report to the patient's verified email via **SendGrid**.
   - Sends instant completion SMS notifications via **Twilio**.

---

## Tech Stack

* **Frontend**: React 18, Vite, Tailwind CSS, Lucide Icons, Web Speech API (Bilingual TTS & STT).
* **Backend**: FastAPI (Python 3.12), PostgreSQL (Production) / SQLite (Local Dev), SQLAlchemy, Pydantic v2, PyJWT, Uvicorn, HTTPX.
* **Integrations**: SendGrid Mail API, Twilio REST API, MSG91, ABDM M1/M2 Gateway, HL7 FHIR R4 Bundle Builder.

### Database Operational Modes
* **Production (`ENV_MODE=production`)**: Connects strictly to PostgreSQL (e.g. Supabase, AWS RDS, Neon) via `DATABASE_URL`. Fails fast on startup if connection cannot be established.
* **Development (`ENV_MODE=development`)**: Automatically falls back to local SQLite (`backend/data/ayush.db`) when a PostgreSQL connection is not configured.

---

## Getting Started

### Prerequisites
* Node.js (v18+) & npm
* Python (3.11+)

### 1. Backend Setup
```bash
cd backend
python -m venv venv
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
# Fill in your SENDGRID_API_KEY and TWILIO credentials in .env

python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:5173` in your browser.

---

## License
Confidential • Developed for Smart India Hackathon (SIH).
