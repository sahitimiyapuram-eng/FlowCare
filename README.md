# FlowCare AI: Real-Time Clinical Patient Flow & EMR Operating System

A resilient, low-latency Clinical Queue Management and Patient Flow system engineered to streamline busy outpatient clinics, eliminate clipboard bottlenecks, and automate real-time status telemetry across multi-disciplinary healthcare workflow desks.

---

## 🚀 1. Problem Statement & Solution

### The Clipboard Bottleneck (Traditional Clinics)
Traditional neighborhood clinics and out-patient offices suffer from severe operational friction:
* **Line Visibility Deficit**: Patients wait anxiously without clear duration expectations, constantly querying staff about schedules.
* **Triage Call-out Delays**: Hand-written paper logs and verbal patient queue summonses slow down clinician onboarding.
* **Fragmented Desk Transfers**: Moving patient charts from Intake to Consultation, Diagnostics Lab, Pharmacy, and Cashier involves physical hand-offs prone to delay and patient record misplacements.

### FlowCare AI Solution
**FlowCare AI** coordinates clinic workflow streams into a single digital orchestration pipeline with:
1. **Under-10-Second Intake Registry**: Instant receptionist onboarding with automated, collision-free token issuing (e.g., `A1`, `A2`).
2. **5-Stage Medical Desk Orchestration**: Linear transition workflow from Intake Triage ➔ Consultation (SOAP Diagnosis) ➔ Lab Specimen Diagnostics ➔ Pharmacy Dispensation ➔ Cashier Invoice Ledger settlement.
3. **Synchronized Telemetry Board**: Digital Lobby Waiting Boards that update instantly using low-latency Socket.IO broadcasts.
4. **Historical EMR Archives**: Durable, printable Patient History lookup containing SOAP documents, lab results, and financial receipts.

---

## 🧱 2. System Architecture & Component Mapping

```
     +---------------------------------------------------------------------------------------+
     |                                    REACT FRONTEND                                     |
     +---------------------------------------------------------------------------------------+
     |                       ROLE-BASED DECISION DESKS USER INTERFACE                        |
     |  [ 🏢 Intake ] ➔ [ 🩺 Doctor Cabin ] ➔ [ 🧪 Diagnostics ] ➔ [ 💊 Pharmacy ] ➔ [ 💳 Cashier ]  |
     |                                                                                       |
     |             [ 📜 Patient EMR Lookup Panel ]      [ 📺 Digital Lobby Board ]           |
     +-----------------------------------------+---------------------------------------------+
                                               |
                                     REST APIs | HTTP Requests
                     WebSocket State Updates   | (eg: Register, Diagnosed, Dispense)
                 Receive "queueUpdated" event  | 
                                               v
     +-----------------------------------------+---------------------------------------------+
     |                            EXPRESS.JS NODE NODEJS BACKEND                             |
     +---------------------------------------------------------------------------------------+
     |   [ SOCKET.IO ENGINE ]                  [ API ROUTERS & STATE RECOVERY CONTROLLER ]   |
     |   Pipes dynamic status messages         Invokes Mongoose schema validators            |
     |   to active clinic terminal displays    Falls back dynamically to local memory state  |
     +-------------------+-------------------------------------+-----------------------------+
                         |                                     |
                         | Mongoose Query                      | AI Estimator Formula Model
                         v                                     v
     +-------------------+---------------------+           +-------+-----------------------------+
     |            MONGODB DATABASE             |           |          COGNITIVE ENGINE           |
     |   Retains patient logs, clinical SOAP,  |           | Predicts wait durations & dynamically|
     |   prescriptions, and billing logs       |           | scores patient No-Show probabilities|
     +-----------------------------------------+           +-------------------------------------+
```

---

## ⚡ 3. Real-Time Socket.IO Synchronization Lifecycle

Below is the event sequence flow designed to coordinate updates across distinct clinical visual monitors over low-latency socket handshakes:

