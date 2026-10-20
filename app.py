from pathlib import Path

import joblib
import nltk
import streamlit as st
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
from nltk.tokenize import word_tokenize


ROOT_DIR = Path(__file__).resolve().parent
MODEL_DIR = ROOT_DIR / "ml" / "model-2"


st.set_page_config(
    page_title="Community Text Safety Checker",
    page_icon="🛡️",
    layout="wide",
)

st.title("Community Text Safety and Privacy Checker")
st.write(
    "Check a comment, SMS, or document for toxicity, spam, and personal information."
)

@st.cache_resource
def load_models():
    paths = {
        "toxicity": MODEL_DIR / "toxicity_model.joblib",
        "spam": MODEL_DIR / "spam_model.joblib",
        "pii": MODEL_DIR / "identity_pii_model.joblib",
    }

    missing = [str(path) for path in paths.values() if not path.exists()]
    if missing:
        raise FileNotFoundError(
            "Model file(s) not found:\n" + "\n".join(missing)
        )

    return {
        name: joblib.load(path)
        for name, path in paths.items()
    }


@st.cache_resource
def load_text_tools():
    resources = [
        ("tokenizers/punkt_tab", "punkt_tab"),
        ("corpora/stopwords", "stopwords"),
        ("corpora/wordnet", "wordnet"),
    ]

    for resource_path, package_name in resources:
        try:
            nltk.data.find(resource_path)
        except LookupError:
            if not nltk.download(package_name, quiet=True):
                raise RuntimeError(
                    f"Could not download the NLTK resource: {package_name}"
                )

    toxicity_stop_words = set(stopwords.words("english")) - {
        "no", "nor", "not"
    }
    spam_stop_words = set(stopwords.words("english")) - {
        "no", "nor", "not", "n't", "you", "your", "now", "to"
    }

    return {
        "toxicity_stop_words": toxicity_stop_words,
        "spam_stop_words": spam_stop_words,
        "lemmatizer": WordNetLemmatizer(),
    }


def prepare_toxicity_text(text, tools):
    tokens = word_tokenize(str(text).lower())
    tokens = [
        tools["lemmatizer"].lemmatize(token)
        for token in tokens
        if token.isalpha() and token not in tools["toxicity_stop_words"]
    ]
    return " ".join(tokens)


def prepare_spam_text(text, tools):
    tokens = word_tokenize(str(text).lower())
    tokens = [
        tools["lemmatizer"].lemmatize(token)
        for token in tokens
        if (token.isalnum() or token == "n't")
        and token not in tools["spam_stop_words"]
    ]
    return " ".join(tokens)


def positive_probability(model, features):
    positive_index = list(model.classes_).index(1)
    return float(model.predict_proba(features)[0, positive_index])


text = st.text_area(
    "Enter text to analyze",
    height=220,
    placeholder="Paste a comment, SMS, or document here...",
)

if st.button("Analyze text", type="primary"):
    if not text.strip():
        st.error("Enter some text before running the models.")
    else:
        try:
            with st.spinner("Loading models and analyzing the text..."):
                models = load_models()
                text_tools = load_text_tools()

                # Spam prediction
                spam_bundle = models["spam"]
                processed_sms = prepare_spam_text(text, text_tools)
                spam_features = spam_bundle["vectorizer"].transform(
                    [processed_sms]
                )
                spam_probability = positive_probability(
                    spam_bundle["model"], spam_features
                )
                spam_threshold = float(spam_bundle["threshold"])
                is_spam = spam_probability >= spam_threshold

                # PII prediction
                pii_bundle = models["pii"]
                pii_features = pii_bundle["vectorizer"].transform([text])
                pii_probability = positive_probability(
                    pii_bundle["model"], pii_features
                )
                pii_threshold = float(pii_bundle["threshold"])
                has_pii = pii_probability >= pii_threshold

                # Toxicity prediction
                toxicity_bundle = models["toxicity"]
                processed_comment = prepare_toxicity_text(text, text_tools)
                toxicity_features = toxicity_bundle["vectorizer"].transform(
                    [processed_comment]
                )
                category_probabilities = toxicity_bundle["model"].predict_proba(
                    toxicity_features
                )

                toxicity_rows = []
                flagged_categories = []

                for index, label in enumerate(toxicity_bundle["label_columns"]):
                    probability = float(category_probabilities[index][0, 1])
                    threshold = float(toxicity_bundle["thresholds"][label])
                    flagged = probability >= threshold

                    if flagged:
                        flagged_categories.append(label)

                    toxicity_rows.append(
                        {
                            "Category": label.replace("_label", "").replace(
                                "_", " "
                            ).title(),
                            "Probability": f"{probability:.1%}",
                            "Cutoff": f"{threshold:.1%}",
                            "Flagged": "Yes" if flagged else "No",
                        }
                    )

            st.subheader("Results")
            spam_col, pii_col, toxicity_col = st.columns(3)

            with spam_col:
                st.markdown("### Spam")
                st.metric(
                    "Prediction",
                    "Spam" if is_spam else "Ham",
                    f"{spam_probability:.1%} spam probability",
                )
                st.caption(f"Decision cutoff: {spam_threshold:.1%}")

            with pii_col:
                st.markdown("### Personal information")
                st.metric(
                    "Prediction",
                    "PII detected" if has_pii else "No PII detected",
                    f"{pii_probability:.1%} PII probability",
                )
                st.caption(f"Decision cutoff: {pii_threshold:.1%}")

            with toxicity_col:
                st.markdown("### Toxicity")
                st.metric(
                    "Prediction",
                    "Toxicity detected" if flagged_categories else "No toxicity detected",
                    f"{len(flagged_categories)} categories flagged",
                )

            st.markdown("### Toxicity category details")
            st.table(toxicity_rows)

            if flagged_categories:
                st.write(
                    "Flagged categories: "
                    + ", ".join(
                        label.replace("_label", "").replace("_", " ")
                        for label in flagged_categories
                    )
                )

        except Exception as error:
            st.error(f"Could not analyze the text: {error}")