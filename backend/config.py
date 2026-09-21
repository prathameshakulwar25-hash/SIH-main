"""
Jeevan OPD - Centralized Configuration & Environment Settings
Loads environment variables once and exposes typed, validated settings.
"""

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

# Load .env file once from backend/ directory or root directory
backend_dir = Path(__file__).resolve().parent
env_paths = [
    backend_dir / ".env",
    backend_dir.parent / ".env",
]

for env_path in env_paths:
    if env_path.is_file():
        load_dotenv(dotenv_path=env_path, override=False)
        break


@dataclass(frozen=True)
class Settings:
    # ── Environment & Security ──
    ENV_MODE: str
    JWT_SECRET: str
    JWT_ALGORITHM: str
    JWT_EXPIRY_MINUTES: int
    PHYSICIAN_PIN: str
    FRONTEND_URL: str

    # ── Database ──
    DATABASE_URL: str

    # ── Live HL7 FHIR R4 Integration ──
    FHIR_SERVER_URL: str

    # ── ABDM Gateway (National Digital Health Mission) ──
    ABDM_BASE_URL: str
    ABDM_CLIENT_ID: str
    ABDM_CLIENT_SECRET: str

    # ── LLM Configuration (Unified Groq / Grok Aliases) ──
    GROQ_API_KEY: str
    GROK_API_KEY: str
    GROQ_MODEL: str
    GROK_MODEL: str
    GROQ_API_BASE: str
    XAI_API_BASE: str

    # ── SendGrid Email Configuration ──
    SENDGRID_API_KEY: str
    SENDGRID_FROM_EMAIL: str

    # ── Twilio SMS Configuration ──
    TWILIO_ACCOUNT_SID: str
    TWILIO_AUTH_TOKEN: str
    TWILIO_PHONE_NUMBER: str
    TWILIO_TEMPLATE_NAME: str

    # ── Optional Notification Providers (AWS SES, SMTP, MSG91) ──
    AWS_ACCESS_KEY_ID: str
    AWS_SECRET_ACCESS_KEY: str
    SES_FROM_EMAIL: str
    SMTP_HOST: str
    SMTP_PORT: int
    SMTP_USER: str
    SMTP_PASSWORD: str
    MSG91_AUTH_KEY: str
    MSG91_SENDER_ID: str
    MSG91_OTP_TEMPLATE_ID: str
    MSG91_WIDGET_ID: str
    MSG91_TOKEN_AUTH: str

    @property
    def is_production(self) -> bool:
        return self.ENV_MODE.lower() == "production"

    @property
    def is_development(self) -> bool:
        return not self.is_production


