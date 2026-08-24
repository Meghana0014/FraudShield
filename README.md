# FraudShield

AI-Powered Payment Fraud Detection

## 1. Problem Statement

Online payment flows often expose users to fraud before they notice suspicious activity. Transactions may involve new recipients, unusual locations, risky devices, or unusually large amounts. Without a pre-payment shield, money can move before risk is assessed.

## 2. Our Solution

FraudShield provides a real-time fraud risk assessment for payment transactions before payment is processed. It uses a deterministic risk engine and optionally enhances the explanation with an AI-generated summary when an API key is available.

## 3. Key Features

- AI-powered risk analysis for payment transactions
- Deterministic backend scoring engine
- Explainable risk reasons and recommendations
- Low, medium, and high-risk decisioning
- Demo verification flow for medium-risk transactions
- Razorpay Test Mode checkout flow
- SQLite-based transaction history and stats
- Responsive fintech dashboard

## 4. How It Works

1. User enters payment details in the dashboard.
2. The frontend sends the transaction to the backend API.
3. The backend validates the request.
4. The risk engine calculates a 0–100 score.
5. The AI agent adds a human-readable explanation when available.
6. The system decides whether the payment can continue, needs verification, or should be blocked.
7. For safe transactions, the user can proceed to a Razorpay Test Mode checkout.

## 5. Architecture

The project is structured as a simple full-stack Node.js application with a frontend, backend API, database, and external payment service integration.

## 6. AI Agent

The AI agent is built modularly under the `ai/` folder. It uses a provider pattern so the implementation can change with another model provider later. If no API key is configured, the app falls back to a deterministic explanation generated locally.

## 7. Fraud Detection Methodology

The application assesses the transaction across several risk dimensions including:

- Amount severity
- Recipient familiarity
- Payment method risk
- Frequency of payments
- Device familiarity
- Location risk

The system intentionally avoids claiming that a transaction is definitely fraudulent. It gives a risk assessment and a recommendation based on observed patterns.

## 8. Risk Scoring

The final score is kept between 0 and 100.

- 0–30: Low risk
- 31–70: Medium risk
- 71–100: High risk

## 9. Razorpay Integration

Razorpay is used in Test Mode for this project. The app creates a test order and verifies payment signatures on the backend without exposing secret keys in the frontend.

## 10. Technology Stack

- Frontend: HTML5, CSS3, Vanilla JavaScript
- Backend: Node.js, Express.js
- Database: SQLite
- Payment: Razorpay Test Mode
- AI: Optional external LLM via env-based provider fallback

## 11. Project Structure

- `public/` – frontend assets
- `routes/` – API route organization (not required for this prototype)
- `services/` – transaction and payment helpers
- `ai/` – AI provider and fraud agent
- `database/` – SQLite setup
- `riskEngine.js` – backend scoring logic
- `server.js` – app entry point

## 12. Installation

```bash
npm install
cp .env.example .env
```

Then update `.env` with your local configuration values.

## 13. Environment Variables

```env
PORT=3000
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
AI_API_KEY=
```

Important: keep real secrets out of source control. Do not store them in the repo.

## 14. Running Locally

```bash
npm start
```

Open http://localhost:3000 in the browser.

## 15. API Documentation

### GET /
Returns the frontend application shell.

### GET /api/health
Returns service health status.

### POST /api/analyze
Analyzes a transaction and returns a risk score and decision.

### POST /api/verify
Runs a demo verification step for medium-risk flows.

### POST /api/payment/create-order
Creates a Razorpay test order.

### POST /api/payment/verify
Verifies Razorpay payment signatures.

### GET /api/transactions
Returns transaction history from the local SQLite database.

### GET /api/statistics
Returns total and risk-based summary statistics.

## 16. Screenshots

Add screenshots from your local demo environment to illustrate the dashboard, risk panel, and transaction history.

## 17. Future Improvements

- Add more adaptive fraud models and behavior-based rules
- Improve detection with device fingerprints and IP analysis
- Add user authentication and multi-step approvals
- Connect to a production AI provider with safe fallback logic

## 18. Security Considerations

This project is a demo and should not be treated as production-grade banking fraud detection. It validates incoming requests, avoids frontend trust in risk scores, keeps secrets in environment variables, and avoids storing card details.

## 19. Disclaimer

FraudShield is designed for a hackathon prototype and educational demonstration. It does not provide real financial-grade fraud prevention or legal compliance guarantees.

## 20. Team

- FraudShield Team
- Razorpay Buildathon 2026

---

This project uses Razorpay in Test Mode for demonstration only.