```
[ CLINICAL DESK UTILITY ]           [ NODE BACKEND ]          [ MONGODB ]         [ LOBBY DISPLAY BOARD ]
          |                               |                         |                        |
 (1) Mutative REST Action ➔➔➔➔➔➔➔➔➔➔➔➔➔➔➔ |                         |                        |
     (eg: Doctor prescribes Rx)           |                         |                        |
          |                          (2) Save updates               |                        |
          |                               | ➔➔➔➔➔➔➔➔➔➔➔➔➔➔➔➔➔ |                        |
          |                          (3) Success ACK                |                        |
          |                               | 🪃- - - - - - - - - - -  |                        |
          |                               |                         |                        |
          |                          (4) Broadcast Event            |                        |
          |                              "queueUpdated" ➔➔➔➔➔➔➔➔➔➔➔➔➔➔➔➔➔➔➔➔➔➔➔➔➔➔➔➔➔➔➔➔➔➔➔➔➔|
          |                               |                         |                        |
          |                               |                         |           (5) Background Fetch
          |                               | <================================== fetch("/api/queue")
          |                               |                         |                        |
          |                               | ➔➔ Return Updated Queue ➔➔➔➔➔➔➔➔➔➔➔➔➔➔➔➔➔➔➔➔➔➔➔➔➔|
          |                               |                         |                        |
          |                               |                         |         (6) Repaint screen
          |                               |                         |             without scroll reload
```

---

## 🗄️ 4. Outpatient Sequential Stage transitions

A patient navigates sequentially through five clinical status transitions, each emitting automated socket update broadcasts:

```
 [ INTAKE DESK ]        [ DOCTOR CABIN ]     [ DIAGNOSTICS LAB ]     [ PHARMACY CABIN ]      [ CASHIER DESK ]
 ┌─────────────┐        ┌──────────────┐     ┌─────────────────┐     ┌────────────────┐      ┌──────────────┐
 │ Triage Vital│        │ Clinical SOAP│     │ Urine/Blood/CBC │     │ Pharmacy Drug  │      │ Net Cost &   │
 │ Registration➔➔➔➔➔➔➔➔➔│ Assessment   ➔➔➔➔➔➔│ Test Processing ➔➔➔➔➔➔│ Dispensation   ➔➔➔➔➔➔│ Invoice Paid │
 └─────────────┘        └──────────────┘     └─────────────────┘     └────────────────┘      └──────────────┘
    status:                status:               status:                 status:                 status:
   "waiting"              "serving"           "lab_processing"          "pharmacy"              "billing"
                                                                                                    │
                                                                                                    v
                                                                                             [ COMPLETED / EMR ]
                                                                                               status: "discharged"
```

---

## 🔌 5. Production API Documentation

### `GET /api/queue`
Retrieves live queuing status, medicines inventory levels, active scheduler appointments, and current wait-time parameters.
* **Success JSON Output Example**:
  ```json
  {
    "success": true,
    "mongoConnected": true,
    "averageConsultationTime": 10,
    "totalRegisteredToday": 14,
    "avgWaitTimeMinutes": 30,
    "queue": [
      {
        "_id": "603d2baf32810a001a2f640e",
        "token": "A1",
        "name": "Alex Mercer",
        "status": "serving",
        "priority": "STANDARD",
        "medicalHistory": "Hypertension parameters recorded"
      }
    ],
    "analytics": {
      "waiting": 3,
      "serving": 1,
      "lab": 2,
      "pharmacy": 1,
      "billing": 1,
      "completed": 6,
      "totalRevenue": 4350
    }
  }
  ```

### `POST /api/patient/add`
Registers a new outpatient triage record, assigning the next sequential slot code dynamically.
* **Payload**:
  ```json
  {
    "name": "Arjun Nair",
    "phone": "+91 98450 12345",
    "gender": "male",
    "department": "Cardiology Core",
    "assignedDoctor": "Dr. Srinivas Rao",
    "priority": "STANDARD",
    "medicalHistory": "Penicillin Allergy"
  }
  ```

### `POST /api/queue/transition`
Transitions a patient file to its next logical workflow desk status (e.g., waiting ➔ serving, serving ➔ lab_pending, etc.).
* **Payload**:
  ```json
  {
    "id": "603d2baf32810a001a2f640e",
    "status": "serving"
  }
  ```

### `POST /api/settings`
Alters clinical consultation service speed rates dynamically to alter waiting board queue estimates.
* **Payload**:
  ```json
  { "avgTime": 12 }
  ```

---

## 🛠️ 6. Local Installation Steps

Follow these steps to deploy and inspect FlowCare AI on local instances or test clouds:

1. **Clone the Repository**:
   ```bash
   git clone <repository-url>
   cd flowcare-ai
   ```

2. **Install Sandbox Dependencies**:
   ```bash
   npm install
   ```

3. **Provide MongoDB Connection String**:
   Specify an active Mongo instances inside `.env` or permit the applet to fall back safely to high-availability in-memory database buffers (`memoryQueue` array locks):
   ```env
   # .env
   MONGODB_URI=mongodb://localhost:27017/queue-manager
   ```

4. **Launch Development Application**:
   ```bash
   npm run dev
   ```

5. **Build and Run Production Server Bundle**:
   ```bash
   npm run build
   npm start
   ```
