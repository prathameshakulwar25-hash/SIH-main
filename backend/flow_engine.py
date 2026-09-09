"""
Flow Engine for Jeevan Clinical Intake.

This module drives the intake interview as a deterministic ordered flow
from intake_flow.json. The LLM is used ONLY to:
  1. Deliver the next predefined question naturally (with a warm acknowledgement)
  2. Detect red flags in patient answers
  3. Generate the final clinical summary

This guarantees:
  - No repeated questions
  - Correct language throughout
  - No getting stuck on the same question
  - Predictable flow regardless of LLM behavior
"""
import json
import os
import re
from typing import Dict, List, Optional, Any

# Load the flow definition once at module load
_FLOW_PATH = os.path.join(os.path.dirname(__file__), "intake_flow.json")
with open(_FLOW_PATH, encoding="utf-8") as f:
    FLOW: Dict[str, Any] = json.load(f)

FLOW_STEPS: List[Dict[str, str]] = FLOW["steps"]
RED_FLAG_KEYWORDS: List[str] = [kw.lower() for kw in FLOW.get("red_flags", [])]

# In-memory session state: session_id -> state dict
_SESSIONS: Dict[str, Dict[str, Any]] = {}


def _normalize(text: str) -> str:
    return text.lower().strip()


def detect_red_flags(patient_text: str) -> List[str]:
    """Returns list of matched red flag keywords found in patient's answer."""
    lower = _normalize(patient_text)
    return [kw for kw in RED_FLAG_KEYWORDS if kw in lower]


def get_or_create_session(session_id: str, language: str = "en") -> Dict[str, Any]:
    if session_id not in _SESSIONS:
        _SESSIONS[session_id] = {
            "step_index": 0,          # which flow step we're currently on
            "language": language,
            "collected": {},          # field -> patient answer
            "red_flags_found": [],
            "complete": False,
        }
    # Always update language in case patient changed it
    _SESSIONS[session_id]["language"] = language
    return _SESSIONS[session_id]


def get_current_question(session_id: str, language: str = "en") -> Optional[str]:
    """Return the current step's question text in the right language."""
    state = get_or_create_session(session_id, language)
    idx = state["step_index"]
    if idx >= len(FLOW_STEPS):
        return None
    step = FLOW_STEPS[idx]
    key = f"text_{language}"
    return step.get(key) or step.get("text_en", "")


def get_step_meta(session_id: str) -> Optional[Dict[str, Any]]:
    """Return the visual touch-UI metadata for the NEXT step to be displayed.

    Returns a dict with keys: step_id, ui_type, options (may be absent for body_map).
    Returns None if the session is complete or beyond the last step.
    """
    state = _SESSIONS.get(session_id)
    if not state:
        return None
    idx = state.get("step_index", 0)
    if idx >= len(FLOW_STEPS):
        return None
    step = FLOW_STEPS[idx]
    return {
        "step_id": step.get("id"),
        "ui_type": step.get("ui_type"),
        "options": step.get("options"),  # None for body_map steps
    }


def advance_step(session_id: str, patient_answer: str, language: str = "en") -> Dict[str, Any]:
    """
    Process the patient's answer for the current step:
    - Check for red flags
    - Store the answer
    - Advance to the next step
    Returns: {
        "next_question": str or None (None = intake complete),
        "red_flags": list,
        "complete": bool,
        "current_field": str,
        "step_index": int,
    }
    """
    state = get_or_create_session(session_id, language)
    idx = state["step_index"]

    if state["complete"] or idx >= len(FLOW_STEPS):
        return {
            "next_question": None,
            "red_flags": state["red_flags_found"],
            "complete": True,
            "current_field": "",
            "step_index": idx,
        }

    # Store the answer for the current step's field
    current_step = FLOW_STEPS[idx]
    field = current_step.get("field", current_step["id"])
    state["collected"][field] = patient_answer

    # Check for red flags in this answer
    flags = detect_red_flags(patient_answer)
    if flags:
        state["red_flags_found"].extend(flags)

    # Advance to next step
    state["step_index"] = idx + 1
    next_idx = state["step_index"]

    # Check if flow is complete
    if next_idx >= len(FLOW_STEPS):
        state["complete"] = True
        return {
            "next_question": None,
            "red_flags": state["red_flags_found"],
            "complete": True,
            "current_field": field,
            "step_index": next_idx,
        }

    # Get next question
    next_step = FLOW_STEPS[next_idx]
    key = f"text_{language}"
    next_question = next_step.get(key) or next_step.get("text_en", "")

    return {
        "next_question": next_question,
        "red_flags": state["red_flags_found"],
        "complete": False,
        "current_field": next_step.get("field", next_step["id"]),
        "step_index": next_idx,
    }


def get_session_summary(session_id: str) -> Dict[str, Any]:
    """Return all collected data for a session (used for report generation)."""
    state = _SESSIONS.get(session_id, {})
    return {
        "collected": state.get("collected", {}),
        "red_flags": state.get("red_flags_found", []),
        "complete": state.get("complete", False),
        "language": state.get("language", "en"),
    }


def reset_session(session_id: str):
    """Clear session state (e.g., for a new intake)."""
    if session_id in _SESSIONS:
        del _SESSIONS[session_id]


def build_summary_prompt(session_id: str) -> str:
    """Build the structured prompt for the LLM to generate the final clinical report."""
    data = get_session_summary(session_id)
    collected = data["collected"]
    red_flags = data["red_flags"]

    lines = ["Patient Clinical Intake Summary (collected via structured interview):"]
    lines.append("")
    for field, answer in collected.items():
        label = field.replace("_", " ").title()
        lines.append(f"  {label}: {answer}")
    if red_flags:
        lines.append("")
        lines.append(f"  RED FLAGS DETECTED: {', '.join(red_flags)}")
    lines.append("")
    lines.append("Please generate a formal, structured clinician-ready OPD summary note in SOAP format.")
    lines.append("Then append: [INTAKE_COMPLETE]")
    lines.append("Then append:")
    lines.append('```json')
    lines.append('{"urgency": "emergency|urgent|routine", "critical": true|false, "red_flags": []}')
    lines.append('```')

    return "\n".join(lines)


# Acknowledgement phrases so the AI sounds like a doctor, not a robot
ACKNOWLEDGEMENTS = {
    "en": [
        "Understood.", "Got it.", "Okay.", "I see.", "Noted.",
        "Alright.", "Thank you for telling me.", "Right.",
    ],
    "hi": [
        "समझ गया।", "ठीक है।", "अच्छा।", "जी, समझ गया।", "नोट कर लिया।",
        "बिल्कुल।", "धन्यवाद बताने के लिए।", "अच्छा, समझ गया।",
    ],
    "mr": [
        "समजले.", "ठीक आहे.", "बरं.", "समजलं.", "नोंद केली.",
        "बरोबर.", "सांगितल्याबद्दल धन्यवाद.", "अच्छा, समजलो.",
    ],
}

import random

def get_acknowledgement(language: str, step_index: int) -> str:
    phrases = ACKNOWLEDGEMENTS.get(language, ACKNOWLEDGEMENTS["en"])
    return phrases[step_index % len(phrases)]
