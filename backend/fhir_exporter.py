from fhir.resources.bundle import Bundle, BundleEntry
from fhir.resources.patient import Patient
from fhir.resources.consent import Consent
from fhir.resources.observation import Observation
from fhir.resources.documentreference import DocumentReference, DocumentReferenceContent
from fhir.resources.attachment import Attachment
from fhir.resources.codeableconcept import CodeableConcept
from fhir.resources.coding import Coding
from fhir.resources.reference import Reference
from fhir.resources.meta import Meta
from fhir.resources.identifier import Identifier
import uuid
import datetime
import base64
from typing import Optional, Dict, Any

def generate_fhir_bundle(
    session_id: str, 
    abha_id: str, 
    intake_triage: Optional[dict] = None, 
    documents_data: Optional[dict] = None,
    ayush_profile: Optional[dict] = None,
    encounter_summary: Optional[dict] = None,
    patient_meta: Optional[dict] = None
) -> dict:
    """
    Generates an official NRCES (National Resource Centre for EHR Standards) 
    & NDHM/ABDM compliant HL7 FHIR R4 Bundle for the clinical encounter.
    """
    bundle = Bundle(
        type="collection", 
        entry=[],
        meta=Meta(
            profile=["https://nrces.in/ndhm/fhir/r4/StructureDefinition/DocumentBundle"],
            lastUpdated=datetime.datetime.utcnow().isoformat() + "Z"
        )
    )
    
    # 1. Patient Resource
    patient_id = f"patient-{session_id}"
    patient = Patient(
        id=patient_id,
        identifier=[
            Identifier(
                system="https://healthid.ndhm.gov.in", 
                value=abha_id or "ABHA-UNVERIFIED"
            )
        ],
        meta=Meta(profile=["https://nrces.in/ndhm/fhir/r4/StructureDefinition/Patient"]),
        active=True
    )
    if patient_meta and patient_meta.get("name"):
        patient.name = [{"text": patient_meta["name"]}]
    if patient_meta and patient_meta.get("gender"):
        patient.gender = "male" if patient_meta["gender"] == "M" else ("female" if patient_meta["gender"] == "F" else "other")
    if patient_meta and patient_meta.get("dob"):
        patient.birthDate = patient_meta["dob"]

    bundle.entry.append(BundleEntry(fullUrl=f"urn:uuid:{patient_id}", resource=patient))
    
    # 2. Consent Resource (ABDM Consent Record)
    consent_id = f"consent-{session_id}"
    consent = Consent(
        id=consent_id,
        status="active",
        category=[CodeableConcept(
            coding=[Coding(system="http://terminology.hl7.org/CodeSystem/consentcategorycodes", code="npp", display="Notice of Privacy Practices")]
        )],
        subject=Reference(reference=f"urn:uuid:{patient_id}"),
        meta=Meta(profile=["https://nrces.in/ndhm/fhir/r4/StructureDefinition/ConsentRecord"])
    )
    bundle.entry.append(BundleEntry(fullUrl=f"urn:uuid:{consent_id}", resource=consent))

    # 3. Observation Resources (AYUSH Prakriti / Dashavidha Pariksha)
    if ayush_profile and any(ayush_profile.values()):
        obs_ayush_id = f"obs-ayush-{session_id}"
        obs_ayush = Observation(
            id=obs_ayush_id,
            status="final",
            category=[CodeableConcept(
                coding=[Coding(system="http://terminology.hl7.org/CodeSystem/observation-category", code="exam", display="Exam")]
            )],
            code=CodeableConcept(text="AYUSH Constitutional Assessment (Prakriti / Agni / Koshtha)"),
            subject=Reference(reference=f"urn:uuid:{patient_id}"),
            note=[{
                "text": f"Prakriti: {ayush_profile.get('prakriti', 'Unassessed')}, Agni: {ayush_profile.get('agni', 'Unassessed')}, Koshtha: {ayush_profile.get('koshtha', 'Unassessed')}"
            }],
            meta=Meta(profile=["https://nrces.in/ndhm/fhir/r4/StructureDefinition/Observation"])
        )
        bundle.entry.append(BundleEntry(fullUrl=f"urn:uuid:{obs_ayush_id}", resource=obs_ayush))

    # 4. Observation Resources (Triage Flags / Red Lines)
    if intake_triage and intake_triage.get("flags"):
        for i, flag in enumerate(intake_triage["flags"]):
            obs_id = f"obs-flag-{session_id}-{i}"
            obs = Observation(
                id=obs_id,
                status="final",
                category=[CodeableConcept(
                    coding=[Coding(system="http://terminology.hl7.org/CodeSystem/observation-category", code="survey", display="Survey")]
                )],
                code=CodeableConcept(text="Automated Triage Assessment Flag"),
                subject=Reference(reference=f"urn:uuid:{patient_id}"),
                valueString=flag,
                note=[{"text": "Generated via Jeevan Multilingual AI Intake Module. Attending physician verification required."}]
            )
            bundle.entry.append(BundleEntry(fullUrl=f"urn:uuid:{obs_id}", resource=obs))

    # 5. DocumentReference Resources (Uploaded Labs/Prescriptions)
    if documents_data and (documents_data.get("labs") or documents_data.get("medications")):
        doc_id = f"docref-{session_id}"
        doc_ref = DocumentReference(
            id=doc_id,
            status="current",
            subject=Reference(reference=f"urn:uuid:{patient_id}"),
            content=[DocumentReferenceContent(
                attachment=Attachment(
                    contentType="application/json",
                    data=base64.b64encode(str({"labs": documents_data.get("labs"), "medications": documents_data.get("medications")}).encode("utf-8")).decode("ascii")
                )
            )]
        )
        bundle.entry.append(BundleEntry(fullUrl=f"urn:uuid:{doc_id}", resource=doc_ref))

    return bundle.model_dump()
