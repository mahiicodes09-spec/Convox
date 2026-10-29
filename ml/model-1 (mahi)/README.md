# Machine Learning

This folder contains AI moderation and ML code.

## Streamlit App

- Streamlit deployed URL: https://convox.streamlit.app/

## Spam Detection and Toxicity Detection API

The API is deployed and tested successfully.

**API Details**
- Base URL: `https://convox-ml-api.onrender.com`
- Endpoint: `POST /predict`
- Full endpoint: `https://convox-ml-api.onrender.com/predict`
- API documentation: https://convox-ml-api.onrender.com/docs

**Request Body (JSON):**
```json
{
  "message": "Your message text here"
}
```

**Response:** The API returns both `spam_detection` and `toxicity_detection`, including their predictions and probabilities.

Please integrate this endpoint into the message moderation flow so that a message can be checked for spam and toxicity in real time.