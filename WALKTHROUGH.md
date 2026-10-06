# Walkthrough: Secured Blockchain Course Certification System (Hyperledger Fabric)

We have built a full-stack, multi-party signed course certification platform powered by **Hyperledger Fabric**, featuring **Gemini AI Question Generation**, role-based access control (Student, Teacher, Super-Admin), and a **Public Recruiter Verification Portal**.

---

## 🌟 What Was Built

### 1. 🔗 Hyperledger Fabric TypeScript Smart Contract (`/chaincode`)
- **State Schema (`types.ts`)**: Defines Certificate assets with **3-Way Multi-Party Signatures**:
  - `student`: Initiated upon completing exam (`PENDING_TEACHER_APPROVAL`).
  - `teacher`: Academic co-signature (`PENDING_PLATFORM_APPROVAL`).
  - `platformAdmin`: Final EdX/Coursera Super-Admin endorsement (`ISSUED_VALID`).
- **Core Functions (`certificateContract.ts`)**:
  - `InitLedger`: Seed data initialization.
  - `InitiateCertificate`: Creates draft cert with student completion signature & SHA-256 hash.
  - `TeacherSignCertificate`: Applies academic instructor co-signature.
  - `PlatformAdminSignCertificate`: Applies final platform endorsement.
  - `VerifyCertificate`: Returns full certificate status & multi-party signature validation.
  - `GetCertificateHistory`: Retrieves block-by-block immutable provenance audit trail.

### 2. ⚡ Express API Server & AI Engine (`/server`)
- **JWT Auth & RBAC (`middleware/auth.ts`)**: Role guards (`SUPER_ADMIN`, `TEACHER`, `STUDENT`) with pre-seeded demo accounts.
- **Gemini AI Generator (`services/gemini.ts`)**: Generates 5 multiple choice questions with answer keys directly from 1-page course reading text (with intelligent heuristic fallback).
- **Fabric Gateway & Emulator (`services/fabricGateway.ts`, `services/fabricEmulator.ts`)**: Provides stateful Fabric simulation with SHA-256 block hashing, transaction indexing, and telemetry metrics.
- **REST Endpoints**:
  - `/api/courses`: Course catalog, 1-page reader, exam grading (80% passing threshold).
  - `/api/certificates`: Student credentials, Teacher signature queue, Super-Admin endorsement queue, public verification lookup (`/api/certificates/public/verify/:id`), and provenance audit history.
  - `/api/fabric/telemetry`: Fabric block height, transaction hashes, and ledger health metrics.

### 3. 🎨 Frontend Web Application (`/client`)
- **Dark Glassmorphism Theme (`index.css`, `tailwind.config.js`)**: Modern UI with vibrant gradients, glowing badges, and crisp typography (Inter & Outfit fonts).
- **Interactive Role Switcher (`Navbar.tsx`)**: Easily toggle between Student (`🎓`), Teacher (`👩‍🏫`), and Super-Admin (`🛡️`) roles with live Fabric block telemetry indicator.
- **3-Way Multi-Party Signature Stepper (`VerificationBadge.tsx`)**: Visual progress tracking of Student, Teacher, and Platform signatures.
- **Portals & Pages**:
  - **Home Page (`Home.tsx`)**: Hero overview and feature highlights.
  - **Student Dashboard (`StudentDashboard.tsx`)**: Course catalog, 1-click enrollment, and "My Credentials" viewer.
  - **Course Reader (`CourseReader.tsx`)**: 1-page reading text interface.
  - **Exam Page (`ExamPage.tsx`)**: Interactive 5-question exam with option selector, instant grading, passing celebration modal, and certificate initiation.
  - **Teacher Workspace (`TeacherDashboard.tsx`)**: Active courses list & Academic Signature Review Queue.
  - **Course Editor (`CourseEditor.tsx`)**: Form with **"Use AI to Generate Questions"** button powered by Gemini.
  - **Super-Admin Panel (`SuperAdminDashboard.tsx`)**: User registry, Platform Co-Signature Queue, and Fabric Block Explorer.
  - **Public Verification Page (`VerifyCertificatePage.tsx`)**: Recruiter portal accessible without login, complete with live QR code, SHA-256 completion proof, print/download diploma view, and immutable Fabric audit modal.

### 4. 🐳 AWS EC2 Containerized Deployment Setup
- **`Dockerfile.server` & `Dockerfile.client`**: Optimized multi-stage Docker builds.
- **`docker-compose.yml`**: Single-command container orchestration.
- **`deploy-ec2.sh`**: One-click deployment script ready for AWS EC2 instances.

---

## 🚀 How to Run & Verify Locally

### Step 1: Install Dependencies & Build Monorepo
From the root workspace directory (`/home/gvmuthu/code/Blockchain`):

```bash
# Install root & workspace packages
npm install

# Build chaincode, server, and client packages
npm run build
```

### Step 2: Start Application in Dev Mode
```bash
npm run dev
```

This starts:
- **Express API Backend**: `http://localhost:5000`
- **Vite React Frontend**: `http://localhost:3000`

---

## 🧪 Testing the 3-Way Multi-Party Signature Workflow

1. **Open Frontend**: Navigate to `http://localhost:3000`.
2. **Student Flow (`🎓 Student`)**:
   - Click **"My Courses & Credentials"** -> Select **"Introduction to Blockchain Architecture"**.
   - Read the 1-page course text -> Click **"Take 5-Question Exam"**.
   - Answer all 5 questions (passing score >= 80%).
   - Upon passing, a draft certificate (e.g. `CERT-2026-1001`) is initiated on the Hyperledger Fabric ledger in state `PENDING_TEACHER_APPROVAL`.
3. **Teacher Flow (`👩‍🏫 Teacher`)**:
   - Switch to **Teacher Role** in the header switcher.
   - Go to **Teacher Workspace** -> See the pending student certificate in the **Academic Signature Review Queue**.
   - Click **"Co-Sign Certificate"** -> State transitions to `PENDING_PLATFORM_APPROVAL`.
4. **Super-Admin Flow (`🛡️ Super-Admin`)**:
   - Switch to **Super-Admin Role** in the header switcher.
   - Go to **Super-Admin Governance** -> See the certificate in the **Platform Endorsement Queue**.
   - Click **"Apply Final Platform Endorsement"** -> State becomes `ISSUED_VALID`.
5. **Recruiter Verification (`🔍 Public Verifier`)**:
   - Click **"Public Verification Portal"** (or go to `http://localhost:3000/verify/CERT-2026-1001`).
   - Observe the green **Authentic & Verified** banner, the 3-Way Signature Stepper with cryptographic hashes, the printable diploma view, and click **"Audit History"** to inspect block-by-block transaction provenance.

---

## ☁️ AWS EC2 Deployment

To deploy to an AWS EC2 instance:
```bash
chmod +x deploy-ec2.sh
./deploy-ec2.sh
```
This automatically builds and runs the containerized application on ports `80` (Frontend) and `5000` (API Backend).
