# Architecture Notes

## Stack Summary
- **Backend:** FastAPI (Python), SQLAlchemy, SQLite, `fhir.resources` (Pydantic-based FHIR validation)
- **Frontend:** React, Tailwind CSS, Lucide React (Icons), `react-router-dom`
- **Data Persistence:** SQLite (relational storage for session tracking, consent, and modular intake records).
- **Session Management:** Client-side `sessionStorage` driving a backend unified `session_id`.

## Design Decisions (Hackathon Context)

**1. SQLite over PostgreSQL:**
Given the rapid iteration requirements of a hackathon, SQLite was chosen for zero-dependency local setup. The schema is entirely relational and maps cleanly to a future Postgres migration.

**2. SessionStorage over JWT / Auth:**
Tab-isolation was a key requirement (e.g., a receptionist handling two walk-ins on one device). We utilized HTML5 `sessionStorage` instead of `localStorage` or cookies to guarantee that session IDs are strictly isolated per-tab and wiped instantly upon closing the tab or abandoning the visit.

**3. Simulated ABHA & HIS Push:**
We implemented a strict API gateway (`ensure_consent_granted`) to simulate the ABHA consent flow. Real ABDM Sandbox integration requires complex cryptographic keys and webhook endpoints. Similarly, the FHIR bundle is fully generated, validated against standard HL7 schemas, and printed to stdout, simulating a HIS push without requiring a live Epic/Cerner sandbox.

## Path to Production

To take this from MVP to a production-grade healthcare application:

1. **True ABDM Integration:** Replace the simulated ABHA consent screen with the actual M1/M2 ABDM gateway flows (OTP verification and consent artifact generation).
2. **Real-time HIS API:** Replace the stdout "Push to HIS" log with an actual authenticated HTTP POST to the hospital's EMR FHIR endpoint.
3. **Audit Logging:** Implement a rigorous, tamper-evident audit trail for every read/write action, crucial for HIPAA/HIPAA-equivalent compliance.
4. **Physician Review RBAC:** Implement Role-Based Access Control so physicians can actually receive and sign-off on the generated summaries on a separate dashboard.
5. **Real OCR Engine:** Replace the `mock_tesseract` fallback with a cloud-managed service like AWS Textract or GCP DocumentAI for production reliability.
