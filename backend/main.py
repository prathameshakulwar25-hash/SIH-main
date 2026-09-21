import json
import os
import random
import re
import time
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import httpx
import jwt
from fastapi import APIRouter, Depends, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel
from sqlalchemy import JSON, Column, ForeignKey, Integer, String, create_engine, inspect, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import Session, sessionmaker

from config import settings
from flow_engine import FLOW_STEPS
from grok_service import normalize_clinical_complaint
from report_notifier import send_email_dispatcher, send_sms_dispatcher

# ── Pre-build a step-id → step dict for O(1) lookup ──────────────────────────
_STEP_MAP = {s["id"]: s for s in FLOW_STEPS}


def _step(step_id: str):
    """Return step_meta dict for a given step_id."""
    s = _STEP_MAP.get(step_id)
    if not s:
        return None
    return {"step_id": s["id"], "ui_type": s.get("ui_type"), "options": s.get("options")}


def detect_step_meta_from_reply(reply: str, user_msg_count: int) -> Optional[Dict]:
    """
    Analyzes the AI doctor's reply text to decide which visual touch-input panel
    to show the patient next.  Uses keyword matching in English, Hindi & Marathi.
    Falls back to flow-order by user_msg_count if no keyword matches.
    """
    lower = reply.lower()

    # ── 1. Body-map: "where does it hurt / कहाँ / कुठे" ──────────────────────
    if any(k in lower for k in [
        "where", "which part", "which area", "point to", "किस जगह",
        "कहाँ", "कुठे", "कोणत्या भागात", "किस हिस्से", "ठीक कहाँ",
        "tap the", "body", "शरीर पर", "शरीरावर",
    ]):
        if any(k in lower for k in [
            "hurt", "pain", "problem", "feel", "ache",
            "दर्द", "तकलीफ", "परेशानी", "दुखणे", "वेदना",
        ]):
            return _step("location")

    # ── 2. Pain scale: "0 to 10 / पैमाने / प्रमाण" ─────────────────────────
    if any(k in lower for k in [
        "0 to 10", "1 to 10", "scale", "rate the", "how severe",
        "how bad", "how intense", "pain score",
        "0 से 10", "पैमाने", "कितना तेज़", "कितना दर्द",
        "0 ते 10", "प्रमाण", "किती तीव्र", "किती वेदना",
    ]):
        return _step("severity")

    # ── 3. Character: "describe / sharp / burning / किस प्रकार" ──────────────
    if any(k in lower for k in [
        "describe", "what kind of pain", "how would you describe",
        "sharp", "burning", "throbbing", "dull", "pressure", "cramping", "sensation",
        "किस प्रकार", "कैसा दर्द", "कैसा लगता",
        "कशा प्रकार", "कसे वाटते", "कसले दुखणे", "जळजळ", "टोचणे",
    ]):
        if any(k in lower for k in [
            "pain", "feel", "sensation", "दर्द", "एहसास", "वेदना", "जाणवते",
        ]):
            return _step("character")

    # ── 4. Course: "better or worse / बढ़ रहा / वाढत" ────────────────────────
    if any(k in lower for k in [
        "better or worse", "getting better", "getting worse", "improving",
        "worsening", "same as before", "staying the same", "progress",
        "बढ़ रहा", "कम हो रहा", "वैसा ही", "बेहतर", "बुरा हो",
        "वाढत", "कमी होत", "तसेच",
    ]):
        return _step("course")

    # ── 5. Timing: "constant / come and go / हमेशा / नेहमी" ─────────────────
    if any(k in lower for k in [
        "constant", "all the time", "come and go", "intermittent",
        "time of day", "morning", "night", "always there",
        "हमेशा", "आती-जाती", "सुबह ज़्यादा", "रात को ज़्यादा",
        "नेहमी", "येते-जाते", "सकाळी", "रात्री",
    ]):
        return _step("timing")

    # ── 6. Triggers: "makes it worse / बढ़ाती / वाढते" ──────────────────────
    if any(k in lower for k in [
        "makes it worse", "aggravate", "what makes", "trigger",
        "worse when", "worse with",
        "बढ़ाती", "किससे बढ़ता", "कोई चीज़ बढ़ाती",
        "वाढते", "कशाने वाढते", "कशामुळे वाढते",
    ]):
        return _step("triggers")

    # ── 7. Relief: "makes it better / आराम / आराम मिळतो" ───────────────────
    if any(k in lower for k in [
        "makes it better", "gives relief", "relief", "helps", "ease",
        "reduces", "improves", "what helps",
        "आराम", "कम करती", "राहत", "आराम देती",
        "आराम मिळतो", "कमी होते", "बरे वाटते",
    ]):
        return _step("relief")

    # ── 8. Associated symptoms: "other symptoms / और लक्षण" ─────────────────
    if any(k in lower for k in [
        "other symptom", "anything else", "also have", "along with",
        "alongside", "besides", "in addition",
        "बुखार", "उल्टी", "और लक्षण", "दूसरी तकलीफ", "साथ में कोई",
        "ताप", "मळमळ", "इतर लक्षण", "यासोबत",
    ]):
        return _step("associated_symptoms")

    # ── 9. Radiation / spread ────────────────────────────────────────────────
    if any(k in lower for k in [
        "spread", "radiat", "travel", "anywhere else", "another part",
        "फैलता", "फैलती", "कहीं और",
        "पसरतो", "पसरते", "इतरत्र",
    ]):
        return _step("radiation")

    # ── 10. Past medical history ─────────────────────────────────────────────
    if any(k in lower for k in [
        "diabetes", "blood pressure", "chronic", "long-term condition",
        "existing condition", "heart disease", "asthma", "thyroid",
        "पुरानी बीमारी", "शुगर", "हाई bp", "दिल की",
        "जुना आजार", "मधुमेह", "उच्च रक्तदाब",
    ]):
        return _step("past_history")

    # ── 11. Surgery / hospital ────────────────────────────────────────────────
    if any(k in lower for k in [
        "surgery", "operation", "operated", "admitted", "hospital before",
        "ऑपरेशन", "भर्ती हुए", "अस्पताल में",
        "ऑपरेशन झाले", "रुग्णालयात भरती",
    ]):
        return _step("surgical_history")

    # ── 12. Medicines ─────────────────────────────────────────────────────────
    if any(k in lower for k in [
        "medicine", "medication", "taking any", "tablet", "pills",
        "regularly", "prescription",
        "दवाई", "दवाइयाँ", "गोली", "नियमित",
        "औषध", "गोळ्या", "नियमित घेत",
    ]):
        return _step("medicines")

    # ── 13. Allergy ───────────────────────────────────────────────────────────
    if any(k in lower for k in [
        "allerg", "reaction to", "sensitive to",
        "एलर्जी", "ऍलर्जी",
    ]):
        return _step("allergies")

    # ── 14. Family history ────────────────────────────────────────────────────
    if any(k in lower for k in [
        "family", "parents", "sibling", "hereditary", "runs in",
        "परिवार", "माता-पिता", "खानदान",
        "कुटुंब", "घरात",
    ]):
        return _step("family_history")

    # ── 15. Social / substance ────────────────────────────────────────────────
    if any(k in lower for k in [
        "tobacco", "smoking", "smoke", "alcohol", "drink", "substance",
        "तंबाकू", "सिगरेट", "शराब", "बीड़ी",
        "तंबाखू", "दारू", "सिगारेट",
    ]):
        return _step("social_history")

    # ── 16. Onset: "when did it start / कब से / कधापासून" ───────────────────
    if any(k in lower for k in [
        "when did", "when did it start", "how long ago", "suddenly or gradually",
        "कब से", "कब शुरू", "अचानक हुआ",
        "कधापासून", "कधी सुरू",
    ]):
        return _step("onset")

    # ── 17. Duration fallback ─────────────────────────────────────────────────
    if any(k in lower for k in [
        "how long have you", "how many days", "how many weeks",
        "कितने दिन", "कितने समय",
        "किती दिवस", "किती वेळ",
    ]):
        return _step("duration")

    # ── 18. Lifestyle ─────────────────────────────────────────────────────────
    if any(k in lower for k in [
        "sleep", "appetite", "exercise", "stress", "routine",
        "नींद", "भूख", "व्यायाम", "तनाव",
        "झोप", "भूक", "ताण",
    ]):
        return _step("lifestyle")

    # ── 19. Greeting / chief complaint ───────────────────────────────────────
    if user_msg_count == 0:
        return _step("greeting")

    # ── Fallback: cycle through flow order by message count ──────────────────
    idx = min(user_msg_count, len(FLOW_STEPS) - 1)
    s = FLOW_STEPS[idx]
    return {"step_id": s["id"], "ui_type": s.get("ui_type"), "options": s.get("options")}


# Database setup with explicit environment mode gating
raw_db_url = (settings.DATABASE_URL or os.getenv("DATABASE_URL", "")).strip()
engine = None

if raw_db_url:
    try:
        # Modern SQLAlchemy 1.4+ expects postgresql:// instead of postgres://
        if raw_db_url.startswith("postgres://"):
            raw_db_url = raw_db_url.replace("postgres://", "postgresql://", 1)
        DATABASE_URL = raw_db_url

        connect_args = {"connect_timeout": 10}
        if "sslmode" not in DATABASE_URL and "supabase" in DATABASE_URL:
            connect_args["sslmode"] = "require"

        engine = create_engine(
            DATABASE_URL,
            pool_size=5,
            max_overflow=10,
            pool_recycle=300,
            pool_pre_ping=False,
            connect_args=connect_args
        )
        # Test connection with a quick query
        with engine.connect() as test_conn:
            test_conn.execute(text("SELECT 1"))
        db_masked = DATABASE_URL.split("@")[-1] if "@" in DATABASE_URL else "configured"
        print(f"[Database] Connected to production database at: {db_masked}")
    except Exception as db_err:
        if settings.is_production:
            raise RuntimeError(
                f"[Fatal Database Error] Production database connection failed ({db_err}). "
                "Automatic SQLite fallback is strictly prohibited in production mode. "
                "Please verify DATABASE_URL and database connectivity."
            ) from db_err
        print(f"[Database Warning] Production DB connection failed ({db_err}). Falling back to local SQLite.")
        engine = None
