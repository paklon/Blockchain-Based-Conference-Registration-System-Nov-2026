# 🛡️ Blockchain-Based Conference Registration & Attendance System

A decentralized, full-stack conference registration and attendance verification application built with **Go (Gin)** and **React (TypeScript)**. Developed for **DSAI4202**, this system enforces tamper-proof student check-ins via **RSA-PKCS#1 v1.5 digital signatures**, **SHA-256 Proof-of-Work (PoW)** mining, and a **Bitcoin-inspired dynamic difficulty adjustment algorithm**.

---

## ✨ Core Features

1. **Attendee Registration & Wallet Generation (`/api/generate-keys`, `/api/register`)**
   - Generates 1024-bit RSA public-private key pairs in PEM format.
   - Commits attendee identity (`ID`, `Name`, `Email`) and `Public Key` to the blockchain while keeping the `Private Key` in the attendee's local wallet.
2. **Cryptographic Attendance Check-In (`/api/attendance`)**
   - Attendees sign attendance certificates (`attendee_id`, `session_id`, `timestamp`) using their private key.
   - The backend acts as a cryptographic gatekeeper—verifying RSA-PKCS#1 v1.5 signatures against registered public keys using SHA-256 message digests before allowing records into the pending transaction pool.
3. **Proof-of-Work Mining & Dynamic Difficulty (`/api/mine`)**
   - Packages verified registration and attendance transactions into candidate blocks and solves SHA-256 leading-zero cryptographic puzzles.
   - **Dynamic Difficulty Adjustment**: Evaluates block generation time every **3 blocks** against an expected target window (`2.0s × 3 = 6.0s`), automatically increasing difficulty by `+1` if actual time is `< 50%` of expected time, or decreasing by `-1` if actual time exceeds `150%`.
4. **Ledger Explorer & Organizer Queries (`/api/chain`, `/api/query/*`)**
   - Real-time blockchain explorer inspecting block hashes, previous hashes, nonces, mining durations, and transaction payloads.
   - Dual-dimensional organizer queries:
     - Retrieve all sessions attended by a specific participant (`GET /api/query/sessions?attendee_id=...`).
     - Retrieve all participants who attended a specific session (`GET /api/query/participants?session_id=...`).

---

## 🏗️ System Architecture & Repository Structure

dsai4202-project/
├── backend/
│   └── main.go              # Go + Gin REST API, RSA crypto, PoW & dynamic difficulty engine
├── frontend/
│   ├── index.html           # Root HTML entry point
│   └── src/
│       ├── main.tsx         # React root mount
│       └── App.tsx          # 5-tab interactive dashboard (Register, Attendance, Miner, Explorer, Query)
└── README.md

---

## Technology Stack

** Backend: Go (Golang), Gin Web Framework, gin-contrib/cors, Go Standard Crypto Libraries (crypto/rsa, crypto/sha256, crypto/x509, encoding/pem)
** Frontend: React, TypeScript, Vite

---

## 🚀 Setup & Installation

Ensure Go (1.21+) and Node.js (18+) are installed on your machine.

* Step 1: Initialize the Go Backend 
Open a terminal, navigate to the backend directory, and initialize the Go module and dependencies:
cd dsai4202-project/backend
go mod init conference-backend
go get -u github.com/gin-gonic/gin
go get -u github.com/gin-contrib/cors
(Ensure main.go is placed inside the backend/ folder.)

* Step 2: Initialize the React + TypeScript Frontend
Return to the project root directory and scaffold the Vite React-TypeScript environment:
cd ..
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
(Replace the generated frontend/index.html, frontend/src/main.tsx, and frontend/src/App.tsx with the source files from this repository.)

* Step 3: ▶️ Running & Testing the System
You will need two terminal windows running concurrently.

1. Start the Backend Server (Go):
cd backend
go run main.go
(The Go REST server will start on http://localhost:8080.)

2. Start the Frontend Dashboard (React + TypeScript):
cd frontend
npm run dev
(Open your browser and navigate to http://localhost:5173.)

---

🧪 Quick Walkthrough & Testing Guide

Register (REGISTER Tab): Enter an Attendee ID (e.g., A1), Name, and Email, click Generate RSA Key Pair, and click Register to Blockchain.

Check-In (ATTENDANCE Tab): Enter A1 and a Session ID (e.g., DSAI4202_Sec1). Submitting an invalid signature string will be rejected (401 Unauthorized). Use a valid RSA-PKCS#1 v1.5 hex signature (or bypass for quick demo testing) to push the record into the pending pool.

Mine (MINER Tab): Click Start Mining Block (PoW) to validate pending records and mint a new block. Mining 3 consecutive blocks rapidly will trigger the dynamic difficulty algorithm to scale difficulty from 2 to 3.

Inspect (EXPLORER Tab): Verify cryptographic hash chaining (Hash vs. Previous Hash), nonces, and difficulty changes across blocks.

Audit (QUERY Tab): Query attendance history by attendee_id or extract full session rosters by session_id.

---

👤 Author
Yuen Pak Hei — BSc in Information Security, The Hong Kong Polytechnic University 
