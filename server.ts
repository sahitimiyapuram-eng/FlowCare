import express from "express";
import path from "path";
import http from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import dns from "dns";
import { createServer as createViteServer } from "vite";
import { PatientModel, IPatient } from "./models/Patient.js";

// Force IPv4 addresses to speed up lookup in containers, if needed
dns.setDefaultResultOrder("ipv4first");

const app = express();
const server = http.createServer(app);
const PORT = 3000;

// Setup Socket.IO with CORS support
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
  }
});

app.use(express.json());

// Persistent state settings (falls back to memory)
let averageConsultationTime = 10; // in minutes

// High-availability In-Memory database fallback
let memoryQueue: any[] = [];
let mongoConnected = false;

// Core Pharmacy stock inventory
let medicinesInventory = [
  { id: "1", drugName: "Paracetamol 650mg", stock: 850, basePrice: 20, alertThreshold: 50 },
  { id: "2", drugName: "Amoxicillin 500mg", stock: 320, basePrice: 120, alertThreshold: 30 },
  { id: "3", drugName: "Atorvastatin 20mg", stock: 400, basePrice: 80, alertThreshold: 40 },
  { id: "4", drugName: "Ibuprofen 400mg", stock: 610, basePrice: 25, alertThreshold: 50 },
  { id: "5", drugName: "Metformin 500mg", stock: 35, basePrice: 15, alertThreshold: 50 }, // Low Stock Limit
  { id: "6", drugName: "Cetirizine 10mg", stock: 120, basePrice: 10, alertThreshold: 20 },
  { id: "7", drugName: "Artesunate 60mg", stock: 75, basePrice: 450, alertThreshold: 15 }
];

// Live Appointments Scheduler Store
let appointments: any[] = [];

// Operational Audit Logs
let auditLogs: any[] = [
  { id: "log_0", timestamp: new Date(Date.now() - 3600000).toISOString(), userEmail: "sahiti.miyapuram@gmail.com", role: "Super Admin", action: "SaaS Database Booted", details: "Operational high-fidelity data models initialized successfully" }
];

