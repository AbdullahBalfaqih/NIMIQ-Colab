# NIMIQ — Security Architecture

## Overview

NIMIQ is a financial application. Security is not optional.

This document describes the security architecture, authentication model, payment verification model, and how to report vulnerabilities.

---

## Authentication Model

- **Protocol**: JWT RS256 (asymmetric — public key can be shared safely)
- **Access tokens**: 15-minute expiry
- **Refresh tokens**: 7-day expiry, stored as SHA-256 hash in DB, rotated on use
- **Password hashing**: Argon2id (64MB memory, 3 iterations, 4 parallelism)
- **Identity resolution**: Always from JWT payload (`req.user`), NEVER from request body

## Authorization Model

Three roles: `OWNER`, `ADMIN`, `MEMBER`

- Every resource lookup includes membership verification
- Role checks are performed against DB records, not client-provided values
- IDOR prevention: groups, goals, payment requests all filter by authenticated user's membership

## Payment Verification Model

```
Frontend                    Backend                 Nimiq Blockchain
   |                           |                          |
   |── POST /payments/verify ──►|                          |
   |                           |── getTransactionByHash ──►|
   |                           |◄─ Transaction data ───────|
   |                           |                          |
   |                           |── Anomaly checks ─────────|
   |                           |   (7 checks, no bypass)  |
   |                           |                          |
   |                           |── BEGIN TRANSACTION ───── |
   |                           |   INSERT transaction      |
   |                           |   UPDATE intent→CONFIRMED |
   |                           |   CREATE contribution     |
   |                           |── COMMIT ─────────────────|
   |◄─ Verified response ──────|                          |
```

**Rule**: Backend NEVER trusts frontend payment status. Always queries blockchain.

## AI Security Model

- AI uses Gemini 2.0 Flash via server-side API call
- All tool execution happens in backend (no direct DB/URL access by model)
- Financial tools return PROPOSALS with 5-minute TTL
- Proposals require explicit user confirmation via bound action ID
- User-generated content sanitized before sending to AI (max 2000 chars, code block prevention)
- Prompt injection defense: tool permissions enforced in backend code, not model instructions

## Secrets Management

- All secrets in environment variables
- JWT private key never logged or exposed to frontend
- Gemini API key server-side only
- No hardcoded credentials anywhere
- `.env` is in `.gitignore`

## Reporting Vulnerabilities

Please report security issues to: security@nimiq-hackathon.example

Do NOT create public GitHub issues for security vulnerabilities.

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (optional)

## Known Limitations

- JWT key rotation not yet implemented
- Rate limiting uses in-memory storage (not distributed — won't work with multiple instances)
- Nimiq RPC connection is HTTP-based (WebSocket support planned)
- AI conversation history is not end-to-end encrypted

## Disclaimer

This software is provided "as is". No warranty of fitness for purpose is expressed or implied. This is a hackathon demonstration project.
