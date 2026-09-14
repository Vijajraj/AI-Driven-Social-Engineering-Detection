# AI-Driven Social Engineering Detection

An explainable, hybrid machine learning and LLM detector designed to classify social engineering attacks (Phishing, Impersonation, Urgency Manipulation, Baiting, and Pretexting).

It integrates a **deterministic rule engine** and a **TF-IDF feature pipeline** with an **XGBoost classifier**, **SHAP (SHapley Additive exPlanations)** feature attribution, a **Groq LLM reasoning layer** (`llama-3.3-70b-versatile`), an **asyncpg database connection pool to Neon PostgreSQL** for persistence, a **React 18 Web Dashboard**, and a **Manifest V3 Chrome Extension** for Gmail, WhatsApp Web, and Instagram.

---

## System Architecture

```mermaid
graph TD
    User[User / Selection Target] --> Web[React 18 Web Dashboard localhost:5173]
    User --> Ext[Manifest V3 Chrome Extension Gmail / WhatsApp / Instagram]
    Web & Ext --> API[FastAPI Backend Endpoint /analyze localhost:8000]
    API --> RateLimit[IP Rate Limiter 20 req/hour]
    RateLimit --> Pre[Preprocessor & 12 Handcrafted Rules]
    Pre --> ML[TF-IDF Vectorizer & XGBoost Classifier]
    ML --> SHAP[SHAP TreeExplainer Feature Importance]
    ML & SHAP & Pre --> Groq[Groq LLM Reasoning Layer llama-3.3-70b]
    Groq --> Explanation[Human-Readable 2-3 Sentence Explanation]
    ML & SHAP & Explanation --> Neon[Async Database Save to Neon PostgreSQL]
    Explanation & Neon --> Response[JSON Response / Shadow DOM Popover]
```

---

## Visualizations & Model Performance

The detector was trained on a balanced corpus of **17,989 rows** (~3,000 samples per class) consisting of email/SMS data and synthetically generated social engineering attack vectors. It achieved a **Test F1 Macro of 99.14%**.

### 1. Dataset Class Balance
The dataset is balanced across 6 target classes to prevent prediction bias.

![Class Distribution](assets/class_distribution.png)

### 2. Word Length Distribution per Class
Long-form emails (benign & phishing) display wide length variation, while synthetic attack classes are compact (20–30 words).

![Word Length Distribution](assets/word_length_dist.png)

### 3. Confusion Matrix
The XGBoost model exhibits high classification precision with virtually zero confusion between benign, phishing, and the four social engineering attack vectors.

![Confusion Matrix](assets/confusion_matrix.png)

### 4. Global SHAP Feature Importance
The top 20 features ranked by their absolute SHAP impact values. It illustrates how the model prioritizes structural rule indicators alongside contextual TF-IDF tokens.

![SHAP Importance](assets/shap_summary.png)

---

## Directory Structure

```
social-engineering-detector/
├── api/                            # FastAPI Backend API
│   ├── main.py                     # app entrypoint with lifespan startup & CORS
│   ├── rate_limiter.py             # IP rate limiter (20 req/hour window)
│   ├── dependencies.py             # cached detector singleton loader
│   ├── schemas.py                  # Pydantic request & response models
│   └── routes/
│       ├── health.py               # GET /health, GET /metadata
│       ├── analyze.py              # POST /analyze
│       └── history.py              # GET /history
├── web/                            # React 18 Web Dashboard
│   ├── src/
│   │   ├── components/             # RiskGauge, ShapChart, AttackTypeBadge, HistoryTable, etc.
│   │   ├── App.jsx                 # Tabbed dashboard layout (Analyze | History Log)
│   │   └── main.jsx                # QueryClientProvider & React entrypoint
│   ├── index.html
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── package.json
├── extension/                      # Manifest V3 Chrome Extension
│   ├── manifest.json               # MV3 config with host permissions
│   ├── background.js               # service worker relay & session storage rate limiting
│   ├── popover-helper.js           # Shadow DOM isolated popover renderer
│   ├── content-gmail.js            # Gmail selection detection content script
│   ├── content-whatsapp.js         # WhatsApp Web selection content script
│   ├── content-instagram.js        # Instagram DMs & Comments selection content script
│   ├── content.css                 # floating button styles
│   ├── popup.html                  # browser action popup UI
│   ├── popup.js                    # manual text paste inspector
│   └── popup.css
├── llm/
│   └── reasoning_chain.py          # ChatGroq llama-3.3-70b explanation chain + fallback
├── db/
│   ├── client.py                   # asyncpg database connection pool to Neon
│   ├── migrations.py               # auto-migrates `analyses` table on startup
│   └── queries.py                  # async database insert & history query functions
├── detector/                       # Core ML detector
│   ├── __init__.py                 # exports analyze() and DetectionResult
│   ├── preprocessor.py             # text cleaning, entity extraction & length limits
│   ├── rule_engine.py              # extracts 12 handcrafted rule features
│   ├── classifier.py               # wrapper singleton integrating XGBoost and SHAP
│   └── model/                      # saved model artifacts (gitignored)
│       ├── xgb_model.pkl
│       ├── tfidf_vectorizer.pkl
│       └── metadata.json
├── training/                       # Dataprep, EDA & training scripts
│   ├── data_prep.py
│   ├── eda.py
│   ├── features.py
│   ├── train.py
│   ├── evaluate.py
│   └── run_shap.py
├── assets/                         # committed visualization plots
│   ├── class_distribution.png
│   ├── word_length_dist.png
│   ├── confusion_matrix.png
│   └── shap_summary.png
├── tests/                          # full automated test suite
│   ├── test_detector.py            # ML module smoke tests
│   ├── test_reasoning.py           # Groq LLM chain tests
│   └── test_api.py                 # Async API endpoint & rate limiting tests
├── .env                            # GROQ_API_KEY, DATABASE_URL, CORS_ORIGINS
├── .env.example                    # committed environment template
├── requirements.txt
└── README.md
```