function logAction(userEmail: string, role: string, action: string, details: string) {
  const newLog = {
    id: `log_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
    userEmail,
    role,
    action,
    details
  };
  auditLogs.unshift(newLog);
  if (auditLogs.length > 150) {
    auditLogs.pop();
  }
}

// Initialize Database connection with swift timeouts
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/queue-manager";

async function connectDB() {
  try {
    console.log(`[Database] Connecting to MongoDB: ${MONGODB_URI}`);
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 3000,
      connectTimeoutMS: 3000
    });
    mongoConnected = true;
    console.log("[Database] Connected successfully to MongoDB.");
  } catch (error) {
    console.warn("[Database] MongoDB connection failed! Operating safely in High-Availability In-Memory mode.");
    mongoConnected = false;
  }
}

// Resilient Helper: fetch clean unified list from DB or Memory
async function getUnifiedQueue(): Promise<any[]> {
  if (mongoConnected) {
    try {
      const items = await (PatientModel as any).find().sort({ createdAt: 1 });
      memoryQueue = items.map((doc: any) => doc.toObject());
      return items;
    } catch (err) {
      console.error("[Database] Failed to read from MongoDB, fallback to memory storage:", err);
      return memoryQueue;
    }
  }
  return memoryQueue;
}

// Helper to generate dynamic stats
async function getDynamicStats() {
  const currentItems = await getUnifiedQueue();
  const waitingPatients = currentItems.filter((p: any) => p.status === "waiting");
  const servingPatients = currentItems.filter((p: any) => p.status === "serving");
  const labPatients = currentItems.filter((p: any) => p.status === "lab_pending" || p.status === "lab_processing");
  const pharmacyPatients = currentItems.filter((p: any) => p.status === "pharmacy");
  const billingPatients = currentItems.filter((p: any) => p.status === "billing");
  const completedPatients = currentItems.filter((p: any) => p.status === "completed" || p.status === "discharged");
  
  // Calculate revenue
  const totalRevenue = currentItems.reduce((acc: number, p: any) => {
    if (p.billingInvoice && p.billingInvoice.status === "PAID") {
      return acc + (p.billingInvoice.totalAmount || 0);
    }
    return acc;
  }, 0);

  return {
    success: true,
    mongoConnected,
    averageConsultationTime,
    totalRegisteredToday: currentItems.length,
    avgWaitTimeMinutes: waitingPatients.length * averageConsultationTime,
    peakHourPercentage: Math.min(100, Math.round((currentItems.length / 30) * 100)) || 18,
    activeDoctorsCount: 4,
    emergencyCount: currentItems.filter((p: any) => p.priority === "EMERGENCY").length,
    queue: currentItems,
    patients: currentItems,
    queueBreakdown: {
      reception: waitingPatients.length,
      consultation: servingPatients.length,
      lab: labPatients.length,
      pharmacy: pharmacyPatients.length,
      billing: billingPatients.length
    },
    analytics: {
      waiting: waitingPatients.length,
      serving: servingPatients.length,
      lab: labPatients.length,
      pharmacy: pharmacyPatients.length,
      billing: billingPatients.length,
      completed: completedPatients.length,
      totalRevenue,
      medicinesStockStatus: medicinesInventory,
      appointmentsScheduled: appointments.length,
      auditLogsCount: auditLogs.length
    },
    status: "online"
  };
}

// Resilient Helper: Generate next sequential token
async function generateNextToken(): Promise<string> {
  const currentItems = await getUnifiedQueue();
  let maxTokenId = 0;
  for (const item of currentItems) {
    const match = item.token.match(/^A(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxTokenId) {
        maxTokenId = num;
      }
    }
  }
  return `A${maxTokenId + 1}`;
}

// Auto generate sequential UHID identifier
function generateUHID(name: string): string {
  if (!name) return "IN-FC-10293";
  const charSum = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const code = 100000 + (charSum * 43) % 899999;
  return `IN-FC-${code}`;
}

// ==========================================
// REST APIS
// ==========================================

// GET /manual /manual.html /faq -> Interactive printable User Guide PDF
app.get(["/manual", "/manual.html", "/faq"], (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>FlowCare AI v2.0 - Operating System User Manual & FAQs (PDF)</title>
      <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;700&display=swap');
        body {
          font-family: 'Inter', sans-serif;
          background-color: #f1f5f9;
        }
        .printable-page {
          background: white;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
          width: 210mm;
          min-height: 297mm;
          padding: 20mm;
          margin: 20px auto;
        }
        @media print {
          body {
            background-color: white !important;
          }
          .no-print {
            display: none !important;
          }
          .printable-page {
            box-shadow: none !important;
            margin: 0 !important;
            padding: 0 !important;
            width: auto !important;
            min-height: auto !important;
            page-break-after: always;
          }
        }
      </style>
    </head>
    <body class="text-slate-800">
      
      <!-- Sticky header within screen preview -->
      <div class="no-print bg-slate-900 text-white py-4 px-6 sticky top-0 z-50 shadow-md flex flex-wrap justify-between items-center gap-4">
        <div class="flex items-center space-x-3">
          <span class="bg-blue-600 text-white font-extrabold px-3 py-1.5 rounded-lg text-sm tracking-wider">FLOWCARE AI</span>
          <div>
            <h1 class="text-xs font-bold uppercase tracking-wider text-slate-300">Official Standard Operating Procedures</h1>
            <p class="text-[10px] text-slate-400">Printed Document PDF Controller v2.0</p>
          </div>
        </div>
        <div class="flex items-center space-x-3">
          <button onclick="window.print()" class="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl Transition flex items-center space-x-2 shadow-sm cursor-pointer">
            <span>🖨️ Print Handbook / Save as PDF</span>
          </button>
          <a href="/" class="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs px-4 py-2.5 rounded-xl transition cursor-pointer">
            Return to Active Lobby &rarr;
          </a>
        </div>
      </div>

      <!-- MAIN PAGE DOCUMENT container -->
      <div class="printable-page">
        <!-- HEADER branding -->
        <div class="border-b-4 border-blue-600 pb-6 flex justify-between items-start">
          <div>
            <span class="text-[10px] bg-slate-900 text-white px-2.5 py-1 rounded font-mono font-bold uppercase tracking-widest block w-max mb-2">Corporate SOP Reference</span>
            <h2 class="text-3xl font-black text-slate-900 tracking-tight">FlowCare AI Outpatient</h2>
            <p class="text-sm font-semibold text-slate-505">Smart Patient Flow Operating System — Production Manual</p>
          </div>
          <div class="text-right text-xs text-slate-400 font-mono">
            <p>Document: SOP-HOSP-FC2</p>
            <p>Classification: RESTRICTED</p>
            <p>Date: June 2026</p>
          </div>
        </div>

        <!-- TABLE OF CONTENTS / INTRO -->
        <div class="my-8 space-y-4">
          <div class="bg-slate-50 p-4.5 rounded-xl border border-slate-100">
            <h3 class="font-bold text-slate-900 text-sm mb-1.5">&#128220; Document Purpose</h3>
            <p class="text-xs text-slate-600 leading-relaxed">
              This manual guides administrative staff, clinicians, and ancillary clinical departments in the execution of their responsibilities using FlowCare AI. This digital suite is structured to manage the transition from patient intake to consultation, laboratory assessment, pharmacy fulfillment, and financial invoice clearance.
            </p>
          </div>
        </div>

        <!-- CORE LOGIN CREDENTIALS CHEAT-SHEET -->
        <div class="space-y-4 my-8">
          <h3 class="text-lg font-bold text-slate-900 border-b pb-2 flex items-center">
            <span class="mr-2">🔐</span> Quick Login Credentials
          </h3>
          <p class="text-xs text-slate-600">The application operates on secure, role-based visibility. Use the unique password list below to authenticate your specific workstation portal:</p>
          
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs border divide-y">
              <thead class="bg-slate-50">
                <tr>
                  <th class="p-3 font-bold text-slate-700">Workstation Portal Role</th>
                  <th class="p-3 font-bold text-slate-700">Username/Identifier</th>
                  <th class="p-3 font-bold text-slate-700">Target Passkey</th>
                  <th class="p-3 font-bold text-slate-700">Permissions Scope</th>
                </tr>
              </thead>
              <tbody class="divide-y">
                <tr>
                  <td class="p-3 font-semibold text-slate-900">🏢 Receptionist</td>
                  <td class="p-3 font-mono text-slate-600">receptionist</td>
                  <td class="p-3 font-mono font-bold text-blue-600">recep123</td>
                  <td class="p-3 text-slate-500">Walk-ins, scheduling, appointments check-in, priority overrides.</td>
                </tr>
                <tr>
                  <td class="p-3 font-semibold text-slate-900">🩺 Doctor</td>
                  <td class="p-3 font-mono text-slate-600">doctor</td>
                  <td class="p-3 font-mono font-bold text-blue-600">doc123</td>
                  <td class="p-3 text-slate-500">Cabin status console, SOAP logs, Rx prescribing, lab orders.</td>
                </tr>
                <tr>
                  <td class="p-3 font-semibold text-slate-900">🧪 Lab Assistant</td>
                  <td class="p-3 font-mono text-slate-600">lab assistant</td>
                  <td class="p-3 font-mono font-bold text-blue-600">lab123</td>
                  <td class="p-3 text-slate-500">Analyze specimens, publish results, update diagnostics status.</td>
                </tr>
                <tr>
                  <td class="p-3 font-semibold text-slate-900">💊 Pharmacy Desk</td>
                  <td class="p-3 font-mono text-slate-600">pharmacy</td>
                  <td class="p-3 font-mono font-bold text-blue-600">pharm123</td>
                  <td class="p-3 text-slate-500">View prescription rows, deduct drug inventories, dispense drugs.</td>
                </tr>
                <tr>
                  <td class="p-3 font-semibold text-slate-900">💳 Cashier</td>
                  <td class="p-3 font-mono text-slate-600">cashier</td>
                  <td class="p-3 font-mono font-bold text-blue-600">cash123</td>
                  <td class="p-3 text-slate-500">Aggregate bills (consult + labs + pharmacy), invoice settlement.</td>
                </tr>
                <tr>
                  <td class="p-3 font-semibold text-slate-900">📺 Patient / Lobby view</td>
                  <td class="p-3 font-mono text-slate-600">patient</td>
                  <td class="p-3 font-mono font-bold text-blue-600">pat123</td>
                  <td class="p-3 text-slate-500">Read-only live wait list TV board showing token states and alerts.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- STAGED CLINICAL JOURNEY EXPLAINED -->
        <div class="space-y-4 my-8">
          <h3 class="text-lg font-bold text-slate-900 border-b pb-2 flex items-center">
            <span class="mr-2">🔄</span> Real-time Clinical Journey SOP
          </h3>
          <p class="text-xs text-slate-600">Every outpatient advances linearly through standard steps to prevent desk congestion and resource bottlenecks:</p>
          
          <div class="grid grid-cols-2 gap-4">
            <div class="border rounded-xl p-3 space-y-1 bg-blue-50/20 border-blue-100">
              <span class="text-xxs font-mono font-bold text-blue-600">STEP 1</span>
              <h4 class="text-xs font-bold text-slate-800">Registration Desk Injection</h4>
              <p class="text-[11px] text-slate-550 leading-relaxed">
                The receptionist records patient demographics, collects critical health history, and issues a structured Queue Token (e.g., A1).
              </p>
            </div>
            
            <div class="border rounded-xl p-3 space-y-1 bg-teal-50/20 border-teal-100">
              <span class="text-xxs font-mono font-bold text-teal-600">STEP 2</span>
              <h4 class="text-xs font-bold text-slate-800">Active Waiting & Priority Sort</h4>
              <p class="text-[11px] text-slate-550 leading-relaxed">
                Patients sit in the TV lobby. VIP and EMERGENCY tokens bypass regular lines and automatically bubble to the top.
              </p>
            </div>

            <div class="border rounded-xl p-3 space-y-1 bg-indigo-50/20 border-indigo-100">
              <span class="text-xxs font-mono font-bold text-indigo-600">STEP 3</span>
              <h4 class="text-xs font-bold text-slate-800">Clinician Examination</h4>
              <p class="text-[11px] text-slate-550 leading-relaxed">
                Doctors accept the patient into the cabin, log diagnostics reports, compile SOAP notes, and submit clinical dispatch orders.
              </p>
            </div>

            <div class="border rounded-xl p-3 space-y-1 bg-amber-50/20 border-amber-100">
              <span class="text-xxs font-mono font-bold text-amber-600">STEP 4</span>
              <h4 class="text-xs font-bold text-slate-800">Diagnostics, Pharmacy, & Settle</h4>
              <p class="text-[11px] text-slate-550 leading-relaxed">
                If laboratory work is requested, the token locks in Diagnostics first, then routes to Pharmacy, and finally is completed once paid.
              </p>
            </div>
          </div>
        </div>

        <div class="mt-12 text-center text-xxs text-slate-400 font-mono pt-4 border-t">
          <p>© 2026 FlowCare AI Inc. All rights reserved. Hospital Outpatient Operations Systems Division.</p>
        </div>
      </div>

    </body>
    </html>
  `);
});

