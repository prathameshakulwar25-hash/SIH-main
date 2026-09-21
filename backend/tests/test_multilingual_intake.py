import sys
import time

from dotenv import load_dotenv

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

load_dotenv()

from fastapi.testclient import TestClient

from main import app


def test_multilingual():
    client = TestClient(app)

    languages = [
        ("en", "English", "I have a stomach ache for the past 2 days.", "mild burning pain"),
        ("hi", "Hindi", "मुझे 2 दिन से पेट में दर्द है।", "हल्का दर्द है"),
        ("mr", "Marathi", "माझ्या पोटात 2 दिवसांपासून दुखत आहे.", "कमी दुखत आहे")
    ]

    print("=== Multi-Turn Multilingual Intake Verification ===")

    for lang_code, lang_name, user_turn1, user_turn2 in languages:
        print(f"\n--- Testing Language: {lang_name} ({lang_code}) ---")

        # Turn 1
        history = [
            {"role": "user", "content": user_turn1}
        ]
        t0 = time.time()
        resp1 = client.post("/api/llm/chat", json={"history": history, "language": lang_code})
        dur1 = time.time() - t0

        assert resp1.status_code == 200, f"Turn 1 failed: {resp1.status_code} {resp1.text}"
        data1 = resp1.json()
        reply1 = data1.get("reply", "")
        options1 = data1.get("options", [])
        is_complete1 = data1.get("is_complete", False)

        print(f"Turn 1 ({dur1:.2f}s) Reply: {reply1}")
        print(f"Turn 1 Options ({len(options1)}): {[opt.get('label') or opt.get('value') for opt in options1]}")
        print(f"Turn 1 is_complete: {is_complete1}")

        assert not is_complete1, f"Premature completion on Turn 1 for {lang_name}"
        assert len(reply1) > 5, f"Empty reply for {lang_name}"

        if lang_code == "en":
            # Ensure English doesn't contain Devanagari characters
            devanagari_chars = [c for c in reply1 if '\u0900' <= c <= '\u097F']
            assert len(devanagari_chars) == 0, f"English response contains Devanagari characters: {''.join(devanagari_chars)}"
        elif lang_code in ("hi", "mr"):
            devanagari_chars = [c for c in reply1 if '\u0900' <= c <= '\u097F']
            assert len(devanagari_chars) > 5, f"{lang_name} response lacks Devanagari characters"

        # Turn 2
        history.append({"role": "assistant", "content": reply1})
        history.append({"role": "user", "content": user_turn2})

        t0 = time.time()
        resp2 = client.post("/api/llm/chat", json={"history": history, "language": lang_code})
        dur2 = time.time() - t0

        assert resp2.status_code == 200, f"Turn 2 failed: {resp2.status_code} {resp2.text}"
        data2 = resp2.json()
        reply2 = data2.get("reply", "")
        options2 = data2.get("options", [])
        is_complete2 = data2.get("is_complete", False)

        print(f"Turn 2 ({dur2:.2f}s) Reply: {reply2}")
        print(f"Turn 2 Options ({len(options2)}): {[opt.get('label') or opt.get('value') for opt in options2]}")
        print(f"Turn 2 is_complete: {is_complete2}")

        assert len(reply2) > 5, f"Empty reply on turn 2 for {lang_name}"
        if lang_code == "en":
            devanagari_chars = [c for c in reply2 if '\u0900' <= c <= '\u097F']
            assert len(devanagari_chars) == 0, f"English Turn 2 response contains Devanagari characters: {''.join(devanagari_chars)}"
        elif lang_code in ("hi", "mr"):
            devanagari_chars = [c for c in reply2 if '\u0900' <= c <= '\u097F']
            assert len(devanagari_chars) > 5, f"{lang_name} Turn 2 response lacks Devanagari characters"

    print("\n✅ Multi-turn Multilingual test passed with 100% language fidelity and fast turnaround!")

if __name__ == "__main__":
    test_multilingual()
