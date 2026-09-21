# Architecture Notes

## Stack Summary
- **Backend:** FastAPI (Python), SQLAlchemy, PostgreSQL (Production) / SQLite (Local Dev), `fhir.resources` (Pydantic-based FHIR validation)
- **Frontend:** React, Tailwind CSS, Lucide React (Icons), `react-router-dom`
- **Data Persistence:** Dual Database Modes:
  - **Production Mode (`ENV_MODE=production`):** Strict PostgreSQL connection (Supabase / AWS RDS / Neon). If the connection fails or `DATABASE_URL` is absent, the server fails fast on startup to prevent silent data bifurcation.
  - **Development Mode (`ENV_MODE=development`):** Local SQLite (`data/ayush.db`) fallback for rapid zero-dependency offline development.
- **Session & Auth Management:** Client-side `sessionStorage` driving a unified encounter `session_id`, combined with role-based JWT authentication (`HTTPBearer`) with 2FA OTP verification for attending physicians.

## Design Decisions

**1. Dual Database Strategy (PostgreSQL in Production vs. SQLite in Local Development):**
The platform supports two explicit database operational modes:
- **Production Mode:** Requires a live PostgreSQL database via `DATABASE_URL`. Startup checks verify the connection with `SELECT 1`. Connection failures immediately halt server startup, ensuring clinical records are never written to an unintended local database.
- **Development Mode:** Provides automatic fallback to SQLite (`data/ayush.db`) when a remote PostgreSQL instance is not configured, enabling complete offline development and hackathon demonstration.

**2. Physician Role-Based Authentication & Session Lock Gating:**
Physician actions (encounter locking, section approvals, clinical notes, criticality, and summary amendments) enforce JWT authentication with the `physician` role. The `physician_id` identity is derived strictly from the verified JWT `sub` claim and never trusted from client-supplied request bodies. Draft sessions cannot be exported as ABDM FHIR bundles until explicitly locked by an authenticated physician.

**3. Simulated ABHA & HIS Push:**
We implemented a strict API gateway (`ensure_consent_granted`) to simulate the ABHA consent flow. Real ABDM Sandbox integration requires complex cryptographic keys and webhook endpoints. Similarly, the FHIR bundle is fully generated, validated against standard HL7 schemas, and printed to stdout, simulating a HIS push without requiring a live Epic/Cerner sandbox.

## Path to Production

To take this from MVP to a production-grade healthcare application:

1. **True ABDM Integration:** Replace the simulated ABHA consent screen with the actual M1/M2 ABDM gateway flows (OTP verification and consent artifact generation).
2. **Real-time HIS API:** Replace the stdout "Push to HIS" log with an actual authenticated HTTP POST to the hospital's EMR FHIR endpoint.
3. **Audit Logging:** Implement a rigorous, tamper-evident audit trail for every read/write action, crucial for HIPAA/HIPAA-equivalent compliance.
4. **Physician Review RBAC:** Implement Role-Based Access Control so physicians can actually receive and sign-off on the generated summaries on a separate dashboard.
5. **Real OCR Engine:** Replace the `mock_tesseract` fallback with a cloud-managed service like AWS Textract or GCP DocumentAI for production reliability.
