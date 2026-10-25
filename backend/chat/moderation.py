import json
import urllib.request
from django.conf import settings


def ask_ml_service(text):
    body = json.dumps({"message": text}).encode()
    request = urllib.request.Request(
        settings.ML_SERVICE_URL,
        data=body,
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(request, timeout=settings.ML_TIMEOUT_SECONDS) as response:
        return json.loads(response.read())


def moderate(text):
    # ML service nahi hai ya error aaya to message ruke nahi, bas "unchecked" rahe
    if not settings.ML_SERVICE_URL:
        return {"moderation_status": "unchecked"}
    try:
        data = ask_ml_service(text)
        toxic_score = float(data["toxicity_detection"]["toxicity_probability"])
        spam_score = float(data["spam_detection"]["spam_probability"])
    except Exception:
        return {"moderation_status": "unchecked"}

    if toxic_score >= settings.TOXICITY_THRESHOLD:
        label, score = "toxic", toxic_score
    elif spam_score >= settings.SPAM_THRESHOLD:
        label, score = "spam", spam_score
    else:
        label, score = "non-toxic", toxic_score

    return {
        "moderation_status": "clean" if label == "non-toxic" else "flagged",
        "toxicity_label": label,
        "toxicity_score": round(score, 4),
        "model_version": settings.ML_MODEL_VERSION,
    }