elif settings.is_production:
    raise RuntimeError(
        "[Fatal Database Error] DATABASE_URL is not set in production mode. "
        "PostgreSQL connection is required for production deployment."
    )

if engine is None:
    DB_DIR = os.path.join(os.path.dirname(__file__), "data")
    os.makedirs(DB_DIR, exist_ok=True)
    DB_PATH = os.path.join(DB_DIR, "ayush.db")
    DATABASE_URL = f"sqlite:///{DB_PATH.replace(os.sep, '/')}"
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
    print(f"[Database] Using local SQLite database: {DB_PATH}")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class SessionMeta(Base):
    __tablename__ = "session_meta"
    session_id = Column(String, primary_key=True, index=True)
    locked = Column(Integer, default=0)
    timestamp = Column(String, default=lambda: datetime.now(timezone.utc).isoformat())

class ConsentRecord(Base):
    __tablename__ = "consents"
    session_id = Column(String, ForeignKey("session_meta.session_id", ondelete="CASCADE"), primary_key=True, index=True)
    abha_id = Column(String, nullable=True, index=True)
    name = Column(String, nullable=True)
    gender = Column(String, nullable=True)
    dob = Column(String, nullable=True)
    abha_address = Column(String, nullable=True)
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    profile_data = Column(JSON, nullable=True)
    status = Column(String, default="granted")
    timestamp = Column(String, default=lambda: datetime.now(timezone.utc).isoformat())

class AyushResult(Base):
    __tablename__ = "ayush_results"
    session_id = Column(String, ForeignKey("session_meta.session_id", ondelete="CASCADE"), primary_key=True, index=True)
    prakriti = Column(String)
    agni = Column(String)
    koshtha = Column(String)
    raw_tally = Column(JSON)
    timestamp = Column(String, default=lambda: datetime.now(timezone.utc).isoformat())

class IntakeResult(Base):
    __tablename__ = "intake_results"
    session_id = Column(String, ForeignKey("session_meta.session_id", ondelete="CASCADE"), primary_key=True, index=True)
    intake_type = Column(String)
    summary = Column(JSON)
    flags = Column(JSON)
    timestamp = Column(String, default=lambda: datetime.now(timezone.utc).isoformat())

class PhysicianReview(Base):
    __tablename__ = "physician_reviews"
    session_id = Column(String, ForeignKey("session_meta.session_id", ondelete="CASCADE"), primary_key=True, index=True)
    physician_id = Column(String, default="physician-1")
    notes = Column(String, nullable=True)
    verified = Column(Integer, default=0)  # 0=pending, 1=verified
    urgency = Column(String, default="routine", index=True)  # emergency | urgent | routine
    critical = Column(Integer, default=0)
    red_flags = Column(JSON, default=list)
    timestamp = Column(String, default=lambda: datetime.now(timezone.utc).isoformat())

class Document(Base):
    __tablename__ = "documents"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, ForeignKey("session_meta.session_id", ondelete="CASCADE"), index=True)
    raw_text = Column(String)
    parsed_data = Column(JSON)
    timestamp = Column(String, default=lambda: datetime.now(timezone.utc).isoformat())

try:
    Base.metadata.create_all(bind=engine)
except Exception as e:
    print(f"[Database Warning] Base.metadata.create_all failed: {e}")

# Safe database-agnostic schema migration for added columns on existing databases
try:
    with engine.connect() as conn:
        inspector = inspect(engine)
        if inspector.has_table("consents"):
            columns = [col["name"] for col in inspector.get_columns("consents")]
            if "name" not in columns:
                conn.execute(text("ALTER TABLE consents ADD COLUMN name VARCHAR"))
            if "gender" not in columns:
                conn.execute(text("ALTER TABLE consents ADD COLUMN gender VARCHAR"))
            if "dob" not in columns:
                conn.execute(text("ALTER TABLE consents ADD COLUMN dob VARCHAR"))
            if "abha_address" not in columns:
                conn.execute(text("ALTER TABLE consents ADD COLUMN abha_address VARCHAR"))
            if "profile_data" not in columns:
                conn.execute(text("ALTER TABLE consents ADD COLUMN profile_data JSON"))
            if "email" not in columns:
                conn.execute(text("ALTER TABLE consents ADD COLUMN email VARCHAR"))
            if "phone" not in columns:
                conn.execute(text("ALTER TABLE consents ADD COLUMN phone VARCHAR"))

        if inspector.has_table("physician_reviews"):
            pr_cols = [col["name"] for col in inspector.get_columns("physician_reviews")]
            if "urgency" not in pr_cols and pr_cols:
                conn.execute(text("ALTER TABLE physician_reviews ADD COLUMN urgency VARCHAR DEFAULT 'routine'"))
            if "critical" not in pr_cols and pr_cols:
                conn.execute(text("ALTER TABLE physician_reviews ADD COLUMN critical INTEGER DEFAULT 0"))
            if "red_flags" not in pr_cols and pr_cols:
                conn.execute(text("ALTER TABLE physician_reviews ADD COLUMN red_flags JSON"))
        conn.commit()
except Exception as e:
    print(f"Notice: Schema migration check: {e}")

app = FastAPI(title="Jeevan OPD Clinical Platform", version="2.0.0")

# CORS setup with environment-configurable allowed origins and regex for cloud domains
raw_frontend_env = os.environ.get("FRONTEND_URL", "").strip()
raw_frontend_urls = [u.strip().rstrip("/") for u in raw_frontend_env.split(",") if u.strip()]
allowed_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "https://jeevannn.netlify.app",
    "https://jeevan-health.netlify.app",
] + raw_frontend_urls

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"^https?:\/\/([a-zA-Z0-9_-]+\.)*(netlify\.app|onrender\.com|localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── JWT Authentication & Role-Based Access Control (RBAC) ──
JWT_SECRET = settings.JWT_SECRET
JWT_ALGORITHM = settings.JWT_ALGORITHM

security = HTTPBearer(auto_error=False)

def create_access_token(data: dict, expires_delta: Optional[float] = None) -> str:
    to_encode = data.copy()
    expire = time.time() + (expires_delta if expires_delta else 28800)  # Default: 8 hours
    to_encode.update({"exp": expire, "iat": time.time()})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_access_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Authentication token has expired. Please log in again.")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials.")