---

## Setup & Local Execution

### 1. Environment Setup
```bash
# Clone the repository
git clone https://github.com/Vijajraj/AI-Driven-Social-Engineering-Detection.git
cd AI-Driven-Social-Engineering-Detection

# Create & activate Python virtual environment
python -m venv .venv
.\.venv\Scripts\activate

# Install Python backend dependencies
pip install -r requirements.txt

# Install Web Dashboard dependencies
cd web
npm install
cd ..
```

### 2. Configure Environment Variables (`.env`)
Create a `.env` file in the root directory (refer to `.env.example`):
```env
# Groq API — https://console.groq.com
GROQ_API_KEY=your_groq_api_key_here

# Neon PostgreSQL Connection DSN
DATABASE_URL=postgresql://user:password@ep-xxx.neon.tech/neondb?sslmode=require

# Allowed CORS origins
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

### 3. Run FastAPI Backend Server (`localhost:8000`)
Open Terminal 1:
```bash
$env:PYTHONPATH="."
uvicorn api.main:app --reload --port 8000
```
* **API Server**: [http://localhost:8000](http://localhost:8000)
* **Swagger Interactive Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)

### 4. Run React Web Dashboard (`localhost:5173`)
Open Terminal 2:
```bash
cd web
npm run dev
```
* **Web Dashboard**: [http://localhost:5173](http://localhost:5173)

### 5. Load Chrome Extension in Browser
1. Open Google Chrome and navigate to `chrome://extensions`.
2. Enable **Developer mode** (toggle in the top right).
3. Click **Load unpacked** and select the folder:
   `c:\projects\social-engineering-detector\extension`
4. Highlight any message in Gmail, WhatsApp Web, or Instagram to inspect via the floating button, or click the extension icon to paste text manually.

### 6. Run Automated Test Suite
```bash
$env:PYTHONPATH="."
pytest tests/ -v
```

---

## Rate Limiting Specification

The `POST /analyze` endpoint enforces an **IP-based rate limit of 20 requests per hour (3,600 seconds)** with a 1-hour cooldown.

When exceeded, the server returns an HTTP `429 Too Many Requests` status:
```json
{
  "detail": {
    "error": "rate_limited",
    "message": "Analysis limit reached (20 checks per hour). Try again later.",
    "retry_after_seconds": 3600
  }
}
```
Both the React Web Dashboard and Chrome Extension popovers explicitly parse `retry_after_seconds` and render a live countdown banner.

---

## API Endpoint Reference

### 1. Analyze Message (`POST /analyze`)
Analyzes raw message text, returns ML prediction metrics, SHAP top features, Groq LLM reasoning, and saves the analysis record to Neon PostgreSQL.

**Request:**
```json
POST /analyze
Content-Type: application/json

{
  "text": "URGENT: Your HDFC bank account has been suspended. Click http://hdfc.com/verify to restore access immediately.",
  "source": "sms"
}
```

**Response (200 OK):**
```json
{
  "label": "phishing",
  "confidence": 0.9856,
  "risk_score": 98,
  "all_probabilities": {
    "benign": 0.0013,
    "phishing": 0.9856,
    "impersonation": 0.0026,
    "urgency_manipulation": 0.0032,
    "baiting": 0.001,
    "pretexting": 0.0063
  },
  "shap_top_features": [
    { "feature": "verify", "impact": 0.462 },
    { "feature": "paliourg", "impact": 0.702 },
    { "feature": "rolex", "impact": 0.6063 }
  ],
  "rule_signals": {
    "url_count": 1.0,
    "urgency_score": 0.091,
    "brand_mention_count": 2.0,
    "is_short": 1.0
  },
  "llm_reasoning": "This message was flagged because it contains a suspicious URL and uses words like 'verify' that are commonly used in scams to trick people into revealing sensitive information.",
  "analysis_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

### 2. Get Analysis History (`GET /history`)
Fetches past analysis logs stored in Neon PostgreSQL.

**Request:**
```
GET /history?limit=20&label=phishing
```

**Response:**
```json
{
  "analyses": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "created_at": "2026-07-25T10:11:45.123456+00:00",
      "source": "sms",
      "label": "phishing",
      "confidence": 0.9856,
      "risk_score": 98,
      "llm_reasoning": "This message was flagged because it contains a suspicious URL..."
    }
  ],
  "total": 1
}
```

### 3. Health & Metadata (`GET /health`, `GET /metadata`)
* `GET /health`: Returns service operational status and model version.
* `GET /metadata`: Returns model training metrics, label names, feature counts, and test F1 macro scores.

---

## Python Module API Usage

You can also import and run the detector module natively in Python applications:

```python
from detector import analyze

text = "Hi team, just a reminder that the sprint review is tomorrow at 3pm."
result = analyze(text)

print("Label:", result.label)            # benign
print("Confidence:", result.confidence)   # 0.95
print("Risk Score:", result.risk_score)   # 19 (low risk)
print("SHAP Features:", result.shap_top_features)
```
