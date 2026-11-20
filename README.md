# FDE-BANKOPS: Forward Deployed AI Context Engineering & SAMA Banking FinTech Lab (Project #99)

> **Exclusive Architect & Lead Systems Engineer:** **أ. طارق ابوعشي | Tareq Abuashi — Forward Deployed AI & FinTech Systems Engineer**  
> **Program Alignment:** Tuwaiq Academy **Forward Deployed Engineer (FDE)** Bootcamp & **Alinma Bank Future Bankers (مصرفيي المستقبل - مصرف الإنماء)**

---

## Executive Overview

**FDE-BANKOPS** is an interactive, zero-dependency in-browser FinTech AI Systems Engineering & Forward Deployed Engineering (FDE) simulation studio. It models how enterprise AI engineers deploy, monitor, secure, and explain real-time banking LLM & ML decision systems inside Saudi private-cloud banking infrastructures aligned with **SAMA** regulatory frameworks.

---

## Core Architectural Pillars

### 1. Forward Deployed Context Engineering & Zero-PII Guardrail (`src/engine/fdeEngine.ts`)
- **Live Banking Sources Integration:** Connects `Core Banking REST API`, `ISO 20022 SARIE / SWIFT Feed`, `KYC / AML Graph`, and `SAMA Policy Vector Store` into a deterministic LLM decision context.
- **Prompt Context Inspector:** Live inspectable assembly of System Directive, Zero-PII Masked Banking Payload, SAMA Vector Chunks, and Pydantic Schema Contract.
- **Token Budget Telemetry:** Real-time breakdown across system, source, vector RAG, and schema tokens inside a 32,768-token budget.
- **Zero-PII Masking Vault:** Redacts IBAN, National ID / Iqama, Card PAN, and MSISDN prior to LLM Context Router ingress (`PDPL-ART-11`).
- **Strict Schema Validation:** Enforces `BankingDecisionV2` (`JSON Schema / Pydantic v2`) output validation.

### 2. Client VPC Docker Container Telemetry Grid (`src/engine/fdeEngine.ts`)
Live monitoring and interactive **Restart** / **Scale +1** operations across 5 client-deployed containers:
- `fde-context-router:v2.4`
- `fraud-xgboost-engine:v3.1`
- `sama-aml-compliance:v1.9`
- `pgvector-kyc-store:16`
- `redis-velocity-cache:7.2`

Tracks `CPU %`, `RAM MB`, `REST P95 Latency (ms)`, replica count, and `HTTP 200 / 429 / 503` status codes.

### 3. Real-Time Banking Rails & 60fps SHAP Explainability Canvas (`src/components/BankingCanvas.ts`)
- **60fps Canvas 2D Stream:** Visualizes live transactions across `SARIE Instant Wire`, `Corporate Treasury`, `Mada POS`, and `Murabaha Credit` with `<18 ms` inference SLA.
- **SHAP Feature Attribution Waterfall:** Smoothly animates Shapley values ($\phi_i$) for `Velocity Z-Score`, `Geo/Device Drift`, `Beneficiary Graph Risk`, and `Amount vs 90d Baseline` to explain every `APPROVED` or `BLOCKED` verdict.

### 4. Credit Risk Underwriting (`IFRS-9 / Basel III`) & SAMA / AML Compliance (`src/engine/creditCompliance.ts`)
- **Interactive Murabaha Calculator:** Computes `PD %`, `LGD %`, `EAD`, `IFRS-9 ECL`, `Basel III RWA`, and `SAMA DTI %`, issuing `Murabaha Tier-A Approved`, `Manual Underwriting`, or `Declined`.
- **Saudi Regulatory Compliance Matrix:** Continuously audits `SAMA CSF Controls`, `AML Rule 40 (Structuring/Smurfing)`, `FATF Travel Rule`, and `Zero-PII LLM Guardrail`, with one-click **SAMA FIU / SAFIU STR Payload** generation.

### 5. FDE & Banking Fault Injection Lab
- **Account Takeover & SAR 480,000 Wire Anomaly** (Risk `96/100`, SHAP spikes, instant block + STR).
- **AML Structuring / Smurfing Ring (Multi-Account)** (6 × `SAR 49,500` split transfers below the `SAR 50,000` reporting cap).
- **Core-Banking REST API Latency Spike (HTTP 503)** (Trips Circuit Breaker `OPEN`, fails over to `redis-velocity-cache:7.2` Semantic Cache, and auto-scales `fde-context-router:v2.4` from `1x` to `3x`).
- **Corporate Credit Risk Underwriting Case** (`SAR 850,000` SME Murabaha facility).

---

## Tech Stack & Local Development

- **TypeScript 5.9 (Strict Mode)** + **Vite 7.3**
- **HTML5 Canvas 2D (60fps)** & **Web Audio API** synthesizer
- **Dark Glassmorphism Design System** (`#060913`, `Outfit` + `Fira Code`)

```bash
npm run dev
npm run build
```

---

## Author & Attribution

**أ. طارق ابوعشي | Tareq Abuashi — Forward Deployed AI & FinTech Systems Engineer**