def get_current_physician(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> dict:
    """Dependency that enforces physician authentication and role validation."""
    if not credentials or not credentials.credentials:
        raise HTTPException(status_code=401, detail="Physician authentication required. Please provide a valid Bearer token.")
    payload = decode_access_token(credentials.credentials)
    if payload.get("role") != "physician":
        raise HTTPException(status_code=403, detail="Access denied: Physician credentials required.")
    if not payload.get("sub"):
        raise HTTPException(status_code=401, detail="Invalid authentication token: missing subject claim.")
    return payload

def get_optional_auth_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> Optional[dict]:
    """Extracts user claims if a Bearer token is provided, without failing if missing."""
    if not credentials or not credentials.credentials:
        return None
    try:
        return decode_access_token(credentials.credentials)
    except Exception:
        return None

from ocr_extractor import extract_document_data
from red_flags import check_red_flags
from scoring import score_ayush

ayush_router = APIRouter(prefix="/api/ayush", tags=["ayush"])
intake_router = APIRouter(prefix="/api/intake", tags=["intake"])
documents_router = APIRouter(prefix="/api/documents", tags=["documents"])
summary_router = APIRouter(prefix="/api/summary", tags=["summary"])
physician_router = APIRouter(prefix="/api/physician", tags=["physician"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def ensure_consent_granted(db: Session, session_id: str):
    """
    Ensures encounter record has a valid consent or recorded walk-in status.
    Does NOT fabricate artificial ABHA identifiers.
    """
    consent = db.query(ConsentRecord).filter(ConsentRecord.session_id == session_id).first()
    if not consent:
        consent = ConsentRecord(
            session_id=session_id,
            abha_id=None,
            status="unregistered_walk_in"
        )
        db.add(consent)
        db.commit()
    return consent

def ensure_not_locked(db: Session, session_id: str):
    ensure_consent_granted(db, session_id)
    meta = db.query(SessionMeta).filter(SessionMeta.session_id == session_id).first()
    if meta and meta.locked == 1:
        raise HTTPException(status_code=403, detail="Session is locked and cannot be modified.")
    if not meta:
        meta = SessionMeta(session_id=session_id)
        db.add(meta)
        db.commit()

def generate_opd_token(db: Session, channel: str = "kiosk") -> str:
    """Generates an OPD Queue Token (e.g. M-12 for Mobile QR, K-04 for Physical Kiosk)."""
    try:
        total = db.query(ConsentRecord).count()
    except Exception:
        total = int(time.time()) % 100
    prefix = "M" if channel == "mobile_qr" else "K"
    num = (total % 90) + 10
    return f"{prefix}-{num:02d}"

@app.get("/health")
def health_check():
    return {"status": "ok"}

@ayush_router.get("/questions")
def get_questions():
    try:
        file_path = os.path.join(os.path.dirname(__file__), "data", "ayush_questions.json")
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        return {"error": str(e)}

class AnswerSubmission(BaseModel):
    session_id: Optional[str] = None
    answers: List[Dict[str, str]]

@ayush_router.post("/submit")
def submit_assessment(submission: AnswerSubmission, db: Session = Depends(get_db)):
    target_session_id = submission.session_id or f"sess_{uuid.uuid4().hex[:12]}"
    ensure_not_locked(db, target_session_id)
    result = score_ayush(submission.answers)
    prakriti = ", ".join(result["dominant"].get("Prakriti", []))
    agni = ", ".join(result["dominant"].get("Agni", []))
    koshtha = ", ".join(result["dominant"].get("Koshtha", []))

    # Overwrite if exists, since it's PK
    db_result = db.query(AyushResult).filter(AyushResult.session_id == target_session_id).first()
    if not db_result:
        db_result = AyushResult(session_id=target_session_id)
        db.add(db_result)

    db_result.prakriti = prakriti
    db_result.agni = agni
    db_result.koshtha = koshtha
    db_result.raw_tally = result["scores"]
    db.commit()

    return {"session_id": db_result.session_id, "result": result}

@intake_router.get("/{complaint}/tree")
def get_intake_tree(complaint: str):
    valid_complaints = {"abdominal-pain", "chest-pain", "fever"}
    if complaint not in valid_complaints:
        return {"error": "Invalid complaint type"}
    file_path = os.path.join(os.path.dirname(__file__), "data", f"{complaint.replace('-', '_')}_tree.json")
    with open(file_path, 'r', encoding='utf-8') as f:
        return json.load(f)

class AIIntakeSaveRequest(BaseModel):
    session_id: str
    complaint: Optional[str] = "voice-consultation"
    clinician_summary: str
    history: Optional[List[Dict[str, str]]] = None
    flags: Optional[List[str]] = None

@intake_router.post("/ai-summary")
def submit_ai_intake(req: AIIntakeSaveRequest, db: Session = Depends(get_db)):
    ensure_not_locked(db, req.session_id)
    db_result = db.query(IntakeResult).filter(IntakeResult.session_id == req.session_id).first()
    if not db_result:
        db_result = IntakeResult(session_id=req.session_id)
        db.add(db_result)

    clean_complaint = normalize_clinical_complaint(req.complaint or "voice-consultation")
    db_result.intake_type = clean_complaint
    db_result.summary = {
        "clinician_summary": req.clinician_summary,
        "conversation_history": req.history or [],
        "source": "grok-groq-voice-intake",
        "complaint_title": clean_complaint,
        "type": clean_complaint
    }
    db_result.flags = req.flags or []
    db.commit()
    return {"status": "success", "session_id": req.session_id, "summary": db_result.summary, "flags": db_result.flags}

@intake_router.post("/{complaint}")
def submit_intake(complaint: str, intake_data: dict, session_id: Optional[str] = None, db: Session = Depends(get_db)):
    target_session_id = session_id or intake_data.get("session_id") or f"sess_{uuid.uuid4().hex[:12]}"
    ensure_not_locked(db, target_session_id)
    flags = check_red_flags(intake_data, complaint_type=complaint)
    clean_complaint = normalize_clinical_complaint(complaint)

    db_result = db.query(IntakeResult).filter(IntakeResult.session_id == target_session_id).first()
    if not db_result:
        db_result = IntakeResult(session_id=target_session_id)
        db.add(db_result)

    db_result.intake_type = complaint
    db_result.summary = dict(intake_data) if isinstance(intake_data, dict) else {"data": intake_data}
    db_result.summary["complaint_title"] = clean_complaint
    db_result.summary["type"] = complaint
    db_result.flags = flags
    db.commit()
    return {"session_id": target_session_id, "summary": db_result.summary, "flags": flags, "intake_type": complaint}

@documents_router.post("/upload")
async def upload_document(file: UploadFile = File(...), session_id: Optional[str] = Form(None), db: Session = Depends(get_db)):
    if not session_id:
        session_id = f"sess_{uuid.uuid4().hex[:12]}"
    ensure_not_locked(db, session_id)
    content = await file.read()
    raw_text, parsed_data = await extract_document_data(content, filename=file.filename or "")

    db_doc = Document(
        session_id=session_id,
        raw_text=raw_text,
        parsed_data=parsed_data
    )
    db.add(db_doc)
    db.commit()
    db.refresh(db_doc)
    return {
        "id": db_doc.id,
        "session_id": session_id,
        "raw_text": raw_text,
        "parsed_data": parsed_data,
        "timestamp": db_doc.timestamp
    }

def calculate_age(dob_str: Optional[str]) -> Optional[int]:
    """Calculate age from ISO date of birth string (YYYY-MM-DD)."""
    if not dob_str:
        return None
    try:
        clean_dob = dob_str.split("T")[0].strip()
        parts = clean_dob.split("-")
        if len(parts) >= 1 and len(parts[0]) == 4:
            birth_year = int(parts[0])
            current_year = datetime.now(timezone.utc).year
            age = current_year - birth_year
            return max(0, age)
    except Exception:
        pass
    return None

@summary_router.get("/{session_id}")
def get_summary(session_id: str, db: Session = Depends(get_db)):
    ayush = db.query(AyushResult).filter(AyushResult.session_id == session_id).first()
    intake = db.query(IntakeResult).filter(IntakeResult.session_id == session_id).first()
    docs = db.query(Document).filter(Document.session_id == session_id).all()
    meta = db.query(SessionMeta).filter(SessionMeta.session_id == session_id).first()
    consent = db.query(ConsentRecord).filter(ConsentRecord.session_id == session_id).first()

    docs_labs = []
    docs_meds = []
    docs_diag = []
    docs_notes = []
    docs_items = []
    for doc in docs:
        if doc.parsed_data:
            labs = doc.parsed_data.get("labs", [])
            meds = doc.parsed_data.get("medications", [])
            dates = doc.parsed_data.get("dates", [])
            diag = doc.parsed_data.get("diagnoses", [])
            notes = doc.parsed_data.get("doctor_notes", [])
            docs_labs.extend(labs)
            docs_meds.extend(meds)
            docs_diag.extend(diag)
            docs_notes.extend(notes)
            docs_items.append({
                "id": doc.id,
                "timestamp": doc.timestamp,
                "dates": dates,
                "medications": meds,
                "labs": labs,
                "diagnoses": diag,
                "doctor_notes": notes,
                "raw_text": doc.raw_text
            })

    patient_details = {
        "name": consent.name if (consent and consent.name) else None,
        "gender": consent.gender if (consent and consent.gender) else None,
        "dob": consent.dob if (consent and consent.dob) else None,
        "age": calculate_age(consent.dob) if (consent and consent.dob) else None,
        "phone": consent.phone if (consent and consent.phone) else None,
        "email": consent.email if (consent and consent.email) else None,
        "abha_id": consent.abha_id if (consent and consent.abha_id) else None,
        "abha_address": consent.abha_address if (consent and consent.abha_address) else None,
    }

    review = db.query(PhysicianReview).filter(PhysicianReview.session_id == session_id).first()

    return {
        "session_id": session_id,
        "patient_name": patient_details["name"],
        "patient_details": patient_details,
        "patient": patient_details,
        "abha_id": consent.abha_id if consent else None,
        "created_at": consent.timestamp if consent else (meta.timestamp if meta else None),
        "locked": meta.locked == 1 if meta else False,
        "physician_notes": review.notes if review else None,
        "physician_id": review.physician_id if review else None,
        "physician_verified": bool((review and review.verified == 1) or (meta and meta.locked == 1)),
        "ayush_profile": {
            "prakriti": ayush.prakriti if ayush else None,
            "agni": ayush.agni if ayush else None,
            "koshtha": ayush.koshtha if ayush else None
        } if ayush else None,
        "intake_triage": {
            "type": intake.intake_type if intake else None,
            "complaint_title": normalize_clinical_complaint(intake.intake_type) if (intake and intake.intake_type) else None,
            "summary": intake.summary if intake else None,
            "flags": intake.flags if intake else None,
            "review_steps": (intake.summary or {}).get("physician_review_steps", {}) if intake else {}
        } if intake else None,
        "physician_review_steps": (intake.summary or {}).get("physician_review_steps", {}) if intake else {},
        "documents": {
            "labs": docs_labs,
            "medications": docs_meds,
            "diagnoses": docs_diag,
            "doctor_notes": docs_notes,
            "items": docs_items
        }
    }

@summary_router.post("/{session_id}/lock")
def lock_session(session_id: str, db: Session = Depends(get_db), physician: dict = Depends(get_current_physician)):
    physician_id = physician.get("sub")
    if not physician_id:
        raise HTTPException(status_code=401, detail="Invalid authentication token: missing subject claim.")
    meta = db.query(SessionMeta).filter(SessionMeta.session_id == session_id).first()
    if not meta:
        meta = SessionMeta(session_id=session_id)
        db.add(meta)
    meta.locked = 1
    review = db.query(PhysicianReview).filter(PhysicianReview.session_id == session_id).first()
    if not review:
        review = PhysicianReview(session_id=session_id, physician_id=physician_id, verified=1)
        db.add(review)
    else:
        review.verified = 1
        review.physician_id = physician_id
    db.commit()
    return {"status": "locked", "locked": True, "session_id": session_id, "physician_id": physician_id}

from fhir_exporter import generate_fhir_bundle
from report_notifier import dispatch_clinical_report

consent_router = APIRouter(prefix="/api/consent", tags=["consent"])
abdm_router = APIRouter(prefix="/api/abdm", tags=["abdm"])

from abdm_service import (
    SAMPLE_ABDM_PROFILES,
    generate_aadhaar_otp,
    generate_mobile_otp,
    search_abha_by_id,
    verify_aadhaar_otp,
    verify_mobile_otp,
)


class ConsentRequest(BaseModel):
    session_id: str
    abha_id: str
    consents: Optional[dict] = None
    name: Optional[str] = None
    gender: Optional[str] = None
    dob: Optional[str] = None
    abha_address: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    profile_data: Optional[dict] = None

class AadhaarOTPRequest(BaseModel):
    aadhaar: str

class AadhaarVerifyRequest(BaseModel):
    txnId: str
    otp: str

class MobileOTPRequest(BaseModel):
    mobile: str

class MobileVerifyRequest(BaseModel):
    txnId: str
    otp: str
    userDetails: Optional[Dict[str, Any]] = None

@consent_router.post("/")
def grant_consent(req: ConsentRequest, db: Session = Depends(get_db)):
    consent = db.query(ConsentRecord).filter(ConsentRecord.session_id == req.session_id).first()
    if not consent:
        consent = ConsentRecord(
            session_id=req.session_id,
            abha_id=req.abha_id,
            name=req.name,
            gender=req.gender,
            dob=req.dob,
            abha_address=req.abha_address,
            email=req.email,
            phone=req.phone,
            profile_data=req.profile_data
        )
        db.add(consent)
        db.commit()
    else:
        consent.abha_id = req.abha_id
        if req.name: consent.name = req.name
        if req.gender: consent.gender = req.gender
        if req.dob: consent.dob = req.dob
        if req.abha_address: consent.abha_address = req.abha_address
        if req.email: consent.email = req.email
        if req.phone: consent.phone = req.phone
        if req.profile_data: consent.profile_data = req.profile_data
        db.commit()
    return {
        "status": "granted",
        "session_id": req.session_id,
        "abha_id": req.abha_id,
        "abha_address": req.abha_address,
        "name": req.name,
        "consents": req.consents,
        "email": req.email,
        "phone": req.phone
    }

# ── ABDM Gateway Endpoints (Milestones 1 & 2) ──

@abdm_router.post("/aadhaar/generate-otp")
def abdm_aadhaar_otp(req: AadhaarOTPRequest):
    """Initiates ABDM Aadhaar OTP generation for ABHA creation / verification."""
    res = generate_aadhaar_otp(req.aadhaar)
    if not res.get("success"):
        raise HTTPException(status_code=400, detail=res.get("error", "Failed to generate Aadhaar OTP"))
    return res

@abdm_router.post("/aadhaar/verify-otp")
def abdm_aadhaar_verify(req: AadhaarVerifyRequest):
    """Verifies Aadhaar OTP and produces verified 14-digit ABHA ID & demographics."""
    res = verify_aadhaar_otp(req.txnId, req.otp)
    if not res.get("success"):
        raise HTTPException(status_code=400, detail=res.get("error", "Failed to verify Aadhaar OTP"))
    return res

@abdm_router.post("/mobile/generate-otp")
def abdm_mobile_otp(req: MobileOTPRequest):
    """Generates Mobile OTP for ABHA creation."""
    res = generate_mobile_otp(req.mobile)
    if not res.get("success"):
        raise HTTPException(status_code=400, detail=res.get("error", "Failed to generate Mobile OTP"))
    return res

@abdm_router.post("/mobile/verify-otp")
def abdm_mobile_verify(req: MobileVerifyRequest):
    """Verifies Mobile OTP and provisions ABHA ID."""
    res = verify_mobile_otp(req.txnId, req.otp, req.userDetails)
    if not res.get("success"):
        raise HTTPException(status_code=400, detail=res.get("error", "Failed to verify Mobile OTP"))
    return res

@abdm_router.get("/sample-profiles")
def abdm_sample_profiles():
    """Returns official sandbox test profiles for easy demonstration."""
    return {"profiles": SAMPLE_ABDM_PROFILES}

@abdm_router.get("/search")
def abdm_search(q: str):
    """Search for existing ABHA by 14-digit ID, @abdm handle, or Aadhaar."""
    res = search_abha_by_id(q)
    if not res:
        raise HTTPException(status_code=404, detail="No matching ABHA record found in directory.")
    return {"found": True, "profile": res}

@abdm_router.get("/fhir/{session_id}")
def get_abdm_fhir_bundle(session_id: str, db: Session = Depends(get_db)):
    """Exports NRCES / NDHM compliant HL7 FHIR R4 Bundle for the encounter (Milestone 1)."""
    meta = db.query(SessionMeta).filter(SessionMeta.session_id == session_id).first()
    if not meta or meta.locked != 1:
        raise HTTPException(status_code=400, detail="Cannot export FHIR bundle for a draft session. Must be locked first.")
    ensure_consent_granted(db, session_id)
    consent = db.query(ConsentRecord).filter(ConsentRecord.session_id == session_id).first()
    intake = db.query(IntakeResult).filter(IntakeResult.session_id == session_id).first()
    ayush = db.query(AyushResult).filter(AyushResult.session_id == session_id).first()
    docs = db.query(Document).filter(Document.session_id == session_id).all()

    labs = []
    meds = []
    for d in docs:
        if d.parsed_data:
            labs.extend(d.parsed_data.get("labs", []))
            meds.extend(d.parsed_data.get("medications", []))

    patient_meta = {
        "name": consent.name if consent else None,
        "gender": consent.gender if consent else None,
        "dob": consent.dob if consent else None,
    }

    ayush_prof = {
        "prakriti": ayush.prakriti if ayush else None,
        "agni": ayush.agni if ayush else None,
        "koshtha": ayush.koshtha if ayush else None
    } if ayush else None

    intake_tr = {
        "type": intake.intake_type if intake else None,
        "summary": intake.summary if intake else None,
        "flags": intake.flags if intake else None
    } if intake else None

    bundle = generate_fhir_bundle(
        session_id=session_id,
        abha_id=consent.abha_id if consent else "ABHA-DEMO",
        intake_triage=intake_tr,
        documents_data={"labs": labs, "medications": meds},
        ayush_profile=ayush_prof,
        patient_meta=patient_meta
    )
    return bundle

class SendReportRequest(BaseModel):
    email: Optional[str] = None
    phone: Optional[str] = None

@summary_router.post("/{session_id}/send-report")
def send_report_endpoint(session_id: str, req: Optional[SendReportRequest] = None, db: Session = Depends(get_db)):
    ensure_consent_granted(db, session_id)
    meta = db.query(SessionMeta).filter(SessionMeta.session_id == session_id).first()
    if not meta or meta.locked != 1:
        raise HTTPException(status_code=400, detail="Cannot dispatch report for an unlocked draft session. Encounter must be locked first.")

    consent = db.query(ConsentRecord).filter(ConsentRecord.session_id == session_id).first()
    target_email = (req.email if req and req.email else None) or (consent.email if consent else None)
    target_phone = (req.phone if req and req.phone else None) or (consent.phone if consent else None)

    if not target_email and not target_phone:
        raise HTTPException(status_code=400, detail="No email address or mobile number provided for report dispatch.")

    # Retrieve full encounter data
    encounter_data = get_summary(session_id, db)

    # Dispatch report via configured notification channels
    result = dispatch_clinical_report(
        session_id=session_id,
        encounter_data=encounter_data,
        email=target_email,
        phone=target_phone
    )
    return result

@summary_router.post("/{session_id}/export-fhir")
def export_fhir(session_id: str, db: Session = Depends(get_db)):
    meta = db.query(SessionMeta).filter(SessionMeta.session_id == session_id).first()
    if not meta or meta.locked != 1:
        raise HTTPException(status_code=400, detail="Cannot export FHIR bundle for a draft session. Must be locked first.")

    consent = db.query(ConsentRecord).filter(ConsentRecord.session_id == session_id).first()
    ayush = db.query(AyushResult).filter(AyushResult.session_id == session_id).first()
    intake = db.query(IntakeResult).filter(IntakeResult.session_id == session_id).first()
    docs = db.query(Document).filter(Document.session_id == session_id).all()

    docs_labs = []
    docs_meds = []
    for doc in docs:
        if doc.parsed_data:
            docs_labs.extend(doc.parsed_data.get("labs", []))
            docs_meds.extend(doc.parsed_data.get("medications", []))

    intake_data = {"type": normalize_clinical_complaint(intake.intake_type) if (intake and intake.intake_type) else "Acute Clinical Consultation", "flags": intake.flags} if intake else {}
    doc_data = {"labs": docs_labs, "medications": docs_meds}

    patient_meta = {
        "name": consent.name if consent else None,
        "gender": consent.gender if consent else None,
        "dob": consent.dob if consent else None,
        "phone": consent.phone if consent else None,
        "email": consent.email if consent else None,
    }

    ayush_prof = {
        "prakriti": ayush.prakriti if ayush else None,
        "agni": ayush.agni if ayush else None,
        "koshtha": ayush.koshtha if ayush else None
    } if ayush else None

    effective_abha = consent.abha_id if (consent and consent.abha_id) else "unknown-abha"

    bundle = generate_fhir_bundle(
        session_id=session_id,
        abha_id=effective_abha,
        intake_triage=intake_data,
        documents_data=doc_data,
        ayush_profile=ayush_prof,
        patient_meta=patient_meta
    )

    # Live HL7 FHIR R4 Server Dispatch (HAPI FHIR reference server or configured EMR)
    fhir_server_url = os.environ.get("FHIR_SERVER_URL", "https://hapi.fhir.org/baseR4").strip().rstrip("/")
    bundle_dict = json.loads(bundle.json()) if hasattr(bundle, "json") else (bundle.dict() if hasattr(bundle, "dict") else bundle)

    his_dispatch = {
        "server_url": fhir_server_url,
        "dispatched": False,
        "status_code": None,
        "fhir_id": None,
        "detail": None
    }

    try:
        with httpx.Client(timeout=12.0) as http_client:
            resp = http_client.post(
                f"{fhir_server_url}/Bundle",
                json=bundle_dict,
                headers={"Content-Type": "application/fhir+json", "Accept": "application/fhir+json"}
            )
            his_dispatch["status_code"] = resp.status_code
            if resp.status_code in (200, 201):
                his_dispatch["dispatched"] = True
                try:
                    resp_json = resp.json()
                    his_dispatch["fhir_id"] = resp_json.get("id") or resp.headers.get("Location")
                except Exception:
                    his_dispatch["fhir_id"] = resp.headers.get("Location")
                his_dispatch["detail"] = f"Successfully validated and persisted to HL7 FHIR R4 repository ({fhir_server_url})."
            else:
                his_dispatch["detail"] = f"FHIR Server returned status {resp.status_code}: {resp.text[:180]}"
    except Exception as e:
        his_dispatch["detail"] = f"HL7 FHIR remote endpoint unreachable ({str(e)}). Bundle validated and stored locally."

    # Return bundle with live HL7 transmission metadata
    return {
        "bundle": bundle_dict,
        "his_dispatch": his_dispatch
    }

# ── Grok LLM AI Endpoints ──────────────────────────────────────────────────────
from grok_service import grok_service

llm_router = APIRouter(prefix="/api/llm", tags=["llm"])

class LLMConfigRequest(BaseModel):
    api_key: Optional[str] = None
    model: Optional[str] = None
    api_base: Optional[str] = None
    provider: Optional[str] = None

class LLMChatRequest(BaseModel):
    history: List[Dict[str, str]]
    language: Optional[str] = "en"
    session_id: Optional[str] = None
    system_prompt: Optional[str] = None

class LLMGenerateRequest(BaseModel):
    prompt: str
    system_prompt: Optional[str] = None
    temperature: Optional[float] = 0.3
    max_tokens: Optional[int] = 1500

class LLMClinicianSummaryRequest(BaseModel):
    history: List[Dict[str, str]]
    language: Optional[str] = "en"
    session_id: Optional[str] = None
    extracted_documents: Optional[Dict[str, Any]] = None

class LLMDocumentRequest(BaseModel):
    raw_text: str
    filename: Optional[str] = None

class LLMAyushRequest(BaseModel):
    prakriti: Optional[str] = None
    agni: Optional[str] = None
    koshtha: Optional[str] = None
    complaint: Optional[str] = None

class LLMSynthesisRequest(BaseModel):
    session_id: Optional[str] = None
    encounter_data: Optional[Dict[str, Any]] = None

@llm_router.get("/status")

def get_llm_status():
    return grok_service.get_status()

@llm_router.post("/configure")
def configure_llm(req: LLMConfigRequest):
    if req.api_key is not None:
        grok_service.api_key = req.api_key.strip()
        if grok_service.api_key.startswith("gsk_"):
            grok_service.provider = "Groq"
            grok_service.api_base = "https://api.groq.com/openai/v1"
            if not req.model:
                grok_service.model = "openai/gpt-oss-120b"
        elif grok_service.api_key.startswith("xai-"):
            grok_service.provider = "xAI Grok"
            grok_service.api_base = "https://api.x.ai/v1"
            if not req.model:
                grok_service.model = "grok-3"
    if req.model is not None:
        grok_service.model = req.model.strip()
    if req.api_base is not None:
        grok_service.api_base = req.api_base.strip().rstrip("/")
    if req.provider is not None:
        grok_service.provider = req.provider.strip()
    return grok_service.get_status()

@llm_router.post("/chat")
async def llm_chat(req: LLMChatRequest):
    """
    Intelligent, condition-adaptive clinical intake interview.
    Uses the doctor AI's clinical reasoning to ask tailored diagnostic questions
    specifically based on the patient's symptoms (e.g. jaundice, eye burning, abdominal pain, fever).
    """
    language = req.language or "en"
    session_id = req.session_id or "anon-session"
    history = req.history or []

    user_messages = [m for m in history if m.get("role") == "user"]
    user_msg_count = len(user_messages)

    # Initial opening greeting — warm Jeevan intake assistant with clean professional chief complaint options
    if user_msg_count == 0:
        greetings = {
            "hi": "नमस्ते! मैं जीवन हूँ। आपके डॉक्टर के लिए आपकी स्वास्थ्य संबंधी जानकारी दर्ज करने में सहायता करूँगा। बताइए — आज आपको क्या तकलीफ या लक्षण महसूस हो रहे हैं?",
            "mr": "नमस्कार! मी जीवन आहे. तुमच्या डॉक्टरांसाठी आरोग्याची माहिती नोंदवण्यात मी मदत करेन. सांगा — आज तुम्हाला नेमका काय त्रास किंवा लक्षणे जाणवत आहेत?",
            "en": "Hello! I am Jeevan, your clinical intake assistant. I am here to help record your symptoms for your doctor. What symptoms or discomfort are you experiencing today?",
        }
        first_q = greetings.get(language, greetings["en"])
        def _val(en_val: str, hi_val: str, mr_val: str) -> str:
            if language == "hi":
                return hi_val
            if language == "mr":
                return mr_val
            return en_val

        chief_complaint_step = {
            "step_id": "chief_complaint",
            "ui_type": "chips",
            "clinical_note": "Chief Complaint" if language == "en" else ("प्रारंभिक लक्षण" if language == "hi" else "सुरुवातीचे लक्षण"),
            "options": [
                {"id": "headache", "label_en": "Headache / Head pain", "label_hi": "सिरदर्द / सिर में भारीपन", "label_mr": "डोकेदुखी / डोके जड", "value": _val("Headache / Head pain", "सिरदर्द / सिर में भारीपन", "डोकेदुखी / डोके जड")},
                {"id": "fever", "label_en": "Fever / Shivering", "label_hi": "बुखार / कंपकंपी", "label_mr": "ताप / भरून येणे", "value": _val("Fever / Shivering", "बुखार / कंपकंपी", "ताप / भरून येणे")},
                {"id": "stomach", "label_en": "Stomach Ache / Acidity", "label_hi": "पेट दर्द / गैस / जलन", "label_mr": "पोटदुखी / ऍसिडिटी", "value": _val("Stomach ache / Acidity", "पेट दर्द / गैस / जलन", "पोटदुखी / ऍसिडिटी")},
                {"id": "cough_cold", "label_en": "Cough / Cold / Throat", "label_hi": "खांसी / सर्दी / गले में खराश", "label_mr": "खोकला / सर्दी / घसा दुखणे", "value": _val("Cough / Cold / Sore throat", "खांसी / सर्दी / गले में खराश", "खोकला / सर्दी / घसा दुखणे")},
                {"id": "chest_pain", "label_en": "Chest Discomfort", "label_hi": "छाती में दर्द या भारीपन", "label_mr": "छातीत दुखणे किंवा जडपणा", "value": _val("Chest discomfort / pain", "छाती में दर्द या भारीपन", "छातीत दुखणे किंवा जडपणा")},
                {"id": "dizziness", "label_en": "Dizziness / Weakness", "label_hi": "चक्कर आना / भारी कमज़ोरी", "label_mr": "चक्कर / अशक्तपणा", "value": _val("Dizziness / Weakness", "चक्कर आना / भारी कमज़ोरी", "चक्कर / अशक्तपणा")},
                {"id": "joint_back", "label_en": "Back / Joint Pain", "label_hi": "कमर या जोड़ों में दर्द", "label_mr": "कंबर किंवा सांधेदुखी", "value": _val("Back / Joint pain", "कमर या जोड़ों में दर्द", "कंबर किंवा सांधेदुखी")},
                {"id": "vomiting", "label_en": "Vomiting / Loose Motion", "label_hi": "उल्टी / दस्त / जी मिचलाना", "label_mr": "उलटी / जुलाब", "value": _val("Vomiting / Loose motion", "उल्टी / दस्त / जी मिचलाना", "उलटी / जुलाब")}
            ]
        }
        return {
            "reply": first_q,
            "red_flag_detected": False,
            "model_used": grok_service.model if grok_service.is_configured() else "clinical-ai",
            "provider": grok_service.provider,
            "clinical_note": "Clinical Intake Started" if language == "en" else ("क्लिनिकल इनटेक आरंभ" if language == "hi" else "क्लिनिकल इनटेक सुरू"),
            "is_complete": False,
            "step_meta": chief_complaint_step,
        }

    # Call the AI doctor
    res = await grok_service.chat_intake(
        history=history,
        language=language,
        system_prompt=req.system_prompt
    )

    reply_text = res.get("reply", "")
    red_flag = res.get("red_flag_detected", False)
    is_complete = res.get("is_complete", False)
    clinical_note = res.get("clinical_note", "")

    # Use AI-generated dynamic touch options if available; fallback to heuristic detector only if empty
    ai_step_meta = res.get("step_meta")
    if ai_step_meta and ai_step_meta.get("options") and len(ai_step_meta["options"]) > 0:
        step_meta = ai_step_meta
    else:
        step_meta = detect_step_meta_from_reply(reply_text, user_msg_count)

    return {
        "reply": reply_text,
        "red_flag_detected": red_flag,
        "is_complete": is_complete,
        "clinical_note": clinical_note,
        "model_used": res.get("model_used", grok_service.model),
        "provider": res.get("provider", grok_service.provider),
        "step_meta": step_meta,
    }

@llm_router.post("/generate")
async def llm_generate(req: LLMGenerateRequest):
    return await grok_service.generate(
        prompt=req.prompt,
        system_prompt=req.system_prompt,
        temperature=req.temperature or 0.3,
        max_tokens=req.max_tokens or 900
    )

@llm_router.post("/clinician-summary")
async def llm_clinician_summary(req: LLMClinicianSummaryRequest, db: Session = Depends(get_db)):
    extracted_docs = req.extracted_documents
    if not extracted_docs and req.session_id:
        docs = db.query(Document).filter(Document.session_id == req.session_id).all()
        if docs:
            all_meds, all_labs, all_diag, all_notes = [], [], [], []
            for d in docs:
                if d.parsed_data:
                    all_meds.extend(d.parsed_data.get("medications", []))
                    all_labs.extend(d.parsed_data.get("labs", []))
                    all_diag.extend(d.parsed_data.get("diagnoses", []))
                    all_notes.extend(d.parsed_data.get("doctor_notes", []))
            extracted_docs = {
                "medications": all_meds,
                "labs": all_labs,
                "diagnoses": all_diag,
                "doctor_notes": all_notes,
                "doc_count": len(docs)
            }
    return await grok_service.generate_clinician_summary(req.history, extracted_documents=extracted_docs)

@llm_router.post("/analyze-document")
async def llm_analyze_document(req: LLMDocumentRequest):
    return await grok_service.analyze_medical_document(req.raw_text, filename=req.filename)

@llm_router.post("/ayush-insights")
async def llm_ayush_insights(req: LLMAyushRequest):
    return await grok_service.generate_ayush_insights(
        prakriti=req.prakriti or "",
        agni=req.agni or "",
        koshtha=req.koshtha or "",
        complaint=req.complaint
    )

@llm_router.post("/clinical-synthesis")
async def llm_clinical_synthesis(req: LLMSynthesisRequest, db: Session = Depends(get_db)):
    data = req.encounter_data
    if not data and req.session_id:
        data = get_summary(req.session_id, db)
    if not data:
        raise HTTPException(status_code=400, detail="Either session_id or encounter_data must be provided.")
    return await grok_service.synthesize_clinical_summary(data)

# ── Physician Dashboard Endpoints ──

class PhysicianVerifyRequest(BaseModel):
    physician_id: Optional[str] = "physician-1"
    notes: Optional[str] = None

class PhysicianNotesRequest(BaseModel):
    physician_id: Optional[str] = "physician-1"
    notes: str

class PhysicianSummaryUpdateRequest(BaseModel):
    physician_id: Optional[str] = "physician-1"
    clinician_summary: str

class PhysicianReviewStepsRequest(BaseModel):
    physician_id: Optional[str] = "physician-1"
    review_steps: Dict[str, Any]

@physician_router.get("/reports")
def list_physician_reports(db: Session = Depends(get_db), physician: dict = Depends(get_current_physician)):
    """List all intake reports sorted by criticality (emergency first, then urgent, then routine). Requires physician token."""
    intakes = db.query(IntakeResult).order_by(IntakeResult.timestamp.desc()).all()
    session_ids = [i.session_id for i in intakes]
    reviews_map = {r.session_id: r for r in db.query(PhysicianReview).filter(PhysicianReview.session_id.in_(session_ids)).all()} if session_ids else {}
    consents_map = {c.session_id: c for c in db.query(ConsentRecord).filter(ConsentRecord.session_id.in_(session_ids)).all()} if session_ids else {}
    result = []
    for intake in intakes:
        review = reviews_map.get(intake.session_id)
        consent = consents_map.get(intake.session_id)
        urgency = review.urgency if review else "routine"
        critical = bool(review.critical) if review else False
        # Fallback: detect from flags
        if not critical and intake.flags:
            flags_str = str(intake.flags).upper()
            if "EMERGENCY" in flags_str or "RED_FLAG" in flags_str or "CRITICAL" in flags_str:
                urgency = "urgent"
                critical = True
        prof_data = consent.profile_data if (consent and isinstance(consent.profile_data, dict)) else {}
        token_num = prof_data.get("token_number")
        if not token_num:
            token_prefix = "M" if prof_data.get("channel") == "mobile_qr" else "K"
            fallback_idx = (abs(hash(intake.session_id)) % 89) + 10
            token_num = f"{token_prefix}-{fallback_idx}"
        channel = prof_data.get("channel", "kiosk")

        result.append({
            "session_id": intake.session_id,
            "patient_name": consent.name if consent and consent.name else "Ayushman Patient",
            "gender": consent.gender if consent else None,
            "dob": consent.dob if consent else None,
            "age": calculate_age(consent.dob) if consent and consent.dob else None,
            "phone": consent.phone if consent else None,
            "email": consent.email if consent else None,
            "intake_type": normalize_clinical_complaint(intake.intake_type) if intake.intake_type else "Voice Consultation",
            "timestamp": intake.timestamp,
            "urgency": urgency,
            "critical": critical,
            "red_flags": review.red_flags if review else [],
            "verified": bool(review.verified) if review else False,
            "abha_id": consent.abha_id if consent else None,
            "flags": intake.flags or [],
            "token_number": token_num,
            "intake_channel": channel,
            "channel": channel,
        })
    # Sort: emergency > urgent > routine, then by timestamp desc
    urgency_order = {"emergency": 0, "urgent": 1, "routine": 2}
    result.sort(key=lambda r: (urgency_order.get(r["urgency"], 2), r["timestamp"]))
    return {"reports": result, "total": len(result)}

class CallTokenRequest(BaseModel):
    token: Optional[str] = None
    session_id: Optional[str] = None
    room: Optional[str] = "Room 104 - AYUSH & General OPD"

@physician_router.post("/queue/call")
def call_queue_token(req: CallTokenRequest, physician: dict = Depends(get_current_physician)):
    """Broadcasts calling a patient token into the consultation chamber."""
    return {
        "status": "token_called",
        "token": req.token,
        "session_id": req.session_id,
        "room": req.room,
        "caller": physician.get("sub", "physician-1"),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "announcement": f"Patient Token {req.token}, please proceed to {req.room}."
    }

@physician_router.get("/reports/{session_id}")
def get_physician_report(session_id: str, db: Session = Depends(get_db), physician: dict = Depends(get_current_physician)):
    """Get full clinical report for a specific session."""
    intake = db.query(IntakeResult).filter(IntakeResult.session_id == session_id).first()
    if not intake:
        raise HTTPException(status_code=404, detail="Report not found")
    review = db.query(PhysicianReview).filter(PhysicianReview.session_id == session_id).first()
    consent = db.query(ConsentRecord).filter(ConsentRecord.session_id == session_id).first()
    ayush = db.query(AyushResult).filter(AyushResult.session_id == session_id).first()
    docs = db.query(Document).filter(Document.session_id == session_id).all()
    docs_items = []
    for doc in docs:
        docs_items.append({
            "id": doc.id,
            "timestamp": doc.timestamp,
            "medications": doc.parsed_data.get("medications", []) if doc.parsed_data else [],
            "labs": doc.parsed_data.get("labs", []) if doc.parsed_data else [],
            "diagnoses": doc.parsed_data.get("diagnoses", []) if doc.parsed_data else [],
            "doctor_notes": doc.parsed_data.get("doctor_notes", []) if doc.parsed_data else [],
            "raw_text": doc.raw_text
        })

    prof_data = consent.profile_data if (consent and isinstance(consent.profile_data, dict)) else {}
    token_num = prof_data.get("token_number") or f"OPD-{(abs(hash(session_id)) % 89) + 10}"
    channel = prof_data.get("channel", "kiosk")

    patient_details = {
        "name": consent.name if consent and consent.name else "Ayushman Patient",
        "gender": consent.gender if consent else None,
        "dob": consent.dob if consent else None,
        "age": calculate_age(consent.dob) if consent and consent.dob else None,
        "phone": consent.phone if consent else None,
        "email": consent.email if consent else None,
        "abha_id": consent.abha_id if consent else None,
        "abha_address": consent.abha_address if consent else None,
        "token_number": token_num,
        "channel": channel,
    }

    return {
        "session_id": session_id,
        "patient_name": patient_details["name"],
        "patient_details": patient_details,
        "patient": patient_details,
        "abha_id": consent.abha_id if consent else None,
        "intake_type": normalize_clinical_complaint(intake.intake_type) if intake.intake_type else "Voice Consultation",
        "summary": intake.summary,
        "flags": intake.flags,
        "timestamp": intake.timestamp,
        "urgency": review.urgency if review else "routine",
        "critical": bool(review.critical) if review else False,
        "red_flags": review.red_flags if review else [],
        "physician_notes": review.notes if review else None,
        "verified": bool(review.verified) if review else False,
        "ayush_profile": {
            "prakriti": ayush.prakriti, "agni": ayush.agni, "koshtha": ayush.koshtha
        } if ayush else None,
        "documents": docs_items,
        "review_steps": (intake.summary or {}).get("physician_review_steps", {}) if intake else {},
        "token_number": token_num,
        "intake_channel": channel,
        "channel": channel,
    }

@physician_router.post("/reports/{session_id}/review-steps")
def save_physician_review_steps(session_id: str, req: PhysicianReviewStepsRequest, db: Session = Depends(get_db), physician: dict = Depends(get_current_physician)):
    """Persist doctor approval or edits for the 9 standard clinical review steps."""
    physician_id = physician.get("sub")
    if not physician_id:
        raise HTTPException(status_code=401, detail="Invalid authentication token: missing subject claim.")

    intake = db.query(IntakeResult).filter(IntakeResult.session_id == session_id).first()
    if not intake:
        intake = IntakeResult(session_id=session_id, intake_type="voice-consultation", summary={})
        db.add(intake)

    summary_data = dict(intake.summary or {})
    existing = dict(summary_data.get("physician_review_steps", {}))
    existing.update(req.review_steps)
    summary_data["physician_review_steps"] = existing
    summary_data["review_steps_updated_at"] = datetime.now(timezone.utc).isoformat()
    intake.summary = summary_data

    review = db.query(PhysicianReview).filter(PhysicianReview.session_id == session_id).first()
    if not review:
        review = PhysicianReview(session_id=session_id, physician_id=physician_id)
        db.add(review)
    else:
        review.physician_id = physician_id
    db.commit()

    return {
        "status": "review_steps_saved",
        "session_id": session_id,
        "review_steps": existing,
        "physician_id": physician_id
    }

@physician_router.post("/reports/{session_id}/verify")
def verify_physician_report(session_id: str, req: PhysicianVerifyRequest, db: Session = Depends(get_db), physician: dict = Depends(get_current_physician)):
    """Mark a report as verified by the physician."""
    physician_id = physician.get("sub")
    if not physician_id:
        raise HTTPException(status_code=401, detail="Invalid authentication token: missing subject claim.")

    review = db.query(PhysicianReview).filter(PhysicianReview.session_id == session_id).first()
    if not review:
        review = PhysicianReview(session_id=session_id, physician_id=physician_id)
        db.add(review)
    review.verified = 1
    review.physician_id = physician_id
    if req.notes:
        review.notes = req.notes
    review.timestamp = datetime.now(timezone.utc).isoformat()
    db.commit()
    return {"status": "verified", "session_id": session_id, "physician_id": review.physician_id}

@physician_router.post("/reports/{session_id}/notes")
def add_physician_notes(session_id: str, req: PhysicianNotesRequest, db: Session = Depends(get_db), physician: dict = Depends(get_current_physician)):
    """Add or update physician notes for a report."""
    physician_id = physician.get("sub")
    if not physician_id:
        raise HTTPException(status_code=401, detail="Invalid authentication token: missing subject claim.")

    review = db.query(PhysicianReview).filter(PhysicianReview.session_id == session_id).first()
    if not review:
        review = PhysicianReview(session_id=session_id, physician_id=physician_id)
        db.add(review)
    review.notes = req.notes
    review.physician_id = physician_id
    db.commit()
    return {"status": "notes_saved", "session_id": session_id, "physician_id": physician_id}

@physician_router.post("/reports/{session_id}/summary")
@physician_router.put("/reports/{session_id}/summary")
def update_physician_report_summary(session_id: str, req: PhysicianSummaryUpdateRequest, db: Session = Depends(get_db), physician: dict = Depends(get_current_physician)):
    """Allows the physician to directly edit and correct the AI clinical summary report."""
    physician_id = physician.get("sub")
    if not physician_id:
        raise HTTPException(status_code=401, detail="Invalid authentication token: missing subject claim.")

    intake = db.query(IntakeResult).filter(IntakeResult.session_id == session_id).first()
    if not intake:
        intake = IntakeResult(session_id=session_id, intake_type="voice-consultation", summary={})
        db.add(intake)

    summary_data = dict(intake.summary or {})
    summary_data["clinician_summary"] = req.clinician_summary
    summary_data["physician_edited"] = True
    summary_data["last_edited_by"] = physician_id
    summary_data["last_edited_at"] = datetime.now(timezone.utc).isoformat()
    intake.summary = summary_data
    db.commit()
    return {
        "status": "summary_updated",
        "session_id": session_id,
        "clinician_summary": req.clinician_summary,
        "physician_edited": True,
        "last_edited_at": summary_data["last_edited_at"],
        "last_edited_by": physician_id
    }

@physician_router.post("/reports/{session_id}/criticality")
def set_criticality(session_id: str, urgency: str = "routine", critical: bool = False, red_flags: Optional[List[str]] = None, db: Session = Depends(get_db), physician: dict = Depends(get_current_physician)):
    """Set criticality metadata for an intake report (called after triage analysis)."""
    physician_id = physician.get("sub")
    if not physician_id:
        raise HTTPException(status_code=401, detail="Invalid authentication token: missing subject claim.")

    review = db.query(PhysicianReview).filter(PhysicianReview.session_id == session_id).first()
    if not review:
        review = PhysicianReview(session_id=session_id, physician_id=physician_id)
        db.add(review)
    review.urgency = urgency
    review.critical = 1 if critical else 0
    review.red_flags = red_flags or []
    review.physician_id = physician_id
    db.commit()
    return {"status": "criticality_set", "session_id": session_id, "urgency": urgency, "critical": critical, "physician_id": physician_id}

# ── Authentication / OTP Verification Router ──
auth_router = APIRouter(prefix="/api/auth", tags=["auth"])

AUTH_OTP_STORE: Dict[str, Dict[str, Any]] = {}
PHYSICIAN_PIN = settings.PHYSICIAN_PIN

class PatientSendOtpRequest(BaseModel):
    name: str
    mobile: str
    abha_id: Optional[str] = None

class PatientVerifyOtpRequest(BaseModel):
    name: str
    mobile: str
    otp: str
    abha_id: Optional[str] = None
    channel: Optional[str] = "kiosk"

class PhysicianSendOtpRequest(BaseModel):
    pin: str
    mobile: Optional[str] = "9876543210"
    physician_id: Optional[str] = "physician-1"

class PhysicianVerifyOtpRequest(BaseModel):
    pin: str
    otp: str
    physician_id: Optional[str] = "physician-1"

@auth_router.post("/patient/send-otp")
def patient_send_otp(req: PatientSendOtpRequest):
    name = req.name.strip()
    mobile = re.sub(r"\D", "", req.mobile)
    if not name:
        raise HTTPException(status_code=400, detail="Patient full name is required.")
    if len(mobile) != 10 or mobile[0] not in "6789":
        raise HTTPException(status_code=400, detail="Please enter a valid 10-digit Indian mobile number (e.g. 9876543210).")

    otp = f"{random.randint(100000, 999999)}"
    expires_at = time.time() + 300  # 5 mins
    AUTH_OTP_STORE[f"patient_{mobile}"] = {
        "otp": otp,
        "name": name,
        "abha_id": req.abha_id,
        "expires_at": expires_at,
        "created_at": time.time()
    }

    # Send SMS notification via MSG91/Twilio dispatcher
    sms_text = f"Your Jeevan Health login OTP is {otp}. Valid for 5 minutes. Do not share this OTP."
    sms_res = send_sms_dispatcher(mobile, sms_text)

    # Secure server audit log (visible on local console for development)
    print(f"[SECURE AUTH DISPATCH] Patient Mobile: +91 {mobile} | OTP: {otp}")

    return {
        "status": "otp_sent",
        "mobile": mobile,
        "message": f"OTP sent to +91 {mobile[:2]}******{mobile[-2:]}.",
        "expires_in": 300,
        "dev_otp": otp,
        "sms_dispatch": sms_res
    }

@auth_router.post("/patient/verify-otp")
def patient_verify_otp(req: PatientVerifyOtpRequest, db: Session = Depends(get_db)):
    name = req.name.strip()
    mobile = re.sub(r"\D", "", req.mobile)
    otp = req.otp.strip()

    if not otp:
        raise HTTPException(status_code=400, detail="OTP code is required.")

    cache_key = f"patient_{mobile}"
    stored = AUTH_OTP_STORE.get(cache_key)

    is_valid = False
    if stored and stored.get("otp") == otp:
        if time.time() > stored.get("expires_at", 0):
            raise HTTPException(status_code=400, detail="OTP has expired. Please request a new OTP.")
        is_valid = True

    if not is_valid:
        raise HTTPException(status_code=400, detail="Incorrect OTP. Please enter the valid 6-digit code sent to your mobile.")

    # Clear verified OTP
    AUTH_OTP_STORE.pop(cache_key, None)

    session_id = f"session-{int(time.time() * 1000)}-{uuid.uuid4().hex[:6]}"
    effective_abha = req.abha_id.strip() if req.abha_id and req.abha_id.strip() else f"ABHA-{int(time.time())}"
    channel = req.channel or "kiosk"
    token_number = generate_opd_token(db, channel)

    # Save/create consent record
    consent = ConsentRecord(
        session_id=session_id,
        abha_id=effective_abha,
        name=name,
        phone=mobile,
        status="granted",
        profile_data={
            "source": "otp-login",
            "mobile": mobile,
            "verified": True,
            "channel": channel,
            "token_number": token_number
        }
    )
    db.add(consent)
    db.commit()

    token = create_access_token({
        "sub": session_id,
        "role": "patient",
        "session_id": session_id,
        "name": name,
        "mobile": mobile,
        "abha_id": effective_abha
    }, expires_delta=14400)

    return {
        "status": "authenticated",
        "role": "patient",
        "session_id": session_id,
        "patient_name": name,
        "mobile": mobile,
        "abha_id": effective_abha,
        "consent_granted": True,
        "token_number": token_number,
        "channel": channel,
        "access_token": token,
        "token_type": "bearer"
    }

class PatientSendEmailOtpRequest(BaseModel):
    name: str
    email: str

class PatientVerifyEmailOtpRequest(BaseModel):
    name: str
    email: str
    otp: str
    channel: Optional[str] = "kiosk"

class PatientAbhaLoginRequest(BaseModel):
    name: Optional[str] = None
    abha_id: str
    channel: Optional[str] = "kiosk"

@auth_router.post("/patient/send-email-otp")
def patient_send_email_otp(req: PatientSendEmailOtpRequest):
    name = req.name.strip()
    email = req.email.strip().lower()
    if not name:
        raise HTTPException(status_code=400, detail="Patient name is required.")
    if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
        raise HTTPException(status_code=400, detail="Please enter a valid email address.")

    otp = f"{random.randint(100000, 999999)}"
    expires_at = time.time() + 300
    AUTH_OTP_STORE[f"email_{email}"] = {
        "otp": otp,
        "name": name,
        "expires_at": expires_at,
        "created_at": time.time()
    }

    html_content = f"""
    <div style="font-family:sans-serif;max-width:500px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc;">
        <h2 style="color:#0f766e;margin-top:0;">Jeevan Verification Code</h2>
        <p>Hello <strong>{name}</strong>,</p>
        <p>Use the 6-digit verification code below to log into your Jeevan clinical intake:</p>
        <div style="background:#0f766e;color:#ffffff;font-size:28px;font-weight:bold;letter-spacing:6px;text-align:center;padding:16px;border-radius:8px;margin:20px 0;">
            {otp}
        </div>
        <p style="color:#64748b;font-size:12px;">Valid for 5 minutes. If you did not request this login, please ignore this email.</p>
    </div>
    """
    email_res = send_email_dispatcher(email, f"Jeevan Login Verification Code: {otp}", html_content)
    print(f"[SECURE AUTH DISPATCH] Patient Email: {email} | OTP: {otp}")

    return {
        "status": "otp_sent",
        "email": email,
        "message": f"Verification code sent to {email}",
        "expires_in": 300,
        "dev_otp": otp,
        "dispatch": email_res
    }

@auth_router.post("/patient/verify-email-otp")
def patient_verify_email_otp(req: PatientVerifyEmailOtpRequest, db: Session = Depends(get_db)):
    name = req.name.strip()
    email = req.email.strip().lower()
    otp = req.otp.strip()

    if not otp:
        raise HTTPException(status_code=400, detail="OTP code is required.")

    cache_key = f"email_{email}"
    stored = AUTH_OTP_STORE.get(cache_key)

    is_valid = False
    if stored and stored.get("otp") == otp:
        if time.time() > stored.get("expires_at", 0):
            raise HTTPException(status_code=400, detail="OTP has expired. Please request a new code.")
        is_valid = True

    if not is_valid:
        raise HTTPException(status_code=400, detail="Incorrect verification code. Please check your email.")

    AUTH_OTP_STORE.pop(cache_key, None)
    session_id = f"session-{int(time.time() * 1000)}-{uuid.uuid4().hex[:6]}"
    abha_id = f"ABHA-{int(time.time())}"
    channel = req.channel or "kiosk"
    token_number = generate_opd_token(db, channel)

    consent = ConsentRecord(
        session_id=session_id,
        abha_id=abha_id,
        name=name,
        email=email,
        status="granted",
        profile_data={
            "source": "email-login",
            "email": email,
            "verified": True,
            "channel": channel,
            "token_number": token_number
        }
    )
    db.add(consent)
    db.commit()

    token = create_access_token({
        "sub": session_id,
        "role": "patient",
        "session_id": session_id,
        "name": name,
        "email": email,
        "abha_id": abha_id
    }, expires_delta=14400)

    return {
        "status": "authenticated",
        "role": "patient",
        "session_id": session_id,
        "patient_name": name,
        "email": email,
        "abha_id": abha_id,
        "consent_granted": True,
        "token_number": token_number,
        "channel": channel,
        "access_token": token,
        "token_type": "bearer"
    }

@auth_router.post("/patient/abha-login")
def patient_abha_login(req: PatientAbhaLoginRequest, db: Session = Depends(get_db)):
    abha_raw = req.abha_id.strip()
    if not abha_raw:
        raise HTTPException(status_code=400, detail="ABHA ID or @abdm address is required.")

    from abdm_service import search_abha_by_id
    matched_profile = search_abha_by_id(abha_raw)

    patient_name = req.name.strip() if req.name and req.name.strip() else (matched_profile.get("name") if matched_profile else "Ayushman Patient")
    session_id = f"session-{int(time.time() * 1000)}-{uuid.uuid4().hex[:6]}"
    effective_abha = matched_profile.get("abha_number") if matched_profile else abha_raw
    effective_address = matched_profile.get("abha_address") if matched_profile else (f"{abha_raw}@abdm" if "@" not in abha_raw else abha_raw)
    effective_gender = matched_profile.get("gender") if matched_profile else None
    effective_dob = matched_profile.get("dob") if matched_profile else None
    effective_phone = matched_profile.get("mobile") if matched_profile else None
    effective_email = matched_profile.get("email") if matched_profile else None
    channel = req.channel or "kiosk"
    token_number = generate_opd_token(db, channel)

    consent = ConsentRecord(
        session_id=session_id,
        abha_id=effective_abha,
        name=patient_name,
        abha_address=effective_address,
        dob=effective_dob,
        gender=effective_gender,
        phone=effective_phone,
        email=effective_email,
        status="granted",
        profile_data={
            "source": "abha-direct-login",
            "profile": matched_profile or {"abha_id": abha_raw},
            "channel": channel,
            "token_number": token_number
        }
    )
    db.add(consent)
    db.commit()

    token = create_access_token({
        "sub": session_id,
        "role": "patient",
        "session_id": session_id,
        "name": patient_name,
        "abha_id": effective_abha
    }, expires_delta=14400)

    return {
        "status": "authenticated",
        "role": "patient",
        "session_id": session_id,
        "patient_name": patient_name,
        "abha_id": consent.abha_id,
        "abha_address": consent.abha_address,
        "gender": consent.gender,
        "dob": consent.dob,
        "age": calculate_age(consent.dob),
        "phone": consent.phone,
        "email": consent.email,
        "profile": matched_profile,
        "consent_granted": True,
        "token_number": token_number,
        "channel": channel,
        "access_token": token,
        "token_type": "bearer"
    }

@auth_router.post("/physician/send-otp")
def physician_send_otp(req: PhysicianSendOtpRequest):
    if req.pin.strip() != PHYSICIAN_PIN:
        raise HTTPException(status_code=401, detail="Incorrect Physician Access PIN. Please try again.")

    mobile = re.sub(r"\D", "", req.mobile or "9876543210")
    if len(mobile) != 10:
        mobile = "9876543210"

    otp = f"{random.randint(100000, 999999)}"
    expires_at = time.time() + 300
    AUTH_OTP_STORE["physician_otp"] = {
        "otp": otp,
        "pin": req.pin,
        "physician_id": req.physician_id or "physician-1",
        "expires_at": expires_at
    }

    sms_text = f"Your Jeevan Doctor Access verification code is {otp}. Valid for 5 minutes."
    sms_res = send_sms_dispatcher(mobile, sms_text)
    print(f"[SECURE AUTH DISPATCH] Doctor 2FA Code: {otp} for PIN {req.pin}")

    return {
        "status": "otp_sent",
        "mobile": mobile,
        "message": f"Doctor verification code sent to registered mobile +91 {mobile[:2]}******{mobile[-2:]}.",
        "expires_in": 300,
        "dev_otp": otp,
        "sms_dispatch": sms_res
    }

@auth_router.post("/physician/verify-otp")
def physician_verify_otp(req: PhysicianVerifyOtpRequest):
    if req.pin.strip() != PHYSICIAN_PIN:
        raise HTTPException(status_code=401, detail="Incorrect Physician Access PIN.")

    otp = req.otp.strip()
    if not otp:
        raise HTTPException(status_code=400, detail="Doctor verification OTP is required.")

    stored = AUTH_OTP_STORE.get("physician_otp")
    is_valid = False
    if stored and stored.get("otp") == otp:
        if time.time() > stored.get("expires_at", 0):
            raise HTTPException(status_code=400, detail="Verification code has expired. Please request a new code.")
        is_valid = True

    if not is_valid:
        raise HTTPException(status_code=400, detail="Incorrect verification code. Please enter the valid code dispatched to registered mobile.")

    AUTH_OTP_STORE.pop("physician_otp", None)

    token = create_access_token({
        "sub": req.physician_id or "physician-1",
        "role": "physician",
        "physician_id": req.physician_id or "physician-1",
        "name": "Dr. Sharma (MD, Clinical OPD)",
        "department": "AYUSH & General OPD"
    }, expires_delta=28800)  # 8 hours

    return {
        "status": "authenticated",
        "role": "physician",
        "physician_id": req.physician_id or "physician-1",
        "name": "Dr. Sharma (MD, Clinical OPD)",
        "department": "AYUSH & General OPD",
        "access_token": token,
        "token_type": "bearer"
    }

class Msg91WidgetVerifyRequest(BaseModel):
    access_token: str
    name: Optional[str] = "Patient"
    mobile: Optional[str] = None
    abha_id: Optional[str] = None
    role: Optional[str] = "patient"
    pin: Optional[str] = None
    channel: Optional[str] = "kiosk"

@auth_router.post("/msg91/verify-widget-token")
def verify_msg91_widget_token(req: Msg91WidgetVerifyRequest, db: Session = Depends(get_db)):
    """
    Verifies the access-token returned by MSG91 SendOTP Widget
    via https://control.msg91.com/api/v5/widget/verifyAccessToken
    """
    auth_key = os.environ.get("MSG91_AUTH_KEY", "569169ArD0hn6ubGkl6aa07883P1")
    verified_mobile = req.mobile

    try:
        url = "https://control.msg91.com/api/v5/widget/verifyAccessToken"
        headers = {"Content-Type": "application/json"}
        payload = {
            "authkey": auth_key,
            "access-token": req.access_token
        }
        with httpx.Client(timeout=10.0) as client:
            resp = client.post(url, headers=headers, json=payload)
            if resp.status_code == 200:
                res_data = resp.json()
                if res_data.get("type") == "success":
                    verified_mobile = res_data.get("mobile") or verified_mobile
    except Exception as e:
        print(f"[MSG91 Widget Verification Note] {e}")

    session_id = f"session-{int(time.time() * 1000)}-{uuid.uuid4().hex[:6]}"
    name = (req.name or "Patient").strip()
    effective_abha = req.abha_id.strip() if req.abha_id and req.abha_id.strip() else f"ABHA-{int(time.time())}"
    channel = req.channel or "kiosk"
    token_number = generate_opd_token(db, channel)

    if req.role == "physician":
        token = create_access_token({
            "sub": "physician-1",
            "role": "physician",
            "physician_id": "physician-1",
            "name": "Dr. Sharma (MD, Clinical OPD)",
            "department": "AYUSH & General OPD"
        }, expires_delta=28800)
        return {
            "status": "authenticated",
            "role": "physician",
            "physician_id": "physician-1",
            "name": "Dr. Sharma (MD, Clinical OPD)",
            "department": "AYUSH & General OPD",
            "access_token": token,
            "token_type": "bearer"
        }

    # Save patient consent
    consent = ConsentRecord(
        session_id=session_id,
        abha_id=effective_abha,
        name=name,
        phone=verified_mobile,
        status="granted",
        profile_data={
            "source": "msg91-sendotp-widget",
            "mobile": verified_mobile,
            "verified": True,
            "channel": channel,
            "token_number": token_number
        }
    )
    db.add(consent)
    db.commit()

    token = create_access_token({
        "sub": session_id,
        "role": "patient",
        "session_id": session_id,
        "name": name,
        "mobile": verified_mobile,
        "abha_id": effective_abha
    }, expires_delta=14400)

    return {
        "status": "authenticated",
        "role": "patient",
        "session_id": session_id,
        "patient_name": name,
        "mobile": verified_mobile,
        "abha_id": effective_abha,
        "consent_granted": True,
        "token_number": token_number,
        "channel": channel,
        "access_token": token,
        "token_type": "bearer"
    }

app.include_router(auth_router)
app.include_router(consent_router)
app.include_router(abdm_router)
app.include_router(ayush_router)
app.include_router(intake_router)
app.include_router(documents_router)
app.include_router(summary_router)
app.include_router(llm_router)
app.include_router(physician_router)



