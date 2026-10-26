# Machine Learning
This folder contains AI moderation and ML code.

STREAMLIT deployed url : https://convox.streamlit.app/
 

### Spam Detection and Toxicity Detection ML API is deployed and tested successfully.

**API Details**
- Base URL: https://convox-ml-api.onrender.com
- Endpoint: `POST /predict`
- Full endpoint: https://convox-ml-api.onrender.com/predict
- API docs: https://convox-ml-api.onrender.com/docs

**Request Body (JSON):**
```json
{
  "message": "Your message text here"
}
```

**Response:** The API returns both `spam_detection` and `toxicity_detection`, including their predictions and probabilities.

Please integrate this endpoint into the message moderation flow so that a message can be checked for spam and toxicity in a single API request.