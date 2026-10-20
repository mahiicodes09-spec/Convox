import joblib
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
NOTEBOOK_DIR = BASE_DIR.parent / "notebook"

# Spam model bundle
spam_bundle = joblib.load(
    NOTEBOOK_DIR / "spam" / "spam_nb_model.pkl"
)

spam_model = spam_bundle["model"]
spam_vectorizer = spam_bundle["tfidf_vectorizer"]

# Toxic comment model
JIGSAW_DIR = NOTEBOOK_DIR / "jigsaw"

toxic_model = joblib.load(
    JIGSAW_DIR / "toxic_svc_model.pkl"
)

char_vectorizer = joblib.load(
    JIGSAW_DIR / "char_tfidf.pkl"
)

word_vectorizer = joblib.load(
    JIGSAW_DIR / "word_tfidf.pkl"
)

print("Spam model loaded successfully!")
print("Toxic model loaded successfully!")

from scipy.sparse import hstack

def predict_spam(message):
    message_tfidf = spam_vectorizer.transform([message])
    prediction = spam_model.predict(message_tfidf)[0]
    return "Spam" if prediction == 1 else "Normal"


def predict_toxic(message):
    word_features = word_vectorizer.transform([message])
    char_features = char_vectorizer.transform([message])

    features = hstack([word_features, char_features])

    prediction = toxic_model.predict(features)[0]
    return prediction


from scipy.sparse import hstack


def predict_spam(message):
    message_features = spam_vectorizer.transform([message])
    prediction = spam_model.predict(message_features)[0]

    return "Spam" if prediction == 1 else "Normal"


def predict_toxic(message):
    word_features = word_vectorizer.transform([message])
    char_features = char_vectorizer.transform([message])

    # Important: same order as notebook training
    combined_features = hstack(
        [word_features, char_features]
    ).tocsr()

    prediction = toxic_model.predict(combined_features)[0]

    return "Toxic" if prediction == 1 else "Non-Toxic"


test_messages = [
    "Congratulations! You have won a free prize. Click here to claim now.",
    "Thank you for sharing this helpful information.",
    "You are an idiot and nobody wants you here."
]

for message in test_messages:
    print("\nMessage:", message)
    print("Spam model:", predict_spam(message))
    print("Toxic model:", predict_toxic(message))

### CODE FOR STREAMLIT INTERFACE:


import streamlit as st

st.set_page_config(
    page_title="Convox - Message Safety",
    layout="centered"
)

st.title("Convox")
st.subheader("AI-Powered Message Safety Checker")

st.write(
    "Check whether a message is spam or contains toxic language."
)

message = st.text_area(
    "Enter your message",
    placeholder="Type or paste a message here..."
)

if st.button("Check Message"):
    if not message.strip():
        st.warning("Please enter a message first.")
    else:
        spam_result = predict_spam(message)
        toxic_result = predict_toxic(message)

        st.markdown("### Analysis Results")

        col1, col2 = st.columns(2)

        with col1:
            st.markdown("**Spam Detection**")
            if spam_result == "Spam":
                st.error("Spam")
            else:
                st.success("Normal")

        with col2:
            st.markdown("**Toxicity Detection**")
            if toxic_result == "Toxic":
                st.error("Toxic")
            else:
                st.success("Non-Toxic")

