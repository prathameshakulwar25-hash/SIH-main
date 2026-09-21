from typing import Any, Dict, List


def score_ayush(answers: List[Dict[str, str]]) -> Dict[str, Any]:
    """
    Scores the AYUSH assessment based on the provided answers.
    Expects answers in the format: [{"question_id": "p1", "mapped_to": "Vata"}, ...]
    """
    scores = {
        "Prakriti": {"Vata": 0, "Pitta": 0, "Kapha": 0},
        "Agni": {"Vishama": 0, "Tikshna": 0, "Manda": 0, "Sama": 0},
        "Koshtha": {"Krura": 0, "Mridu": 0, "Madhyama": 0}
    }

    # Categorize questions by ID prefixes to map them to sections
    for answer in answers:
        q_id = answer.get("question_id", "")
        mapped_to = answer.get("mapped_to", "")

        if not q_id or not mapped_to:
            continue

        if q_id.startswith("p") and mapped_to in scores["Prakriti"]:
            scores["Prakriti"][mapped_to] += 1
        elif q_id.startswith("a") and mapped_to in scores["Agni"]:
            scores["Agni"][mapped_to] += 1
        elif q_id.startswith("k") and mapped_to in scores["Koshtha"]:
            scores["Koshtha"][mapped_to] += 1

    # Determine dominant types
    result = {
        "scores": scores,
        "dominant": {}
    }

    for section, tally in scores.items():
        if not any(tally.values()):
            continue

        max_score = max(tally.values())
        # Can have multiple dominant types if tied
        dominant_types = [k for k, v in tally.items() if v == max_score and v > 0]
        result["dominant"][section] = dominant_types

    return result
