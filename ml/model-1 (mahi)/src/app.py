
from pathlib import Path

import joblib
import streamlit as st
from scipy.sparse import hstack


# -------------------- PAGE CONFIG --------------------

st.set_page_config(
    page_title="Convox - Message Safety",
    layout="centered",
)

# -------------------- MODEL PATHS --------------------

BASE_DIR = Path(__file__).resolve().parent
NOTEBOOK_DIR = BASE_DIR.parent / "notebook"

# Spam detection model
SPAM_DIR = NOTEBOOK_DIR / "spam"

spam_bundle = joblib.load(
    SPAM_DIR / "spam_nb_model.pkl"
)

spam_model = spam_bundle["model"]
spam_vectorizer = spam_bundle["tfidf_vectorizer"]

# Toxicity detection model
JIGSAW_DIR = NOTEBOOK_DIR / "jigsaw"

toxic_model = joblib.load(
    JIGSAW_DIR / "toxic_svc_calibrated.pkl"
)

word_vectorizer = joblib.load(
    JIGSAW_DIR / "word_tfidf.pkl"
)

char_vectorizer = joblib.load(
    JIGSAW_DIR / "char_tfidf.pkl"
)


# -------------------- SPAM PREDICTION --------------------

def predict_spam(message):
    message_features = spam_vectorizer.transform([message])

    prediction = spam_model.predict(message_features)[0]

    probabilities = spam_model.predict_proba(message_features)[0]
    classes = list(spam_model.classes_)

    if 1 not in classes:
        raise ValueError(
            "Spam class label 1 was not found in the model."
        )

    spam_index = classes.index(1)

    normal_index = next(
        index
        for index, label in enumerate(classes)
        if label != 1
    )

    spam_probability = float(probabilities[spam_index])
    normal_probability = float(probabilities[normal_index])

    result = "Spam" if prediction == 1 else "Normal"

    return result, spam_probability, normal_probability


# -------------------- TOXICITY PREDICTION --------------------

def predict_toxic(message):
    word_features = word_vectorizer.transform([message])
    char_features = char_vectorizer.transform([message])

    combined_features = hstack(
        [word_features, char_features]
    ).tocsr()

    prediction = toxic_model.predict(combined_features)[0]

    probabilities = toxic_model.predict_proba(
        combined_features
    )[0]

    classes = list(toxic_model.classes_)

    toxic_index = classes.index(1)
    non_toxic_index = classes.index(0)

    toxicity_probability = float(
        probabilities[toxic_index]
    )

    non_toxic_probability = float(
        probabilities[non_toxic_index]
    )

    result = "Toxic" if prediction == 1 else "Non-Toxic"

    return result, toxicity_probability, non_toxic_probability


# -------------------- UI --------------------

st.title("Convox")

st.subheader("AI-Powered Message Safety Checker")

st.write(
    "Check whether a message is spam or contains toxic language."
)

message = st.text_area(
    "Enter your message",
    placeholder="Type or paste a message here...",
    height=150,
)

if st.button("Check Message", use_container_width=True):

    if not message.strip():
        st.warning("Please enter a message first.")

    else:
        try:
            spam_result, spam_probability, normal_probability = (
                predict_spam(message)
            )

            (
                toxic_result,
                toxicity_probability,
                non_toxic_probability,
            ) = predict_toxic(message)

            st.markdown("---")
            st.markdown("### Analysis Results")

            col1, col2 = st.columns(2, gap="medium")

            # ---------------- SPAM CARD ----------------

            with col1:
                st.markdown("#### Spam Detection")

                if spam_result == "Spam":
                    st.error("Prediction: Spam")
                else:
                    st.success("Prediction: Normal (Not Spam)")

                st.markdown("**Spam Probability**")

                st.write(
                    f"{spam_probability * 100:.2f}%"
                )

                st.progress(spam_probability)

                st.markdown("**Non-Spam Probability**")

                st.write(
                    f"{normal_probability * 100:.2f}%"
                )

                st.progress(normal_probability)

            # ---------------- TOXICITY CARD ----------------

            with col2:
                st.markdown("#### Toxicity Detection")

                if toxic_result == "Toxic":
                    st.error("Prediction: Toxic")
                else:
                    st.success("Prediction: Non-Toxic")

                st.markdown("**Toxicity Probability**")

                st.write(
                    f"{toxicity_probability * 100:.2f}%"
                )

                st.progress(toxicity_probability)

                st.markdown("**Non-Toxic Probability**")

                st.write(
                    f"{non_toxic_probability * 100:.2f}%"
                )

                st.progress(non_toxic_probability)

        except FileNotFoundError as error:
            st.error(
                f"Model file not found: {error.filename}"
            )

        except (AttributeError, ValueError, KeyError) as error:
            st.error(
                f"Prediction error: {error}"
            )
