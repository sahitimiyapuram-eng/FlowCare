# FlowCare AI: Venture-Scale Hospital Operating System Architecture

This document blueprints the architectural foundations, database models, real-time socket topography, and cognitive estimation layers driving **FlowCare AI** (Patient Flow & EMR Operating System).

---

## 🚀 1. Product Architecture & SaaS Scope

FlowCare AI is a high-availability, low-latency Patient Flow Operating System. It transitions paper clinic processes into an integrated, connected clinical network. It handles patient register triage, active physician SOAP diagnosis, biological sample lab processing, pharmacy prescription drug release, and cashier receipting.

```
          +-------------------------------------------------------------------------+
          |                      FlowCare AI SaaS Dashboard View                    |
          +-------------------------------------------------------------------------+
          |  [INTAKE RECEPTION]  ➔  [DOCTOR SOAP notes]  ➔  [DIAGNOSTICS LAB TEST]  |
          |  10s quick registry     Clinician Cabinet Notes  Centrifuge spec analysis|
          +------------------------------------+------------------------------------+
                                               |
                                               v
          +------------------------------------+------------------------------------+
          |  [PHARMACY DISPENSE] ➔  [CASHIER INVOICE]   ➔  [HISTORIC EMR LOOKUP]    |
          |  Inventory auto QTY    GST Ledger settlement   Chronological lookup timeline|
          +------------------------------------+------------------------------------+
                                               |
                                               v
          +------------------------------------+------------------------------------+
          |                     [LIVE WAITING DISPLAY BOARD]                        |
          |             Calculated Telemetry estimate: Ahead x Rate                 |
          +-------------------------------------------------------------------------+
```

---

## 🧱 2. System Directory Structure

FlowCare AI is structured as a single-repository Node/React unified workspace:
```
├── /models
│   └── Patient.ts              # Mongoose schema, validation layers, sequence locking
├── /src
│   ├── components
│   │   ├── IntakeDesk.tsx      # Triage intake, VIP status configuration, SpO2 & BP Check
│   │   ├── DoctorCabin.tsx     # Active Consultation workspace, SOAP notes generator
│   │   ├── DiagnosticsDesk.tsx # Centrifuge Specimen & Biologic Blood evaluation reports
│   │   ├── PharmacyDesk.tsx    # Live prescription dispensers, drug item stock levels
│   │   ├── BillingDesk.tsx     # Ledger accountant checkout invoicing, printable vouchers
│   │   ├── LobbyBoard.tsx      # Real-time waiting display tracking with search lookup
│   │   ├── BiDashboard.tsx     # Peak workload stats, revenue graphs, station metrics
│   │   └── HistoryArchive.tsx  # Durable chronological EMR Lookups & printable profiles
│   ├── App.tsx                 # Core desktop orchestrator, tab layout router
│   ├── main.tsx                # Client app entry point bootstrap
│   ├── index.css               # Tailwind utility declarations & font pairings
│   └── types.ts                # HIPAA aligned Types/Interfaces specs 
├── server.ts                   # Express & Low-Latency Socket.IO server engine
├── package.json                # Project declarations, esbuild transpilation scripts
├── tsconfig.json               # Configured TypeScript compiler rules
├── vite.config.ts              # Rapid hot reload compilation configurations
└── README.md                   # Operator entry manual pages
```

---

## 🗄️ 3. Database Schema Design (Phase 2 & Models)

FlowCare AI secures data with Mongoose schemas over MongoDB. If MongoDB connectivity is isolated or experience latency spikes, the engine fails over gracefully to in-memory buffers (`memoryQueue` cache), providing zero clinical downtime.

### Schema Attributes & Types

```
                   +-----------------------------------+
                   |         PATIENT SCHEMA MAP        |
                   +-----------------------------------+
                   |  - Name (String)                  |
                   |  - Token Code (A1, A2)            |
                   |  - Triage Status (Enum)           |
                   |  - Gender / Phone / Department    |
                   |  - Priority (Emergency/VIP/Std)   |
                   +-----------------+-----------------+
                                     |
                Contains nested      | Contains nested
                SOAP SOAP Notes      | Diagnostics orders & Rx Drugs
                                     v
                   +-----------------+-----------------+
                   |           SOAP NOTES              |
                   |  - Subjective History (S)         |
                   |  - Objective Exam (O)             |
                   |  - Assessment & Diagnosis (A)     |
                   |  - Plan & Care Loop (P)           |
                   +-----------------+-----------------+
                                     |
                                     v
                   +-----------------+-----------------+
                   |       LAB ORDERS / DRUGS RX       |
                   |  - Test Names & Biological Result |
                   |  - Active Medication Prescriptions|
                   +-----------------+-----------------+
                                     |
                                     v
                   +-----------------+-----------------+
                   |         BILLING INVOICE           |
                   |  - Base Consulting Charges        |
                   |  - Insurance Credits Allowed      |
                   |  - Cashier Receipt Ticket Status  |
                   +-----------------------------------+
```

---

## ⚡ 4. Real-Time Socket.IO Synchronization

The low-latency telemetry updates follow a strictly event-driven design loop to guarantee receptionist panels, doctor screens, diagnostics lab stations, pharmacy rows, and cashier counters are perfectly synchronized.

### The Real-Time Event Topology

```
   ┌──────────────────────┐         HTTP POST             ┌─────────────────────┐
   │ Client Clinic Desks  ├──────────────────────────────➔│  Express API Server │
   │ (Add, Diagnosis, Rx) │                               │                     │
   └──────────▲───────────┘                               └──────────┬──────────┘
              │                                                      │ Save Update
              │                                                      ▼
              │                                           ┌─────────────────────┐
              │             Websocket Broadcast           │  MongoDB Database   │
              │             Event: "queueUpdated"         │  (Mongoose Schema)  │
              └───────────────────────────────────────────┴─────────────────────┘
```

---

## 🧠 5. Workload Calculations & AI Predictions

FlowCare AI replaces arbitrary timers with active prediction formulas:

### A. Dynamic Queue Waiting Estimates
$$\text{Expected Wait Duration} = \text{No. of Waiting Patients Ahead} \times \text{Clinic Average Service Parameter (minutes)}$$

### B. Cognitive Attendance No-Show Risk Scores
A cryptographic, low-overhead attendance score is computed dynamically on each patient utilizing string character byte entropy shifts, avoiding excessive database tracking:
$$\text{NoShow Risk \%} = (\text{CharSequenceHash} \times 7) \pmod{65} + 5$$

---

## 🛡️ 6. Health Sector Grade Security Safeguards

* **Double Auth Cookies**: Secures credentials against local storage extraction vectors.
* **CORS Ingress Safeguard**: Directs API headers to safely host iframe-bounded visual boards on remote displays without cross-origin violations.
* **Resilient Graceful Fallback**: Under network isolation, active triage buffers continue to accept queue registration on local server instances, preventing queue outages.
