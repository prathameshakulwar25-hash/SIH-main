def check_red_flags(intake_data: dict, complaint_type: str = "abdominal-pain") -> list[str]:
    """
    Analyzes the intake data and returns a list of triage flags based on specific rules.
    Dispatches to specific rulesets based on complaint type.
    """
    if complaint_type == "abdominal-pain":
        return check_abdominal_pain_flags(intake_data)
    elif complaint_type == "chest-pain":
        return check_chest_pain_flags(intake_data)
    elif complaint_type == "fever":
        return check_fever_flags(intake_data)
    return []

def check_abdominal_pain_flags(intake_data: dict) -> list[str]:
    flags = []
    raw_sev = intake_data.get("severity") or (intake_data.get("S") if str(intake_data.get("S", "")).isdigit() else 0)
    severity = int(raw_sev) if str(raw_sev).isdigit() else 0
    onset = intake_data.get("onset") or intake_data.get("O", "")
    site = intake_data.get("site") or (intake_data.get("S") if not str(intake_data.get("S", "")).isdigit() else "") or ""
    associated_sx = intake_data.get("associated_sx") or intake_data.get("A", "")
    character = intake_data.get("character") or intake_data.get("C", "")
    radiation = intake_data.get("radiation_general") or intake_data.get("radiation_back") or intake_data.get("R", "")
    
    if (severity >= 8 and onset == "sudden" and site == "rlq") or (site == "rlq" and (character == "tearing" or associated_sx == "blood")):
        flags.append("High Priority Triage: Possible acute surgical pattern.")
    if associated_sx == "fever" and severity >= 7:
        flags.append("Moderate-High Priority: Possible infective/inflammatory pattern.")
    if character == "tearing" and radiation == "back":
        flags.append("Critical Priority: Immediate evaluation required for vascular pattern.")
    if associated_sx == "blood":
        flags.append("High Priority: Potential hemorrhagic/obstructive pattern.")
        
    return flags

def check_chest_pain_flags(intake_data: dict) -> list[str]:
    flags = []
    character = intake_data.get("character") or intake_data.get("C", "")
    radiation = intake_data.get("radiation_cardiac") or intake_data.get("radiation_back") or intake_data.get("R", "")
    associated_cardiac = intake_data.get("associated_cardiac") or intake_data.get("A", "")
    associated_respiratory = intake_data.get("associated_respiratory") or intake_data.get("A", "")
    onset = intake_data.get("onset") or intake_data.get("O", "")
    
    if character == "crushing" and radiation == "arm_jaw" and associated_cardiac == "sweating_palpitations":
        flags.append("Critical Priority: Immediate evaluation required for possible cardiac pattern.")
    if onset == "sudden" and character == "pleuritic" and associated_respiratory == "breathlessness":
        flags.append("High Priority: Possible respiratory/pulmonary pattern.")
    if character == "tearing":
        flags.append("Critical Priority: Immediate evaluation required for vascular pattern.")
        
    return flags

def check_fever_flags(intake_data: dict) -> list[str]:
    flags = []
    raw_sev = intake_data.get("severity") or (intake_data.get("S") if str(intake_data.get("S", "")).isdigit() else 0)
    severity = int(raw_sev) if str(raw_sev).isdigit() else 0
    associated_sx = intake_data.get("associated_sx") or intake_data.get("A", "")
    travel = intake_data.get("travel_history") or ("yes" if intake_data.get("A") == "yes" else "")
    duration = intake_data.get("duration") or intake_data.get("T", "")
    
    if associated_sx == "rigors" and duration == "gt_5" and (severity >= 8 or travel == "yes"):
        flags.append("High Priority: Possible systemic infective pattern.")
    if travel == "yes" and associated_sx == "aches_rash":
        flags.append("High Priority: Possible vector-borne/infective pattern requiring investigation.")
    if associated_sx == "cns":
        flags.append("Critical Priority: Immediate evaluation required for CNS infectious pattern.")
        
    return flags
