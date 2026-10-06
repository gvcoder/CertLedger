# Project Task Checklist: Secured Blockchain Certification System (Hyperledger Fabric)

> **Status Overview**: 0 / 25 Tasks Completed

---

## 🏗️ Phase 1: Project Setup & Architecture Foundations
- [ ] **1.1 Monorepo Setup**: Initialize TypeScript project structure (`/server`, `/client`, `/chaincode`).
- [ ] **1.2 Package Configuration**: Configure `package.json` for TypeScript, Express, React, Vite, and Tailwind CSS.
- [ ] **1.3 Environment Setup**: Configure `.env.example` for Gemini API keys, JWT secrets, and Fabric gateway configuration.
- [ ] **1.4 AWS EC2 Deployment Scripts**: Create `docker-compose.yml` and `deploy-ec2.sh` for single-command AWS EC2 deployment.

---

## 🔗 Phase 2: Hyperledger Fabric TypeScript Smart Contract (Chaincode)
- [ ] **2.1 State Schema**: Define TypeScript interfaces for Certificate asset & 3-Way MultiSig schema (`student`, `teacher`, `platformAdmin`).
- [ ] **2.2 Ledger Initialization**: Implement `InitLedger` smart contract method with seed certificates.
- [ ] **2.3 Certificate Initiation**: Implement `InitiateCertificate` (Student passes exam -> Status: `PENDING_TEACHER_APPROVAL`).
- [ ] **2.4 Academic Sign-off**: Implement `TeacherSignCertificate` (Teacher co-signs -> Status: `PENDING_PLATFORM_APPROVAL`).
- [ ] **2.5 Platform Endorsement**: Implement `PlatformAdminSignCertificate` (Super-Admin co-signs -> Status: `ISSUED_VALID`).
- [ ] **2.6 Verification & Audit**: Implement `VerifyCertificate` and `GetCertificateHistory` provenance functions.
- [ ] **2.7 Chaincode Unit Tests**: Write unit tests for all contract signature state transitions.

---

## ⚡ Phase 3: Backend API & AI Engine
- [ ] **3.1 Express API Server**: Set up Express server with TypeScript, CORS, and standard response wrappers.
- [ ] **3.2 Auth & RBAC**: Implement JWT authentication with role authorization (`SUPER_ADMIN`, `TEACHER`, `STUDENT`).
- [ ] **3.3 Course Management API**: Create REST endpoints for creating/reading courses and 1-page reading materials.
- [ ] **3.4 AI Question Generator**: Implement Gemini AI endpoint (`/api/ai/generate-questions`) to create 5 MCQs from course text (with smart fallback).
- [ ] **3.5 Exam Evaluation Engine**: Build endpoint to score student 5-question submissions (80% passing threshold).
- [ ] **3.6 Fabric Gateway Service**: Implement dual-mode gateway integration (Native Fabric SDK + standalone Fabric Micro-Simulator).
- [ ] **3.7 MultiSig Approval Queue APIs**: Build endpoints for Teachers & Super-Admins to fetch and sign pending certificates.

---

## 🎨 Phase 4: Frontend Web Application (React + Tailwind CSS)
- [ ] **4.1 React Scaffolding & Theme**: Setup Vite + React + Tailwind CSS with modern dark/glassmorphism design system.
- [ ] **4.2 Navigation & Auth Modal**: Build header with role switcher (`Super-Admin`, `Teacher`, `Student`) and live Fabric network status indicator.
- [ ] **4.3 Student Portal**:
  - [ ] Course Catalog & 1-Click Enrollment.
  - [ ] 1-Page Course Reader & Exam Portal (5 MCQs with timer & instant grading).
  - [ ] Student Completion Sign-off UI & "My Credentials" Dashboard.
- [ ] **4.4 Teacher Workspace**:
  - [ ] Course Creator with AI Exam Generator tool.
  - [ ] Academic Signature Queue for reviewing and co-signing student certificates.
- [ ] **4.5 Super-Admin (Platform Provider) Panel**:
  - [ ] User & Institution Management interface.
  - [ ] Platform Co-Signature Queue for final endorsement sign-off.
  - [ ] Hyperledger Fabric Telemetry Explorer (Blocks, Transactions, and Chaincode logs).
- [ ] **4.6 Public Recruiter Verification Page (`/verify/:certificateId`)**:
  - [ ] Public certificate view (no login required).
  - [ ] 3-Way Multi-Party Signature Stepper (Student, Teacher, Super-Admin signatures visualizer).
  - [ ] SHA-256 Proof Badge & Ledger History Audit Modal.

---

## 🧪 Phase 5: Testing, Verification & Walkthrough
- [ ] **5.1 End-to-End Verification**: Test full cycle (Course Creation -> AI Question Generation -> Student Exam -> 3-Party Signatures -> Public Recruiter Verification).
- [ ] **5.2 Walkthrough Documentation**: Create `walkthrough.md` documenting completed features, screenshots, and test results.
