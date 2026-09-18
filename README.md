# NColab | Nimiq Colab

[AbdullahBalfaqih/NIMIQ-Colab](https://github.com/AbdullahBalfaqih/NIMIQ-Colab)

[![Nimiq Blockchain](https://img.shields.io/badge/Blockchain-Nimiq_Network-FF5A08?style=for-the-badge&logoColor=white)](https://nimiq.com)
[![AI Operator](https://img.shields.io/badge/AI_Engine-OpenRouter_&_Gemini-FF7A00?style=for-the-badge&logoColor=white)](https://openrouter.ai)
[![Backend Framework](https://img.shields.io/badge/Backend-Fastify_&_Prisma-E65100?style=for-the-badge&logoColor=white)](https://fastify.io)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-D84315?style=for-the-badge&logoColor=white)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-BF360C?style=for-the-badge&logoColor=white)](./LICENSE)

---

## Executive Summary

NColab (Nimiq Colab) is an AI-native group financial coordination protocol and mini app built on the high-throughput, low-fee Nimiq blockchain. It combines multi-party shared vaults, cryptographic goal tracking, autonomous agent reconciliation, and sub-second payment settlement into a unified mobile-first interface.

Groups can pool funds for trips, events, shared housing, or team operations while an integrated AI Operator manages allocations, audits contributions, flags anomalies, and verifies on-chain transaction hashes.

Repository: [AbdullahBalfaqih/NIMIQ-Colab](https://github.com/AbdullahBalfaqih/NIMIQ-Colab)

---

## Problem Statement

Traditional group expense management and shared treasuries suffer from persistent structural inefficiencies:

1. **High Friction and Settlement Delays**: Conventional bank rails and legacy cross-border applications require manual reconciliation, take days to clear, and incur punitive processing fees.
2. **Asymmetric Ledger Visibility**: Centralized fiat split utilities lack cryptographic proof of reserve and rely on manual honor systems that fail during multi-party disputes.
3. **Cognitive Overhead in Reconciliation**: Organizing group splits requires continuous manual ledger math to determine net balances, overdue shares, and individual contributions.
4. **Security Vulnerabilities in Web3 Splits**: Existing Web3 pooling solutions either deploy complex high-gas smart contracts on Ethereum-based layers or lack automated agent verification, leading to failed state updates and replay attacks.

---

## Solution and Added Value

NColab addresses these challenges by merging Nimiq's browser-native blockchain with deterministic backend accounting and conversational AI agent orchestration.

### Key Value Drivers

- **Zero-Friction Settlement**: Utilizes Nimiq micro-transactions for instant settlement with negligible network fees.
- **Deterministic 9-State Payment Machine**: Financial states move through strict cryptographic transitions, eliminating floating-point errors, duplicate submissions, and replay anomalies.
- **Natural Language Financial Intelligence**: Members interact directly with an embedded AI Operator capable of inspecting the shared vault ledger, executing calculations, and answering multi-lingual queries in real time.
- **Dual Verification Architecture**: Client transaction intents are validated by an independent backend verification engine using direct Nimiq RPC queries before updating vault states.
- **Private and Isolated**: Built with zero emoji distractions, modern minimalist UI aesthetics, and enterprise-grade security models (Argon2id hashing, RS256 token rotation, IDOR protections).

---

## Primary Use Cases

### 1. Collaborative Travel and Expeditions
Groups planning international or local journeys can establish target vaults (e.g., Paris Trip). Members contribute their assigned quotas via Nimiq. The AI Operator monitors target progress, alerts non-payers, and presents immediate funding status.

### 2. Household and Shared Living Operations
Roommates coordinate recurring utility payments, rent reserves, and groceries. Individual contributions are credited transparently, preventing disputes over historical disbursements.

### 3. Events, Celebrations, and Gatherings
Organizers create designated budgets for birthdays, weddings, or community gatherings. The protocol ensures that funding quotas are met prior to capital expenditure.

### 4. Decentralized Workgroups and Micro-Grants
Distributed teams allocate and track project bounties, equipment funds, and milestone deliverables with complete audit logs and on-chain verification.

---

## System Architecture

```
[ Client Interface: Mobile-First React / Vite ]
       |
       | HTTPS / WebSocket (JWT RS256 Auth)
       v
[ Application Gateway: Fastify + TypeScript ]
       |
       +---> [ PostgreSQL 16 + Prisma ORM ] (Deterministic Accounting)
       |
       +---> [ OpenRouter / Gemini AI Operator ] (Vault Intelligence & Natural Language)
       |
       +---> [ Nimiq RPC Client ] (On-chain Transaction Hash Verification)
       |
       +---> [ Anomaly & Audit Engine ] (Anti-Replay & Idempotency Sentinel)
```

---

## Repository Structure

```
AbdullahBalfaqih/NIMIQ-Colab
|-- docker-compose.yml              # Container orchestration for PostgreSQL and backend
|-- index.html                      # Application entry point
|-- package.json                    # Root workspace package specification
|-- vite.config.ts                  # Vite bundler configuration
|
|-- src/                            # Frontend Single Page Application
|   |-- App.tsx                     # Top-level shell and screen navigation coordinator
|   |-- main.tsx                    # React DOM bootstrapper
|   |-- index.css                   # Global design tokens and motion keyframes
|   |-- components/                 # Presentation and interaction components
|   |   |-- HomeScreen.tsx          # Primary dashboard, pool tracking, and quick actions
|   |   |-- MembersScreen.tsx       # Member management, categories, and target milestones
|   |   |-- CardsScreen.tsx         # Virtual group card and contactless payment interface
|   |   |-- MarketScreen.tsx        # Ecosystem partners and asset management view
|   |   |-- AiOperatorScreen.tsx    # Conversational AI financial agent interface
|   |   |-- PhoneFrame.tsx          # Adaptive mobile viewport containment frame
|   |   |-- BottomNavBar.tsx        # Navigation dock with persistent state preservation
|   |   `-- NColabLogo.tsx          # Scalable vector branding asset
|   |-- services/                   # Frontend API and integration drivers
|   |   `-- api.ts                  # Typed HTTP client communicating with backend
|   `-- types/                      # Shared frontend data contracts
|
|-- server/                         # Backend Application Server
|   |-- Dockerfile                  # Production container packaging
|   |-- package.json                # Server dependency manifest
|   |-- tsconfig.json               # Backend TypeScript configuration
|   |-- vitest.config.ts            # Automated testing harness configuration
|   |-- prisma/                     # Database layer
|   |   |-- schema.prisma           # Relational schema (Users, Groups, Payments, Audits)
|   |   `-- seed.ts                 # Database seeding fixture
|   `-- src/                        # Core backend codebase
|       |-- server.ts               # Fastify server bootstrapper and route registrations
|       |-- modules/                # Domain-driven feature modules
|       |   |-- ai/                 # OpenRouter/Gemini tool-calling and prompt runtime
|       |   |-- anomaly/            # Fraud detection, duplicate tx, and replay mitigation
|       |   |-- audit/              # Immutable append-only audit trail logger
|       |   |-- auth/               # Argon2id hashing and RS256 token lifecycle
|       |   |-- goals/              # Target milestones and progress calculation
|       |   |-- groups/             # Multi-tenant group vault management
|       |   |-- payments/           # State-machine payments and Nimiq RPC verification
|       |   `-- transactions/       # Transaction history and ledger records
|       |-- common/                 # Utilities, integer money helpers, and error handlers
|       `-- tests/                  # Unit and integration test suites
|
|-- SECURITY.md                     # Security vulnerability disclosure and contact policy
|-- SECURITY_REVIEW.md              # Penetration testing notes and threat mitigation
|-- THREAT_MODEL.md                 # Formal STRIDE threat assessment
`-- LICENSE                         # Open-source MIT license
```

---

## Core Capabilities

### 1. Cryptographic Payment Verification
Every financial contribution initiates a pre-authenticated payment intent. The user signs the transfer using their Nimiq wallet, and the resulting transaction hash is submitted to `/api/payments/verify`. The backend queries the Nimiq network directly to confirm transaction validity, block depth, recipient address, and exact integer amount before updating the pool balance.

### 2. AI Operator Engine
The embedded AI Operator operates on structured context extracted from the active vault. It handles multi-turn dialogues, answers balance inquiries, calculates percentage shares, and assists in adding members or targets without exposing private keys or executing unverified financial mutations.

### 3. Financial Integrity and Anomaly Prevention
- **Fixed-Point Integer Accounting**: All balance calculations operate in integer units (Luna / cents) to prevent floating-point inaccuracies.
- **Idempotency**: API endpoints accept idempotency keys to safeguard against duplicated network submissions.
- **State Machine Enforcement**: State transitions strictly follow:
  `PREPARED -> SUBMITTED -> DETECTED -> CONFIRMED -> SETTLED`. Invalid transitions are rejected immediately.

---

## API Specification

| HTTP Method | Endpoint Path | Functionality |
|---|---|---|
| POST | `/api/auth/register` | Register a new user identity |
| POST | `/api/auth/login` | Authenticate and obtain RS256 access/refresh tokens |
| GET | `/api/groups` | Retrieve vaults associated with authenticated user |
| POST | `/api/groups` | Initialize a new group vault |
| GET | `/api/groups/:id` | Fetch specific vault details and participant roster |
| POST | `/api/groups/:id/members` | Enroll a member into a designated vault |
| GET | `/api/groups/:id/progress` | Calculate aggregate progress toward defined target |
| POST | `/api/payments/prepare` | Issue a pre-validated payment intent |
| POST | `/api/payments/verify` | Independently verify on-chain Nimiq transaction |
| POST | `/api/ai/chat` | Send prompt to conversational AI financial operator |
| GET | `/health` | System health check and liveness probe |

---

## Local Development and Setup

### Prerequisites
- Node.js version 20.x or higher
- npm version 10.x or higher
- Docker and Docker Compose (optional for containerized PostgreSQL)

### 1. Clone the Repository
```bash
git clone https://github.com/AbdullahBalfaqih/NIMIQ-Colab.git
cd NIMIQ-Colab
```

### 2. Configure Environment Variables
Create the server environment configuration:
```bash
cp server/.env.example server/.env
```

Ensure the following variables are configured:
```env
PORT=3000
DATABASE_URL="postgresql://colab_user:colab_secret@localhost:5433/colab_db?schema=public"
OPENROUTER_API_KEY="your-openrouter-api-key"
NIMIQ_NETWORK="testnet"
NIMIQ_RPC_URL="https://rpc.testnet.nimiq.watch"
ALLOWED_ORIGINS="http://localhost:5173,http://localhost:5174"
```

### 3. Database Initialization
Start the PostgreSQL instance:
```bash
docker-compose up postgres -d
```

Apply migrations and generate Prisma bindings:
```bash
cd server
npm install
npx prisma migrate dev --name init
npm run db:seed
```

### 4. Launch Backend Service
```bash
npm run dev
```
The server will bind to `http://localhost:3000`.

### 5. Launch Frontend Application
From the workspace root directory:
```bash
npm install
npm run dev
```
Access the client application at `http://localhost:5173` or `http://localhost:5174`.

---

## Verification and Testing

Run the automated test suite covering integer math, state machine transitions, and anomaly defenses:

```bash
cd server
npm test
```

Build validation for client assets:

```bash
npm run build
```

---

## Security Model

For complete documentation on cryptographic controls, threat boundaries, and audit guidelines, refer to:
- [SECURITY.md](./SECURITY.md)
- [THREAT_MODEL.md](./THREAT_MODEL.md)
- [SECURITY_REVIEW.md](./SECURITY_REVIEW.md)

---

## License

This project is open-source software licensed under the [MIT License](./LICENSE).

Maintained by [AbdullahBalfaqih](https://github.com/AbdullahBalfaqih) | [AbdullahBalfaqih/NIMIQ-Colab](https://github.com/AbdullahBalfaqih/NIMIQ-Colab)
