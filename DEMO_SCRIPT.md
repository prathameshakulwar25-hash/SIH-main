# Demo Script

**Start Point:** Start a fresh visit via the UI to show the flow, then use the pre-seeded sessions for the master dashboard.

## Phase 1: The Patient Intake Flow (Live)
1. **Consent Gateway:** Navigate to `http://localhost:3000/`. Explain that this is a simulated ABHA verification. The system generates a unified UUID tied to this patient's visit.
2. **Chief Complaint:** Select a complaint to kick off the flow.
3. **AYUSH Module:** Emphasize that the system integrates traditional Prakriti/Agni/Koshtha profiling natively into the digital intake process before clinical questions begin.
4. **SOCRATES Triage:** Answer a few branching questions. Emphasize that *the system never generates a diagnosis*. It only gathers structured data for the physician.
5. **Document OCR:** Show the mock Tesseract engine extracting data. Point out the orange `[⚠️ LOW CONFIDENCE]` badge, showing how the UI explicitly flags OCR ambiguity for physician review.

## Phase 2: The Master Dashboard & FHIR Export (Pre-Seeded Data)

*Navigate directly to these URLs to showcase the aggregator.*

### Case A: Red Flag Trigger + Low Confidence OCR
**URL:** `http://localhost:3000/summary/3f638a69-a890-4b7c-876e-3859ffd47612`
**Talking Points:**
- **Triage:** Point out the red critical priority flag. Note the non-diagnostic phrasing ("Immediate evaluation required for possible cardiac pattern"). The rule engine successfully evaluated crushing chest pain radiating to the arm/jaw with palpitations.
- **Documents:** Note the OCR fields present in the dashboard.
- **Export:** Click `Confirm & Lock`. Then click `Export FHIR Bundle`. Explain that this natively converts the isolated SQLite data into a globally interoperable HL7 FHIR R4 Bundle (using proper Base64 document attachments), ready to push to an HMIS.

### Case B: Benign Presentation
**URL:** `http://localhost:3000/summary/bceec48d-9f4d-4f64-b602-f6bd74265bde`
**Talking Points:**
- **Triage:** Note the absence of red flags. The abdominal pain resolved to a low-risk pattern.
- No documents uploaded, showing the layout elegantly collapses empty sections without breaking the FHIR export logic.

### Case C: AYUSH Heavy 
**URL:** `http://localhost:3000/summary/e262199f-9c1d-4bfb-ad7c-866d01f61dac`
**Talking Points:**
- **AYUSH Profile:** Highlight the generated profile (Prakriti=Vata, Koshtha=Krura). This demonstrates how alternative medicine profiles travel fully alongside the allopathic triage data inside the FHIR payload.