// GET /api/queue -> Fetch queue data
app.get("/api/queue", async (req, res) => {
  try {
    const data = await getUnifiedQueue();
    res.json({
      success: true,
      mongoConnected,
      averageConsultationTime,
      queue: data,
      inventory: medicinesInventory,
      appointments,
      auditLogs
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/live-state & stats variations
app.get([
  "/api/live-state",
  "/api/livestate",
  "/api/live_state",
  "/api/state",
  "/api/stats",
  "/api/live-stats",
  "/api/livestats",
  "/api/statistics",
  "/api/patients"
], async (req, res) => {
  try {
    const stats = await getDynamicStats();
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/appointments
app.get("/api/appointments", (req, res) => {
  res.json({ success: true, appointments });
});

// POST /api/appointment/add -> Schedule an appointment
app.post("/api/appointment/add", (req, res) => {
  const { name, phone, doctorName, specialty, date, timeSlot, gender, dob } = req.body;
  if (!name || !phone || !doctorName) {
    return res.status(400).json({ success: false, error: "Missing required details to book appointment." });
  }

  const charSum = name.split("").reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
  const noShowProbability = Math.min(95, Math.max(5, (charSum * 13) % 75));
  const newApt = {
    id: `apt_${Date.now()}`,
    patientName: name.trim(),
    patientPhone: phone.trim(),
    doctorName,
    specialty,
    date: date || "2026-06-22",
    timeSlot: timeSlot || "11:00 AM",
    status: "SCHEDULED",
    noShowProbability,
    uhid: generateUHID(name),
    gender: gender || "Male",
    dob: dob || "1994-06-15"
  };

  appointments.push(newApt);
  logAction("receptionist@flowcare.ai", "Receptionist", "Appointment Scheduled", `Booked ${newApt.patientName} for ${newApt.doctorName} on ${newApt.date} [AI No-Show risk: ${noShowProbability}%]`);
  io.emit("queueUpdated");
  res.json({ success: true, appointment: newApt });
});

// POST /api/appointment/cancel
app.post("/api/appointment/cancel", (req, res) => {
  const { id } = req.body;
  const match = appointments.find(a => a.id === id);
  if (match) {
    match.status = "CANCELLED";
    logAction("receptionist@flowcare.ai", "Receptionist", "Appointment Cancelled", `Cancelled slot for patient ${match.patientName}`);
    io.emit("queueUpdated");
    res.json({ success: true, appointment: match });
  } else {
    res.status(404).json({ success: false, error: "Appointment slot not found." });
  }
});

// POST /api/appointment/checkin -> Converts scheduled patient into immediate live queue item!
app.post("/api/appointment/checkin", async (req, res) => {
  const { id } = req.body;
  const matchIdx = appointments.findIndex(a => a.id === id);
  if (matchIdx === -1) {
    return res.status(404).json({ success: false, error: "Appointment not found." });
  }

  const apt = appointments[matchIdx];
  apt.status = "CHECKED_IN";

  // Create patient in live queue
  try {
    const token = await generateNextToken();
    const patientData = {
      token,
      name: apt.patientName,
      uhid: apt.uhid,
      gender: apt.gender,
      dob: apt.dob,
      phone: apt.patientPhone,
      email: "patient@flowcare.ai",
      status: "waiting",
      priority: "STANDARD",
      assignedDoctor: apt.doctorName,
      department: apt.specialty,
      createdAt: new Date(),
      prescriptions: [],
      labOrders: [],
      billingInvoice: {
        subtotal: 450, // consult base fee
        taxAmount: 81,  // 18% GST
        discount: 0,
        totalAmount: 531,
        status: "UNPAID",
        paymentMethod: "",
        insuranceApprovedAmount: 0,
        items: [
          { description: "General Consultation Fee", quantity: 1, unitPrice: 450, amount: 450 }
        ]
      },
      appointmentId: apt.id
    };

    let savedItem: any = null;
    if (mongoConnected) {
      try {
        const doc = new (PatientModel as any)(patientData);
        savedItem = await doc.save();
      } catch (err) {
        console.error("[Database] Failed to write check-in to MongoDB, fallback to memory:", err);
      }
    }

    if (!savedItem) {
      savedItem = {
        _id: `mem_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        ...patientData
      };
      memoryQueue.push(savedItem);
    }

    logAction("receptionist@flowcare.ai", "Receptionist", "Checked-in Scheduled Patient", `Checked-in appointment ${apt.patientName} directly into queue Cabin with Token ${token}`);
    io.emit("queueUpdated");
    res.json({ success: true, patient: savedItem });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/patient/add -> Add patient & generate token
app.post("/api/patient/add", async (req, res) => {
  const { name, gender, phone, email, priority, assignedDoctor, department, insuranceName, insuranceId, medicalHistory } = req.body;
  
  if (!name || name.trim() === "") {
    return res.status(400).json({ success: false, error: "Patient name is required." });
  }

  try {
    const token = await generateNextToken();
    const uhid = generateUHID(name);
    
    // Set standard Base Consultation Invoice
    const consultBaseFee = priority === "EMERGENCY" ? 800 : 450;
    const items = [{ description: `${department} Consult Fee`, quantity: 1, unitPrice: consultBaseFee, amount: consultBaseFee }];
    const subtotal = consultBaseFee;
    const taxAmount = Math.round(subtotal * 0.18); // 18% GST
    const totalAmount = subtotal + taxAmount;

    const newPatientData = {
      token,
      name: name.trim(),
      uhid,
      gender: gender || "Male",
      dob: "1994-06-15",
      phone: phone || "+91 98765 43210",
      email: email || "patient@flowcare.ai",
      status: "waiting",
      priority: priority || "STANDARD",
      assignedDoctor: assignedDoctor || "Dr. Vikram Rathore",
      department: department || "General Medicine",
      insuranceName: insuranceName || "None",
      insuranceId: insuranceId || "",
      medicalHistory: medicalHistory ? [medicalHistory] : ["No prior allergies"],
      createdAt: new Date(),
      prescriptions: [],
      labOrders: [],
      billingInvoice: {
        subtotal,
        taxAmount,
        discount: 0,
        totalAmount,
        status: "UNPAID",
        paymentMethod: "",
        insuranceApprovedAmount: 0,
        items
      }
    };

    let savedItem: any = null;

    if (mongoConnected) {
      try {
        const doc = new (PatientModel as any)(newPatientData);
        savedItem = await doc.save();
      } catch (err) {
        console.error("[Database] Failed to write new patient to MongoDB, fallback to memory:", err);
      }
    }

    if (!savedItem) {
      savedItem = {
        _id: `mem_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        ...newPatientData
      };
      memoryQueue.push(savedItem);
    }

    console.log(`[Queue] Added patient: ${savedItem.name} ${savedItem.token}`);
    logAction("receptionist@flowcare.ai", "Receptionist", "Patient Checked-in", `Registered ${savedItem.name} with Token: ${savedItem.token} [Priority: ${savedItem.priority}]`);
    io.emit("queueUpdated");

    res.json({
      success: true,
      mongoConnected,
      patient: savedItem
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/inventory -> Fetch medicines inventory (compatibility)
app.get("/api/inventory", (req, res) => {
  res.json({ success: true, inventory: medicinesInventory });
});

// GET /api/audit-logs -> Fetch audit logs (compatibility)
app.get("/api/audit-logs", (req, res) => {
  res.json({ success: true, logs: auditLogs });
});

// POST /api/appointments/schedule -> Schedule appointment alias
app.post("/api/appointments/schedule", (req, res) => {
  const { name, phone, doctorName, specialty, date, timeSlot, gender, dob } = req.body;
  if (!name || !phone || !doctorName) {
    return res.status(400).json({ success: false, error: "Missing required details to book appointment." });
  }

  const charSum = name.split("").reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
  const noShowProbability = Math.min(95, Math.max(5, (charSum * 13) % 75));
  const newApt = {
    id: `apt_${Date.now()}`,
    patientName: name.trim(),
    patientPhone: phone.trim(),
    doctorName,
    specialty,
    date: date || "2026-06-22",
    timeSlot: timeSlot || "11:00 AM",
    status: "SCHEDULED",
    noShowProbability,
    uhid: generateUHID(name),
    gender: gender || "Male",
    dob: dob || "1994-06-15"
  };

  appointments.push(newApt);
  logAction("receptionist@flowcare.ai", "Receptionist", "Appointment Scheduled", `Booked ${newApt.patientName} for ${newApt.doctorName} on ${newApt.date} [AI No-Show risk: ${noShowProbability}%]`);
  io.emit("queueUpdated");
  res.json({ success: true, appointment: newApt });
});

// POST /api/appointments/checkin/:id -> Check-in appointment alias
app.post("/api/appointments/checkin/:id", async (req, res) => {
  const { id } = req.params;
  const matchIdx = appointments.findIndex(a => a.id === id);
  if (matchIdx === -1) {
    return res.status(404).json({ success: false, error: "Appointment not found." });
  }

  const apt = appointments[matchIdx];
  apt.status = "CHECKED_IN";

  try {
    const token = await generateNextToken();
    const patientData = {
      token,
      name: apt.patientName,
      uhid: apt.uhid,
      gender: apt.gender,
      dob: apt.dob,
      phone: apt.patientPhone,
      email: "patient@flowcare.ai",
      status: "waiting",
      priority: "STANDARD",
      assignedDoctor: apt.doctorName,
      department: apt.specialty,
      createdAt: new Date(),
      prescriptions: [],
      labOrders: [],
      billingInvoice: {
        subtotal: 450,
        taxAmount: 81,
        discount: 0,
        totalAmount: 531,
        status: "UNPAID",
        paymentMethod: "",
        insuranceApprovedAmount: 0,
        items: [
          { description: "General Consultation Fee", quantity: 1, unitPrice: 450, amount: 450 }
        ]
      },
      appointmentId: apt.id
    };

    let savedItem: any = null;
    if (mongoConnected) {
      try {
        const doc = new (PatientModel as any)(patientData);
        savedItem = await doc.save();
      } catch (err) {
        console.error("[Database] Failed to write check-in to MongoDB, fallback to memory:", err);
      }
    }

    if (!savedItem) {
      savedItem = {
        _id: `mem_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        ...patientData
      };
      memoryQueue.push(savedItem);
    }

    logAction("receptionist@flowcare.ai", "Receptionist", "Checked-in Scheduled Patient", `Checked-in appointment ${apt.patientName} directly into queue Cabin with Token ${token}`);
    io.emit("queueUpdated");
    res.json({ success: true, patient: savedItem, token });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/appointments/cancel/:id -> Cancel appointment alias
app.post("/api/appointments/cancel/:id", (req, res) => {
  const { id } = req.params;
  const match = appointments.find(a => a.id === id);
  if (match) {
    match.status = "CANCELLED";
    logAction("receptionist@flowcare.ai", "Receptionist", "Appointment Cancelled", `Cancelled slot for patient ${match.patientName}`);
    io.emit("queueUpdated");
    res.json({ success: true, appointment: match });
  } else {
    res.status(404).json({ success: false, error: "Appointment slot not found." });
  }
});

// POST /api/queue/completeConsultation -> Complete consultation alias
app.post("/api/queue/completeConsultation", async (req, res) => {
  const { patientId, consultNotes, soapNotes, prescriptions, labOrders, doctorName } = req.body;
  try {
    let patient: any = null;

    if (mongoConnected && patientId && mongoose.Types.ObjectId.isValid(patientId)) {
      try {
        patient = await (PatientModel as any).findById(patientId);
      } catch (err) {
        console.error("[Database] Failed to read patient for completion:", err);
      }
    }

    if (!patient && patientId) {
      patient = memoryQueue.find(p => p._id === patientId);
    }

    if (!patient) {
      if (mongoConnected) {
        patient = await (PatientModel as any).findOne({ status: "serving" }).sort({ createdAt: 1 });
      }
      if (!patient) {
        patient = memoryQueue.find(p => p.status === "serving");
      }
    }

    if (!patient) {
      return res.status(404).json({ success: false, error: "No patient is currently in active consultation serving status." });
    }

    patient.consultNotes = consultNotes || "";
    if (soapNotes) patient.soapNotes = soapNotes;
    
    if (prescriptions && prescriptions.length > 0) {
      patient.prescriptions = prescriptions.map((p: any) => ({
        drugName: p.drugName,
        dosage: p.dosage || "1 Tab",
        frequency: p.frequency || "1-0-1",
        duration: p.duration || "5 Days",
        qty: p.qty || 10,
        status: "PENDING"
      }));
    }

    if (labOrders && labOrders.length > 0) {
      patient.labOrders = labOrders.map((l: any) => ({
        testName: l.testName,
        status: "PENDING",
        resultDetails: "",
        updatedAt: new Date()
      }));
    }

    let nextStatus = "billing";
    if (patient.labOrders && patient.labOrders.length > 0) {
      nextStatus = "lab_pending";
    } else if (patient.prescriptions && patient.prescriptions.length > 0) {
      nextStatus = "pharmacy";
    }
    patient.status = nextStatus;

    let consultFee = patient.priority === "EMERGENCY" ? 800 : 450;
    let billingItems = [
      { description: `${patient.department} consultation fee`, quantity: 1, unitPrice: consultFee, amount: consultFee }
    ];

    if (patient.labOrders) {
      patient.labOrders.forEach((order: any) => {
        let cost = order.testName.toLowerCase().includes("blood") ? 750 : 1500;
        billingItems.push({ description: `Lab Test: ${order.testName}`, quantity: 1, unitPrice: cost, amount: cost });
      });
    }

    if (patient.prescriptions) {
      patient.prescriptions.forEach((item: any) => {
        const catalog = medicinesInventory.find(m => m.drugName.toLowerCase().includes(item.drugName.toLowerCase()));
        let price = catalog ? catalog.basePrice : 35;
        let qty = item.qty || 10;
        billingItems.push({ description: `Medicine: ${item.drugName}`, quantity: qty, unitPrice: price, amount: price * qty });
      });
    }

    const subtotal = billingItems.reduce((acc, item) => acc + item.amount, 0);
    const taxAmount = Math.round(subtotal * 0.18);
    const totalAmount = subtotal + taxAmount;

    patient.billingInvoice = {
      subtotal,
      taxAmount,
      discount: 0,
      totalAmount,
      status: "UNPAID",
      paymentMethod: "",
      insuranceApprovedAmount: 0,
      items: billingItems
    };

    if (mongoConnected && patient.save) {
      if (mongoose.Types.ObjectId.isValid(patient._id)) {
        await (PatientModel as any).findByIdAndUpdate(patient._id, patient);
      } else {
        await patient.save();
      }
    } else {
      // In-memory update
      const existingIdx = memoryQueue.findIndex(p => p._id === patient._id);
      if (existingIdx !== -1) {
        memoryQueue[existingIdx] = patient;
      }
    }

    logAction(
      doctorName || "doctor@flowcare.ai", 
      "Doctor", 
      "Consultation Signed & Dispatched", 
      `Saved SOAP notes for ${patient.name}. Dispatched to ${nextStatus.toUpperCase()} lane [Total Due: ₹${totalAmount}]`
    );
    
    io.emit("queueUpdated");
    res.json({ success: true, mongoConnected, patient });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/queue/submitLabResult -> Submit lab results alias
app.post("/api/queue/submitLabResult", async (req, res) => {
  const { patientId, testName, results } = req.body;
  if (!patientId || !testName || !results) {
    return res.status(400).json({ success: false, error: "Missing patientId, testName or results." });
  }

  try {
    let patient: any = null;
    if (mongoConnected && mongoose.Types.ObjectId.isValid(patientId)) {
      patient = await (PatientModel as any).findById(patientId);
    } else {
      patient = memoryQueue.find(p => p._id === patientId);
    }

    if (!patient) {
      return res.status(404).json({ success: false, error: "Patient clinical file not found." });
    }

    let allFinished = true;
    if (patient.labOrders && patient.labOrders.length > 0) {
      patient.labOrders.forEach((l: any) => {
        if (l.testName === testName || testName === "all") {
          l.status = "RESULT_READY";
          l.resultDetails = results;
          l.updatedAt = new Date();
        }
        if (l.status !== "RESULT_READY") {
          allFinished = false;
        }
      });
    }

    if (allFinished) {
      patient.status = (patient.prescriptions && patient.prescriptions.length > 0) ? "pharmacy" : "billing";
    } else {
      patient.status = "lab_processing";
    }

    if (mongoConnected) {
      await (PatientModel as any).findByIdAndUpdate(patient._id, {
        labOrders: patient.labOrders,
        status: patient.status
      });
    } else {
      const idx = memoryQueue.findIndex(p => p._id === patient._id);
      if (idx !== -1) {
        memoryQueue[idx] = patient;
      }
    }

    logAction("lab_tech@flowcare.ai", "Lab Technician", "Lab Report Published", `Completed ${testName} analysis for ${patient.name}. Advanced to ${patient.status.toUpperCase()}`);
    io.emit("queueUpdated");
    res.json({ success: true, patient });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/queue/dispense -> Dispense prescriptions alias
app.post("/api/queue/dispense", async (req, res) => {
  const { patientId } = req.body;
  if (!patientId) {
    return res.status(400).json({ success: false, error: "Patient ID is required." });
  }

  try {
    let patient: any = null;
    if (mongoConnected && mongoose.Types.ObjectId.isValid(patientId)) {
      patient = await (PatientModel as any).findById(patientId);
    } else {
      patient = memoryQueue.find(p => p._id === patientId);
    }

    if (!patient) {
      return res.status(404).json({ success: false, error: "Patient file not found." });
    }

    if (patient.prescriptions) {
      patient.prescriptions.forEach((item: any) => {
        item.status = "DISPENSED";
        const quantityToDeduct = item.qty || 10;
        const stockItem = medicinesInventory.find(m => m.drugName.toLowerCase().includes(item.drugName.toLowerCase()));
        if (stockItem) {
          stockItem.stock = Math.max(0, stockItem.stock - quantityToDeduct);
        }
      });
    }

    patient.status = "billing";

    if (mongoConnected) {
      await (PatientModel as any).findByIdAndUpdate(patient._id, {
        prescriptions: patient.prescriptions,
        status: patient.status
      });
    } else {
      const idx = memoryQueue.findIndex(p => p._id === patient._id);
      if (idx !== -1) {
        memoryQueue[idx] = patient;
      }
    }

    logAction("pharmacist@flowcare.ai", "Pharmacist", "Prescriptions Dispensed", `Verified & dispensed medication for ${patient.name}. Switched status to Billing.`);
    io.emit("queueUpdated");
    res.json({ success: true, patient });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/queue/settleInvoice -> Settle invoice alias
app.post("/api/queue/settleInvoice", async (req, res) => {
  const { patientId, paymentMethod, insuranceApprovedAmount } = req.body;
  if (!patientId) {
    return res.status(400).json({ success: false, error: "Patient ID is required." });
  }

  try {
    let patient: any = null;
    if (mongoConnected && mongoose.Types.ObjectId.isValid(patientId)) {
      patient = await (PatientModel as any).findById(patientId);
    } else {
      patient = memoryQueue.find(p => p._id === patientId);
    }

    if (!patient) {
      return res.status(404).json({ success: false, error: "Patient file not found." });
    }

    if (patient.billingInvoice) {
      patient.billingInvoice.status = "PAID";
      patient.billingInvoice.paymentMethod = paymentMethod || "UPI";
      patient.billingInvoice.insuranceApprovedAmount = insuranceApprovedAmount || 0;
    }

    patient.status = "completed";

    if (mongoConnected) {
      await (PatientModel as any).findByIdAndUpdate(patient._id, {
        billingInvoice: patient.billingInvoice,
        status: "completed"
      });
    } else {
      const idx = memoryQueue.findIndex(p => p._id === patient._id);
      if (idx !== -1) {
        memoryQueue[idx] = patient;
      }
    }

    logAction("billing_clerk@flowcare.ai", "Billing Desk", "Invoice Receipt Cleared", `Paid ₹${patient.billingInvoice ? patient.billingInvoice.totalAmount : 531} via ${paymentMethod || "UPI"} for patient ${patient.name}. Discharged.`);
    io.emit("queueUpdated");
    res.json({ success: true, patient });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/patient/update -> Live status override, doctor re-assign & info editor (NEW FEATURE!)
app.post("/api/patient/update", async (req, res) => {
  const { id, status, priority, assignedDoctor, name, phone } = req.body;
  if (!id) {
    return res.status(400).json({ success: false, error: "Patient ID is required." });
  }

  try {
    let patient: any = null;
    if (mongoConnected && mongoose.Types.ObjectId.isValid(id)) {
      patient = await (PatientModel as any).findById(id);
    } else {
      patient = memoryQueue.find(p => p._id === id);
    }

    if (!patient) {
      return res.status(404).json({ success: false, error: "Patient not found." });
    }

    if (status !== undefined) patient.status = status;
    if (priority !== undefined) patient.priority = priority;
    if (assignedDoctor !== undefined) {
      patient.assignedDoctor = assignedDoctor;
      // Set department automatically
      if (assignedDoctor === "Dr. Vikram Rathore") patient.department = "General Medicine";
      else if (assignedDoctor === "Dr. Ananya Sen") patient.department = "Cardiology";
      else if (assignedDoctor === "Dr. Siddhartha Das") patient.department = "Orthopedics";
      else if (assignedDoctor === "Dr. Preeti Patel") patient.department = "Pediatrics";
    }
    if (name !== undefined) patient.name = name;
    if (phone !== undefined) patient.phone = phone;

    // Save changes
    if (mongoConnected && patient.save) {
      if (mongoose.Types.ObjectId.isValid(patient._id)) {
        await (PatientModel as any).findByIdAndUpdate(patient._id, patient);
      } else {
        await patient.save();
      }
    } else {
      const idx = memoryQueue.findIndex(p => p._id === patient._id);
      if (idx !== -1) {
        memoryQueue[idx] = patient;
      }
    }

    logAction("receptionist@flowcare.ai", "Receptionist", "Patient Record Updated", `Updated patient ${patient.name} (${patient.token}) details at Intake Desk`);
    io.emit("queueUpdated");
    res.json({ success: true, patient });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/queue/next -> Call next patient in line (waiting -> serving)
app.post("/api/queue/next", async (req, res) => {
  const { doctorName } = req.body;
  try {
    let updatedPatient: any = null;

    if (mongoConnected) {
      try {
        // Enforce VIP and EMERGENCIES priority checks first!
        let query: any = { status: "waiting" };
        if (doctorName) {
          query.assignedDoctor = doctorName;
        }

        let targetPatient = await (PatientModel as any).findOne({ ...query, priority: "EMERGENCY" }).sort({ createdAt: 1 });
        if (!targetPatient) {
          targetPatient = await (PatientModel as any).findOne({ ...query, priority: "VIP" }).sort({ createdAt: 1 });
        }
        if (!targetPatient) {
          targetPatient = await (PatientModel as any).findOne(query).sort({ createdAt: 1 });
        }

        if (targetPatient) {
          targetPatient.status = "serving";
          if (doctorName) targetPatient.assignedDoctor = doctorName;
          updatedPatient = await targetPatient.save();
        }
      } catch (err) {
        console.error("[Database] Failed to advance patient in MongoDB:", err);
      }
    }

    if (!updatedPatient) {
      // Memory advanced prioritization logic
      let index = memoryQueue.findIndex(p => p.status === "waiting" && p.priority === "EMERGENCY");
      if (index === -1) {
        index = memoryQueue.findIndex(p => p.status === "waiting" && p.priority === "VIP");
      }
      if (index === -1) {
        index = memoryQueue.findIndex(p => p.status === "waiting");
      }

      if (index !== -1) {
        const p = memoryQueue[index];
        p.status = "serving";
        if (doctorName) p.assignedDoctor = doctorName;
        updatedPatient = p;
      }
    }

    if (updatedPatient) {
      logAction(
        doctorName ? `${doctorName.toLowerCase().replace(/ /g, "_")}@flowcare.ai` : "doctor@flowcare.ai", 
        "Doctor", 
        "Consultation Started", 
        `Dr. Vikram called Token ${updatedPatient.token} (${updatedPatient.name}) into cabin`
      );
      io.emit("queueUpdated");
      res.json({ success: true, mongoConnected, patient: updatedPatient });
    } else {
      res.json({ success: true, mongoConnected, message: "No patients are currently waiting.", patient: null });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/queue/complete -> Complete consultation, add SOAP, prescriptions, lab orders, advance status
app.post("/api/queue/complete", async (req, res) => {
  const { id, consultNotes, soapNotes, prescriptions, labOrders, doctorName } = req.body;
  try {
    let patient: any = null;

    if (mongoConnected && id && mongoose.Types.ObjectId.isValid(id)) {
      try {
        patient = await (PatientModel as any).findById(id);
      } catch (err) {
        console.error("[Database] Failed to read patient for completion:", err);
      }
    }

    if (!patient && id) {
      patient = memoryQueue.find(p => p._id === id);
    }

    // Auto find currently serving patient if no specific ID provided
    if (!patient) {
      if (mongoConnected) {
        patient = await (PatientModel as any).findOne({ status: "serving" }).sort({ createdAt: 1 });
      }
      if (!patient) {
        patient = memoryQueue.find(p => p.status === "serving");
      }
    }

    if (!patient) {
      return res.status(404).json({ success: false, error: "No patient is currently in active consultation serving status." });
    }

    // Save Clinical SOAP notes and consultation summaries
    patient.consultNotes = consultNotes || "";
    if (soapNotes) patient.soapNotes = soapNotes;
    
    // Structure Prescription Drugs
    if (prescriptions && prescriptions.length > 0) {
      patient.prescriptions = prescriptions.map((p: any) => ({
        drugName: p.drugName,
        dosage: p.dosage || "1 Tab",
        frequency: p.frequency || "1-0-1",
        duration: p.duration || "5 Days",
        qty: p.qty || 10,
        status: "PENDING"
      }));
    }

    // Structure Diagnostic Lab Orders
    if (labOrders && labOrders.length > 0) {
      patient.labOrders = labOrders.map((l: any) => ({
        testName: l.testName,
        status: "PENDING",
        resultDetails: "",
        updatedAt: new Date()
      }));
    }

    // Advance patient to the next systematic check point in hospital pipeline!
    // 1. If Lab Tests Ordered -> "lab_pending"
    // 2. If NO Labs, but has Drug Prescriptions -> "pharmacy"
    // 3. If NO Labs AND NO Drugs -> "billing"
    let nextStatus = "billing";
    if (patient.labOrders && patient.labOrders.length > 0) {
      nextStatus = "lab_pending";
    } else if (patient.prescriptions && patient.prescriptions.length > 0) {
      nextStatus = "pharmacy";
    }
    patient.status = nextStatus;

    // Expand Billing Invoice based on digital dispatches!
    let consultFee = patient.priority === "EMERGENCY" ? 800 : 450;
    let billingItems = [
      { description: `${patient.department} consultation fee`, quantity: 1, unitPrice: consultFee, amount: consultFee }
    ];

    if (patient.labOrders) {
      patient.labOrders.forEach((order: any) => {
        let cost = order.testName.toLowerCase().includes("blood") ? 750 : 1500;
        billingItems.push({ description: `Lab Test: ${order.testName}`, quantity: 1, unitPrice: cost, amount: cost });
      });
    }

    if (patient.prescriptions) {
      patient.prescriptions.forEach((item: any) => {
        const catalog = medicinesInventory.find(m => m.drugName.toLowerCase().includes(item.drugName.toLowerCase()));
        let price = catalog ? catalog.basePrice : 35;
        let qty = item.qty || 10;
        billingItems.push({ description: `Medicine: ${item.drugName}`, quantity: qty, unitPrice: price, amount: price * qty });
      });
    }

    const subtotal = billingItems.reduce((acc, item) => acc + item.amount, 0);
    const taxAmount = Math.round(subtotal * 0.18); // 18% GST Support
    const totalAmount = subtotal + taxAmount;

    patient.billingInvoice = {
      subtotal,
      taxAmount,
      discount: 0,
      totalAmount,
      status: "UNPAID",
      paymentMethod: "",
      insuranceApprovedAmount: 0,
      items: billingItems
    };

    if (mongoConnected && patient.save) {
      await patient.save();
    }

    console.log(`[Queue] Advanced patient ${patient.name} (${patient.token}) to Status: ${nextStatus}`);
    logAction(
      doctorName || "doctor@flowcare.ai", 
      "Doctor", 
      "Consultation Signed & Dispatched", 
      `Saved SOAP notes for ${patient.name}. Dispatched to ${nextStatus.toUpperCase()} lane [Total Due: ₹${totalAmount}]`
    );
    
    io.emit("queueUpdated");
    res.json({ success: true, mongoConnected, patient });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/lab/submit-result -> Submit lab technician report findings
app.post("/api/lab/submit-result", async (req, res) => {
  const { id, testName, resultDetails } = req.body;
  if (!id || !testName || !resultDetails) {
    return res.status(400).json({ success: false, error: "Missing ID, testName or report results details." });
  }

  try {
    let patient: any = null;

    if (mongoConnected && mongoose.Types.ObjectId.isValid(id)) {
      patient = await (PatientModel as any).findById(id);
    } else {
      patient = memoryQueue.find(p => p._id === id);
    }

    if (!patient) {
      return res.status(404).json({ success: false, error: "Patient clinical file not found." });
    }

    // Mark specific lab order test ready
    let allFinished = true;
    if (patient.labOrders && patient.labOrders.length > 0) {
      patient.labOrders.forEach((l: any) => {
        if (l.testName === testName || testName === "all") {
          l.status = "RESULT_READY";
          l.resultDetails = resultDetails;
          l.updatedAt = new Date();
        }
        if (l.status !== "RESULT_READY") {
          allFinished = false;
        }
      });
    }

    // If all tests ordered are finished, advance to Pharmacy (if has items) or Billing direkt
    if (allFinished) {
      patient.status = (patient.prescriptions && patient.prescriptions.length > 0) ? "pharmacy" : "billing";
    } else {
      patient.status = "lab_processing";
    }

    if (mongoConnected && patient.save) {
      await (PatientModel as any).findByIdAndUpdate(patient._id, {
        labOrders: patient.labOrders,
        status: patient.status
      });
    }

    logAction("lab_tech@flowcare.ai", "Lab Technician", "Lab Report Published", `Completed ${testName} analysis for ${patient.name}. Advanced to ${patient.status.toUpperCase()}`);
    io.emit("queueUpdated");
    res.json({ success: true, patient });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/pharmacy/dispense -> Marks Rx filled, auto-decrements medicine inventories
app.post("/api/pharmacy/dispense", async (req, res) => {
  const { id } = req.body;
  if (!id) {
    return res.status(400).json({ success: false, error: "Patient ID is required." });
  }

  try {
    let patient: any = null;

    if (mongoConnected && mongoose.Types.ObjectId.isValid(id)) {
      patient = await (PatientModel as any).findById(id);
    } else {
      patient = memoryQueue.find(p => p._id === id);
    }

    if (!patient) {
      return res.status(404).json({ success: false, error: "Patient file not found." });
    }

    // Deduct stock inventory and update prescription drug status
    if (patient.prescriptions) {
      patient.prescriptions.forEach((item: any) => {
        item.status = "DISPENSED";
        const quantityToDeduct = item.qty || 10;
        
        // Find inside inventory matching
        const stockItem = medicinesInventory.find(m => m.drugName.toLowerCase().includes(item.drugName.toLowerCase()));
        if (stockItem) {
          stockItem.stock = Math.max(0, stockItem.stock - quantityToDeduct);
        }
      });
    }

    // Advance queue to Billing cashier desk
    patient.status = "billing";

    if (mongoConnected && patient.save) {
      await (PatientModel as any).findByIdAndUpdate(patient._id, {
        prescriptions: patient.prescriptions,
        status: patient.status
      });
    }

    logAction("pharmacist@flowcare.ai", "Pharmacist", "Prescriptions Dispensed", `Verified & dispensed active medication list for ${patient.name}. Switched status to Billing.`);
    io.emit("queueUpdated");
    res.json({ success: true, patient });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/billing/pay -> Process pay, claim insurances, clear queue item to discharged completed history
app.post("/api/billing/pay", async (req, res) => {
  const { id, paymentMethod, insuranceApprovedAmount } = req.body;
  if (!id) {
    return res.status(400).json({ success: false, error: "Patient ID is required." });
  }

  try {
    let patient: any = null;

    if (mongoConnected && mongoose.Types.ObjectId.isValid(id)) {
      patient = await (PatientModel as any).findById(id);
    } else {
      patient = memoryQueue.find(p => p._id === id);
    }

    if (!patient) {
      return res.status(404).json({ success: false, error: "Patient file not found." });
    }

    // Mark billing invoice cleared!
    if (patient.billingInvoice) {
      patient.billingInvoice.status = "PAID";
      patient.billingInvoice.paymentMethod = paymentMethod || "UPI";
      patient.billingInvoice.insuranceApprovedAmount = insuranceApprovedAmount || 0;
    }

    // Discharge patient fully!
    patient.status = "completed";

    if (mongoConnected && patient.save) {
      await (PatientModel as any).findByIdAndUpdate(patient._id, {
        billingInvoice: patient.billingInvoice,
        status: "completed"
      });
    }

    logAction("billing_clerk@flowcare.ai", "Billing Desk", "Invoice Receipt Cleared", `Paid ₹${patient.billingInvoice ? patient.billingInvoice.totalAmount : 531} via ${paymentMethod || "UPI"} for patient ${patient.name}. Discharged.`);
    io.emit("queueUpdated");
    res.json({ success: true, patient });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/settings -> Change average consultations settings
app.post("/api/settings", (req, res) => {
  const { avgTime } = req.body;
  const parsed = parseInt(avgTime, 10);
  if (!isNaN(parsed) && parsed > 0) {
    averageConsultationTime = parsed;
    logAction("admin@flowcare.ai", "Hospital Admin", "Metrics Updated", `Set lobby waiting standard rate to ${averageConsultationTime} minutes.`);
    io.emit("queueUpdated");
    res.json({ success: true, averageConsultationTime });
  } else {
    res.status(400).json({ success: false, error: "Invalid Average Consultation Time value." });
  }
});

// POST /api/queue/reset -> Clear entire dataset
app.post("/api/queue/reset", async (req, res) => {
  try {
    if (mongoConnected) {
      try {
        await (PatientModel as any).deleteMany({});
      } catch (err) {
        console.error("[Database] Failed to clear MongoDB collection:", err);
      }
    }
    memoryQueue = [];
    auditLogs = [{ id: "log_init", timestamp: new Date().toISOString(), userEmail: "admin@flowcare.ai", role: "Super Admin", action: "SaaS Database Reset", details: "Purged all operations logs and queue histories" }];
    logAction("admin@flowcare.ai", "Super Admin", "Lobby Clean Reset", "All active workflows and lobby items purged cleanly.");
    io.emit("queueUpdated");
    res.json({ success: true, mongoConnected, message: "Queue database cleared successfully." });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/queue/seed -> Seeds premium high-fidelity healthcare logs for instant clinical showcase
app.post("/api/queue/seed", async (req, res) => {
  try {
    // Clear first
    if (mongoConnected) {
      await (PatientModel as any).deleteMany({});
    }
    memoryQueue = [];

    // Base Seed Datasets
    const rawSeeds = [
      {
        token: "A1",
        name: "Rahul Sharma",
        uhid: "IN-FC-384910",
        gender: "Male",
        dob: "1985-05-12",
        phone: "+91 98012 34567",
        email: "rahul.sharma@gmail.com",
        priority: "VIP",
        assignedDoctor: "Dr. Vikram Rathore",
        department: "General Medicine",
        status: "completed",
        consultNotes: "Patient complained of severe throbbing migraine and nausea over last 3 days.",
        soapNotes: {
          subjective: "Throbbing temporal head pain radiating to occiput, score 8/10. Visual aura noted.",
          objective: "Vitals: BP 120/80 mmHg, HR 72 bpm, pupil reactions normal, cranial nerves intact.",
          assessment: "Acute Migraine headache cluster.",
          plan: "Prescribed Sumatriptan for rescue abortive relief and Paracetamol for pain. Bed rest encouraged."
        },
        createdAt: new Date(Date.now() - 14400000), // 4 hours ago
        prescriptions: [
          { drugName: "Paracetamol 650mg", dosage: "1 Tab", frequency: "1-0-1", duration: "3 Days", qty: 6, status: "DISPENSED" }
        ],
        labOrders: [],
        billingInvoice: {
          subtotal: 570,
          taxAmount: 102.6,
          discount: 0,
          totalAmount: 672.6,
          status: "PAID",
          paymentMethod: "UPI",
          items: [
            { description: "General Medicine Consult Fee", quantity: 1, unitPrice: 450, amount: 450 },
            { description: "Medicine: Paracetamol 650mg", quantity: 6, unitPrice: 20, amount: 120 }
          ]
        }
      },
      {
        token: "A2",
        name: "Meera Nair",
        uhid: "IN-FC-290130",
        gender: "Female",
        dob: "1974-12-08",
        phone: "+91 94451 09214",
        email: "meera.nair@hotmail.com",
        priority: "EMERGENCY",
        assignedDoctor: "Dr. Ananya Sen",
        department: "Cardiology",
        status: "billing",
        consultNotes: "Re-evaluation for occasional palpitation flutters and slight shortness of breath after climbing steps.",
        soapNotes: {
          subjective: "Sensation of brief rapid skipped heartbeats during minimal physical activity. Tiredness.",
          objective: "High BP: 145/95 mmHg, irregular cardiac rhythm, mild bilateral ankle edema noted.",
          assessment: "Essential Hypertension; suspected Paroxysmal Atrial Fibrillation.",
          plan: "Immediate 12-lead ECG scan. Order lipid profile, prescribe Atorvastatin + Metoprolol."
        },
        createdAt: new Date(Date.now() - 10800000), // 3 hours ago
        prescriptions: [
          { drugName: "Atorvastatin 20mg", dosage: "1 Tab", frequency: "0-0-1", duration: "30 Days", qty: 30, status: "PENDING" }
        ],
        labOrders: [
          { testName: "ECG Cardiological Graph", status: "RESULT_READY", resultDetails: "Sinus rhythm with occasional premature narrow-QRS ventricular beats.", updatedAt: new Date() },
          { testName: "Blood Lipid Panel", status: "RESULT_READY", resultDetails: "Total Cholesterol: 245 mg/dL (High), LDL: 155 mg/dL (Elevated)", updatedAt: new Date() }
        ],
        billingInvoice: {
          subtotal: 5450,
          taxAmount: 981,
          discount: 0,
          totalAmount: 6431,
          status: "UNPAID",
          paymentMethod: "",
          items: [
            { description: "Cardiology Consult Fee", quantity: 1, unitPrice: 800, amount: 800 },
            { description: "Lab Test: ECG Cardiological Graph", quantity: 1, unitPrice: 1500, amount: 1500 },
            { description: "Lab Test: Blood Lipid Panel", quantity: 1, unitPrice: 750, amount: 750 },
            { description: "Medicine: Atorvastatin 20mg", quantity: 30, unitPrice: 80, amount: 2400 }
          ]
        }
      },
      {
        token: "A3",
        name: "Abhishek Roy",
        uhid: "IN-FC-890214",
        gender: "Male",
        dob: "1991-03-22",
        phone: "+91 88876 54321",
        email: "abhishek.roy@yahoo.com",
        priority: "STANDARD",
        assignedDoctor: "Dr. Siddhartha Das",
        department: "Orthopedics",
        status: "pharmacy",
        consultNotes: "Twisted right ankle while playing basketball yesterday. Tender over lateral malleolus.",
        soapNotes: {
          subjective: "Severe pain and swollen ankle joint, unable to bear full weight directly.",
          objective: "Ecchymosis over lateral ankle, extreme tenderness, passive inversion produces sharp flare.",
          assessment: "Ankle Ligament Sprain - Grade II.",
          plan: "X-Ray imaging to rule out bone fracture. Apply compression, ICE, prescribe Ibuprofen."
        },
        createdAt: new Date(Date.now() - 7200000), // 2 hours ago
        prescriptions: [
          { drugName: "Ibuprofen 400mg", dosage: "1 Tab", frequency: "1-0-1", duration: "5 Days", qty: 10, status: "PENDING" }
        ],
        labOrders: [
          { testName: "Ankle Joint X-Ray Imaging", status: "RESULT_READY", resultDetails: "Bones intact, no cortical fracture line. Soft tissue edema surrounding lateral malleolus.", updatedAt: new Date() }
        ],
        billingInvoice: {
          subtotal: 2200,
          taxAmount: 396,
          discount: 0,
          totalAmount: 2596,
          status: "UNPAID",
          items: [
            { description: "Orthopedics Consult Fee", quantity: 1, unitPrice: 450, amount: 450 },
            { description: "Lab Test: Ankle Joint X-Ray Imaging", quantity: 1, unitPrice: 1500, amount: 1500 },
            { description: "Medicine: Ibuprofen 400mg", quantity: 10, unitPrice: 25, amount: 250 }
          ]
        }
      },
      {
        token: "A4",
        name: "Suresh Tendulkar",
        uhid: "IN-FC-401293",
        gender: "Male",
        dob: "1960-07-30",
        phone: "+91 98760 11223",
        email: "suresh.tendulkar@gmail.com",
        priority: "STANDARD",
        assignedDoctor: "Dr. Vikram Rathore",
        department: "General Medicine",
        status: "lab_pending",
        consultNotes: "Diabetic routine follow-up check. Complaints of intermittent fatigue and polyuria.",
        soapNotes: {
          subjective: "Fatigue episodes during mid-days, hunger peaks, dryness of mouth.",
          objective: "Weight: 84kg, BMI: 28.5, BP: 130/85 mmHg, lungs clear, no peripheral ulcer wounds.",
          assessment: "Type II Diabetes Mellitus.",
          plan: "Ordered Fasting Blood Glucose (FBG) and HbA1c tests. Adjust daily Metformin dose."
        },
        createdAt: new Date(Date.now() - 3600000), // 1 hour ago
        prescriptions: [
          { drugName: "Metformin 500mg", dosage: "1 Tab", frequency: "1-1-1", duration: "30 Days", qty: 90, status: "PENDING" }
        ],
        labOrders: [
          { testName: "Blood HbA1c Glycated Hemoglobin", status: "PENDING", resultDetails: "", updatedAt: new Date() }
        ],
        billingInvoice: {
          subtotal: 2550,
          taxAmount: 459,
          discount: 0,
          totalAmount: 3009,
          status: "UNPAID",
          items: [
            { description: "General Medicine Consult Fee", quantity: 1, unitPrice: 450, amount: 450 },
            { description: "Lab Test: Blood HbA1c Glycated Hemoglobin", quantity: 1, unitPrice: 750, amount: 750 },
            { description: "Medicine: Metformin 500mg", quantity: 90, unitPrice: 15, amount: 1350 }
          ]
        }
      },
      {
        token: "A5",
        name: "Pooja Hegde",
        uhid: "IN-FC-701321",
        gender: "Female",
        dob: "1994-10-13",
        phone: "+91 90088 77665",
        email: "pooja.hegde@outlook.com",
        priority: "VIP",
        assignedDoctor: "Dr. Vikram Rathore",
        department: "General Medicine",
        status: "waiting",
        createdAt: new Date(Date.now() - 900000), // 15 mins ago
        prescriptions: [],
        labOrders: []
      }
    ];

    for (const item of rawSeeds) {
      if (mongoConnected) {
        const doc = new (PatientModel as any)(item);
        await doc.save();
      } else {
        const memItem = {
          _id: `mem_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
          ...item
        };
        memoryQueue.push(memItem);
      }
    }

    logAction("admin@flowcare.ai", "Super Admin", "Demonstration Database Seeded", "Successfully generated 5 diverse patients across waiting, lab, pharmacy, and billing checkpoints.");
    io.emit("queueUpdated");
    res.json({ success: true, seededCount: rawSeeds.length });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// SOCKET.IO REAL-TIME EVENTS
// ==========================================
io.on("connection", (socket) => {
  console.log(`[Socket.IO] New client connected: ${socket.id}`);
  
  socket.on("disconnect", () => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
  });
});

// ==========================================
// VITE DEV SERVER & PRODUCTION HANDLERS
// ==========================================
async function runServer() {
  await connectDB();

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`================================================================`);
    console.log(`[Server] Live Clinic Queue Manager Running: http://localhost:${PORT}`);
    console.log(`================================================================`);
  });
}

runServer();
