"""
Clinical Intake Chat - Standalone Developer Terminal Test Tool
==============================================================
Interactive command-line tool for developers to simulate conversational clinical intake
sessions and verify LLM prompts (OLDCARTS / OPQRST) without launching the full web UI.

Usage:
    python backend/clinical_intake_chat.py
"""

import os
import sys

from dotenv import load_dotenv

# Ensure UTF-8 output on Windows consoles
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Load environment variables from backend/.env
dotenv_path = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(dotenv_path)
load_dotenv()

from openai import OpenAI

# API Key resolution
API_KEY = (
    os.getenv("GROQ_API_KEY")
    or os.getenv("GROK_API_KEY")
    or os.getenv("XAI_API_KEY")
    or os.getenv("OPENAI_API_KEY")
    or ""
).strip()

# Provider & Endpoint auto-detection
if API_KEY.startswith("gsk_") or os.getenv("GROQ_API_KEY"):
    BASE_URL = os.getenv("GROQ_API_BASE", "https://api.groq.com/openai/v1")
    MODEL = os.getenv("GROQ_MODEL") or os.getenv("GROK_MODEL") or "openai/gpt-oss-120b"
elif API_KEY.startswith("xai-") or os.getenv("XAI_API_KEY"):
    BASE_URL = os.getenv("XAI_API_BASE", "https://api.x.ai/v1")
    MODEL = os.getenv("GROK_MODEL") or "grok-3"
else:
    BASE_URL = os.getenv("GROQ_API_BASE") or os.getenv("XAI_API_BASE") or "https://api.groq.com/openai/v1"
    MODEL = os.getenv("GROK_MODEL") or os.getenv("GROQ_MODEL") or "openai/gpt-oss-120b"

client = OpenAI(
    api_key=API_KEY,
    base_url=BASE_URL
)

SYSTEM_PROMPT = """
You are a professional clinical intake assistant. Your only job is to gather a complete, accurate history from the patient before they see the doctor. You do not diagnose, give advice, interpret findings, or suggest treatments.

Conversation style:
- Empathetic, calm, clear, and professional.
- Ask one focused question (or a short related cluster) at a time.
- Adapt follow-up questions to the chief complaint and the answers you receive.
- Use plain language.

Standard structure you follow:
1. Chief complaint – open question.
2. History of present illness (OLDCARTS/OPQRST): Onset, Location, Duration/Timing, Character, Aggravating/Relieving factors, Severity (0-10), Associated symptoms.
3. Relevant review of systems + red-flag screening for the complaint.
4. Current medications and allergies.
5. Past medical/surgical history and relevant chronic conditions.
6. Brief relevant social history if needed.
7. Anything else the patient wants the doctor to know.

Rules:
- Never invent information.
- If the patient mentions emergency red-flag symptoms, clearly advise seeking emergency care.
- After you have gathered the key information, produce a concise structured summary for the clinician and ask the patient to confirm it is accurate.
"""

CLINICIAN_SUMMARY_PROMPT = (
    "Please now generate a clean, structured clinician summary "
    "of everything collected so far. Use this format:\n\n"
    "Chief Complaint:\n"
    "History of Present Illness:\n"
    "Associated Symptoms / ROS:\n"
    "Medications:\n"
    "Allergies:\n"
    "Past Medical History:\n"
    "Red Flags Assessed:\n"
    "Additional Notes:\n"
    "Patient Confirmation Status:\n"
)

def chat():
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]

    print("=== Clinical Intake Assistant ===")
    print(f"Provider: {BASE_URL} | Model: {MODEL}")
    print("Type 'summary' when you want the clinician note, or 'quit' to exit.\n")

    # Start the conversation
    messages.append({"role": "user", "content": "Please begin the intake."})

    while True:
        try:
            response = client.chat.completions.create(
                model=MODEL,
                messages=messages,
                temperature=0.3,
            )
        except Exception as e:
            print(f"\n[Error connecting to model: {e}]")
            break

        assistant_reply = response.choices[0].message.content
        print(f"\nAssistant: {assistant_reply}")
        messages.append({"role": "assistant", "content": assistant_reply})

        # Get patient input
        try:
            user_input = input("\nYou: ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nExiting intake session.")
            break

        if user_input.lower() in ["quit", "exit"]:
            print("Intake session concluded.")
            break

        if user_input.lower() == "summary":
            # Force a clean clinician summary
            messages.append({
                "role": "user",
                "content": CLINICIAN_SUMMARY_PROMPT
            })
            continue

        messages.append({"role": "user", "content": user_input})

if __name__ == "__main__":
    chat()
