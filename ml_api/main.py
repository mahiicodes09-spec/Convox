
from pathlib import Path

import joblib
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from scipy.sparse import hstack


app = FastAPI(title="Convox ML API")

# Model paths
BASE_DIR = Path(__file__).resolve().parent.parent
NOTEBOOK_DIR = BASE_DIR / "ml" / "model-1 (mahi)" / "notebook"

# Load spam model and vectorizer
SPAM_DIR = NOTEBOOK_DIR / "spam"

spam_bundle = joblib.load(SPAM_DIR / "spam_nb_model.pkl")
spam_model = spam_bundle["model"]
spam_vectorizer = spam_bundle["tfidf_vectorizer"]

# Load toxicity model and vectorizers
JIGSAW_DIR = NOTEBOOK_DIR / "jigsaw"

toxic_model = joblib.load(JIGSAW_DIR / "toxic_svc_calibrated.pkl")
word_vectorizer = joblib.load(JIGSAW_DIR / "word_tfidf.pkl")
char_vectorizer = joblib.load(JIGSAW_DIR / "char_tfidf.pkl")

# Load PII model, vectorizer, threshold, and label mapping
PII_DIR = BASE_DIR / "ml" / "model-2"

identity_bundle = joblib.load(PII_DIR / "identity_pii_model.joblib")
identity_model = identity_bundle["model"]
identity_vectorizer = identity_bundle["vectorizer"]
identity_threshold = float(identity_bundle["threshold"])
identity_label_mapping = identity_bundle["label_mapping"]


class MessageRequest(BaseModel):
    message: str


@app.get("/")
def home():
    return {"message": "Welcome to Convox ML API"}


@app.post("/predict")
def predict_message(request: MessageRequest):
    message = request.message.strip()

    if not message:
        raise HTTPException(
            status_code=400,
            detail="Message cannot be empty."
        )

    # Spam prediction
    spam_features = spam_vectorizer.transform([message])
    spam_prediction = spam_model.predict(spam_features)[0]
    spam_probabilities = spam_model.predict_proba(spam_features)[0]
    spam_classes = list(spam_model.classes_)

    spam_probability = float(
        spam_probabilities[spam_classes.index(1)]
    )
    normal_index = next(
        i for i, label in enumerate(spam_classes) if label != 1
    )
    normal_probability = float(spam_probabilities[normal_index])

    # Toxicity prediction
    word_features = word_vectorizer.transform([message])
    char_features = char_vectorizer.transform([message])
    combined_features = hstack(
        [word_features, char_features]
    ).tocsr()

    toxic_prediction = toxic_model.predict(combined_features)[0]
    toxic_probabilities = toxic_model.predict_proba(combined_features)[0]
    toxic_classes = list(toxic_model.classes_)

    toxicity_probability = float(
        toxic_probabilities[toxic_classes.index(1)]
    )
    non_toxic_probability = float(
        toxic_probabilities[toxic_classes.index(0)]
    )

    # PII prediction
    identity_features = identity_vectorizer.transform([message])
    identity_probabilities = identity_model.predict_proba(identity_features)[0]
    identity_classes = list(identity_model.classes_)

    pii_probability = float(
        identity_probabilities[identity_classes.index(1)]
    )
    pii_prediction = int(pii_probability >= identity_threshold)

    pii_label = next(
        label
        for label, class_id in identity_label_mapping.items()
        if class_id == pii_prediction
    )

    # Return all three results
    return {
        "message": message,
        "spam_detection": {
            "prediction": "Spam" if spam_prediction == 1 else "Normal",
            "spam_probability": spam_probability,
            "normal_probability": normal_probability
        },
        "toxicity_detection": {
            "prediction": "Toxic" if toxic_prediction == 1 else "Non-Toxic",
            "toxicity_probability": toxicity_probability,
            "non_toxic_probability": non_toxic_probability
        },
        "pii_detection": {
            "prediction": pii_label,
            "pii_probability": pii_probability,
            "no_pii_probability": 1.0 - pii_probability,
            "threshold": identity_threshold
        }
    }