def load_settings() -> Settings:
    env_mode = os.environ.get("ENV_MODE", "development").strip().lower()

    jwt_secret = os.environ.get("JWT_SECRET", "").strip()
    if not jwt_secret:
        jwt_secret = "jeevan-opd-clinical-jwt-secret-key-2026-production"
        if env_mode == "production":
            import logging
            logging.getLogger("uvicorn.error").warning(
                "[SECURITY WARNING] JWT_SECRET not configured in environment. "
                "Using fallback secret. Set JWT_SECRET in production settings."
            )

    physician_pin = os.environ.get("PHYSICIAN_PIN", "").strip()
    if not physician_pin:
        physician_pin = "1234"
        if env_mode == "production":
            import logging
            logging.getLogger("uvicorn.error").warning(
                "[SECURITY WARNING] PHYSICIAN_PIN not configured in environment. "
                "Defaulting to '1234'. Set PHYSICIAN_PIN in production settings."
            )

    # Resolve LLM keys with unified Groq / Grok aliasing
    groq_api_key = os.environ.get("GROQ_API_KEY", os.environ.get("GROK_API_KEY", "")).strip()
    grok_api_key = groq_api_key

    groq_model = os.environ.get("GROQ_MODEL", os.environ.get("GROK_MODEL", "openai/gpt-oss-120b")).strip()
    grok_model = os.environ.get("GROK_MODEL", os.environ.get("GROQ_MODEL", "openai/gpt-oss-120b")).strip()

    try:
        jwt_expiry_minutes = int(os.environ.get("JWT_EXPIRY_MINUTES", "480"))
    except ValueError:
        jwt_expiry_minutes = 480

    try:
        smtp_port = int(os.environ.get("SMTP_PORT", "587"))
    except ValueError:
        smtp_port = 587

    return Settings(
        ENV_MODE=env_mode,
        JWT_SECRET=jwt_secret,
        JWT_ALGORITHM=os.environ.get("JWT_ALGORITHM", "HS256").strip(),
        JWT_EXPIRY_MINUTES=jwt_expiry_minutes,
        PHYSICIAN_PIN=physician_pin,
        FRONTEND_URL=os.environ.get("FRONTEND_URL", "").strip(),
        DATABASE_URL=os.environ.get("DATABASE_URL", "").strip(),
        FHIR_SERVER_URL=os.environ.get("FHIR_SERVER_URL", "https://hapi.fhir.org/baseR4").strip(),
        ABDM_BASE_URL=os.environ.get("ABDM_BASE_URL", "https://dev.abdm.gov.in/gateway").strip(),
        ABDM_CLIENT_ID=os.environ.get("ABDM_CLIENT_ID", "").strip(),
        ABDM_CLIENT_SECRET=os.environ.get("ABDM_CLIENT_SECRET", "").strip(),
        GROQ_API_KEY=groq_api_key,
        GROK_API_KEY=grok_api_key,
        GROQ_MODEL=groq_model,
        GROK_MODEL=grok_model,
        GROQ_API_BASE=os.environ.get("GROQ_API_BASE", "https://api.groq.com/openai/v1").strip(),
        XAI_API_BASE=os.environ.get("XAI_API_BASE", "https://api.x.ai/v1").strip(),
        SENDGRID_API_KEY=os.environ.get("SENDGRID_API_KEY", "").strip(),
        SENDGRID_FROM_EMAIL=os.environ.get("SENDGRID_FROM_EMAIL", "reports@jeevanopd.in").strip(),
        TWILIO_ACCOUNT_SID=os.environ.get("TWILIO_ACCOUNT_SID", "").strip(),
        TWILIO_AUTH_TOKEN=os.environ.get("TWILIO_AUTH_TOKEN", "").strip(),
        TWILIO_PHONE_NUMBER=os.environ.get("TWILIO_PHONE_NUMBER", "").strip(),
        TWILIO_TEMPLATE_NAME=os.environ.get("TWILIO_TEMPLATE_NAME", "").strip(),
        AWS_ACCESS_KEY_ID=os.environ.get("AWS_ACCESS_KEY_ID", "").strip(),
        AWS_SECRET_ACCESS_KEY=os.environ.get("AWS_SECRET_ACCESS_KEY", "").strip(),
        SES_FROM_EMAIL=os.environ.get("SES_FROM_EMAIL", "").strip(),
        SMTP_HOST=os.environ.get("SMTP_HOST", "").strip(),
        SMTP_PORT=smtp_port,
        SMTP_USER=os.environ.get("SMTP_USER", "").strip(),
        SMTP_PASSWORD=os.environ.get("SMTP_PASSWORD", "").strip(),
        MSG91_AUTH_KEY=os.environ.get("MSG91_AUTH_KEY", "").strip(),
        MSG91_SENDER_ID=os.environ.get("MSG91_SENDER_ID", "JEEVAN").strip(),
        MSG91_OTP_TEMPLATE_ID=os.environ.get("MSG91_OTP_TEMPLATE_ID", "").strip(),
        MSG91_WIDGET_ID=os.environ.get("MSG91_WIDGET_ID", "").strip(),
        MSG91_TOKEN_AUTH=os.environ.get("MSG91_TOKEN_AUTH", "").strip(),
    )


settings = load_settings()
