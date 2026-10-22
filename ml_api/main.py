
from pathlib import Path

import joblib
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from scipy.sparse import hstack

app = FastAPI(title="Convox ML API")

# Model paths
BASE_DIR = Path(__file__).resolve().parent.parent
NOTEBOOK_DIR = BASE_DIR / "ml" / "model-1 (mahi)" / "notebook"

# Load spam model and its vectorizer
SPAM_DIR = NOTEBOOK_DIR / "spam"

spam_bundle = joblib.load(SPAM_DIR / "spam_nb_model.pkl")
spam_model = spam_bundle["model"]
spam_vectorizer = spam_bundle["tfidf_vectorizer"]

# Load toxicity model and vectorizers
JIGSAW_DIR = NOTEBOOK_DIR / "jigsaw"

toxic_model = joblib.load(
    JIGSAW_DIR / "toxic_svc_calibrated.pkl"
)
word_vectorizer = joblib.load(JIGSAW_DIR / "word_tfidf.pkl")
char_vectorizer = joblib.load(JIGSAW_DIR / "char_tfidf.pkl")


# Request format
class MessageRequest(BaseModel):
    message: str


# Home endpoint
@app.get("/")
def home():
    return {"message": "Welcome to Convox ML API"}


# Spam prediction
@app.post("/predict/spam")
def predict_spam(request: MessageRequest):
    message = request.message.strip()

    if not message:
        raise HTTPException(
            status_code=400,
            detail="Message cannot be empty."
        )

    features = spam_vectorizer.transform([message])
    prediction = spam_model.predict(features)[0]
    probabilities = spam_model.predict_proba(features)[0]
    classes = list(spam_model.classes_)

    spam_probability = float(probabilities[classes.index(1)])
    normal_index = next(
        i for i, label in enumerate(classes) if label != 1
    )
    normal_probability = float(probabilities[normal_index])

    return {
        "prediction": "Spam" if prediction == 1 else "Normal",
        "spam_probability": spam_probability,
        "normal_probability": normal_probability
    }


# Toxicity prediction
@app.post("/predict/toxicity")
def predict_toxicity(request: MessageRequest):
    message = request.message.strip()

    if not message:
        raise HTTPException(
            status_code=400,
            detail="Message cannot be empty."
        )

    word_features = word_vectorizer.transform([message])
    char_features = char_vectorizer.transform([message])

    combined_features = hstack(
        [word_features, char_features]
    ).tocsr()

    prediction = toxic_model.predict(combined_features)[0]
    probabilities = toxic_model.predict_proba(combined_features)[0]
    classes = list(toxic_model.classes_)

    toxicity_probability = float(
        probabilities[classes.index(1)]
    )
    non_toxic_probability = float(
        probabilities[classes.index(0)]
    )

    return {
        "prediction": "Toxic" if prediction == 1 else "Non-Toxic",
        "toxicity_probability": toxicity_probability,
        "non_toxic_probability": non_toxic_probability
    }
