import React, { useState, useEffect } from "react";
import { io, Socket } from "socket.io-client";
import { 
  Users, Activity, Clock, Shield, Monitor, BarChart3, 
  Settings, Heart, Sparkles, Volume2, Plus, RefreshCw, Trash2,
  Lock, LogOut, BookOpen, User, CheckCircle2, AlertTriangle, Fingerprint,
  History
} from "lucide-react";

// Import modular panels
import IntakeDesk from "./components/IntakeDesk";
import DoctorCabin from "./components/DoctorCabin";
import DiagnosticsDesk from "./components/DiagnosticsDesk";
import PharmacyDesk from "./components/PharmacyDesk";
import BillingDesk from "./components/BillingDesk";
import BiDashboard from "./components/BiDashboard";
import LobbyBoard from "./components/LobbyBoard";
import HistoryArchive from "./components/HistoryArchive";

export const ROLE_CREDENTIALS: Record<string, { name: string; password: string; allowedTabs: string[]; icon: string; description: string }> = {
  receptionist: { 
    name: "Receptionist", 
    password: "recep123", 
    allowedTabs: ["overview", "receptionist", "lobby", "bi", "controls"],
    icon: "🏢",
    description: "Manage register rosters, patient intake, check-ins, and priority settings"
  },
  patient: { 
    name: "Patient", 
    password: "pat123", 
    allowedTabs: ["overview", "lobby"],
    icon: "👤",
    description: "Read-only access to TV wait durations, billing stats, & real-time announcements"
  },
  doctor: { 
    name: "Doctor", 
    password: "doc123", 
    allowedTabs: ["overview", "doctor", "lobby", "bi"],
    icon: "🩺",
    description: "Diagnose patients, submit soap logs, formulate labs test, and prescribe medication"
  },
  lab_assistant: { 
    name: "Lab Assistant", 
    password: "lab123", 
    allowedTabs: ["overview", "diagnostics", "lobby"],
    icon: "🧪",
    description: "Examine status orders, update diagnostics reports, publish clinical files"
  },
  pharmacy: { 
    name: "Pharmacy", 
    password: "pharm123", 
    allowedTabs: ["overview", "pharmacy", "lobby"],
    icon: "💊",
    description: "Review prescriptions queue, deduct stock units, complete medication dispense"
  },
  cashier: { 
    name: "Cashier", 
    password: "cash123", 
    allowedTabs: ["overview", "billing", "lobby"],
    icon: "💳",
    description: "Audit billing invoices, receive payments (UPI/Cash), discharge patients"
  }
};

let socket: Socket;

export default function App() {
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(() => {
    return localStorage.getItem("flowcare_user_role") || null;
  });

  const [activeTab, setActiveTab] = useState<
    "overview" | "receptionist" | "doctor" | "diagnostics" | "pharmacy" | "billing" | "lobby" | "bi" | "controls"
  >(() => {
    const savedRole = localStorage.getItem("flowcare_user_role");
    if (savedRole && ROLE_CREDENTIALS[savedRole]) {
      // Pick professional default tab per role
      const tabs = ROLE_CREDENTIALS[savedRole].allowedTabs;
      return (tabs.find(t => t !== "overview") || "overview") as any;
    }
    return "overview";
  });

  // Login form field states
  const [formRole, setFormRole] = useState<string>("receptionist");
  const [formPassword, setFormPassword] = useState<string>("");
  const [loginError, setLoginError] = useState<string>("");

  // Global state arrays
  const [patients, setPatients] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [avgConsultTime, setAvgConsultTime] = useState(10);

  // Connection & settings states
  const [isConnected, setIsConnected] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lastCalledPatientId, setLastCalledPatientId] = useState("");
  const [errorText, setErrorText] = useState("");
  const [successText, setSuccessText] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [showHistoryArchive, setShowHistoryArchive] = useState(false);

  // Sync state helper
  const syncApplicationData = async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      // 1. Fetch Patients Queue
      const queueRes = await fetch("/api/queue");
      const queueData = await queueRes.json();
      if (queueData.success) {
        setPatients(queueData.queue || []);
        setAvgConsultTime(queueData.averageConsultationTime || 10);
      }

      // 2. Fetch Appointments
      const aptRes = await fetch("/api/appointments");
      const aptData = await aptRes.json();
      if (aptData.success) {
        setAppointments(aptData.appointments || []);
      }

      // 3. Fetch Medicines Inventory
      const invRes = await fetch("/api/inventory");
      const invData = await invRes.json();
      if (invData.success) {
        setInventory(invData.inventory || []);
      }

      // 4. Fetch Audit log files
      const logsRes = await fetch("/api/audit-logs");
      const logsData = await logsRes.json();
      if (logsData.success) {
        setAuditLogs(logsData.logs || []);
      }

      setErrorText("");
    } catch (err) {
      console.error("Clinical API fetch error:", err);
      setErrorText("Clinic APIs are momentarily offline. Retrying standard sync...");
    } finally {
      if (!silent) setRefreshing(false);
    }
  };

  // Connect WebSockets and fetch initial data
  useEffect(() => {
    socket = io({
      reconnectionAttempts: 5,
      reconnectionDelay: 2000
    });

    socket.on("connect", () => {
      setIsConnected(true);
      setErrorText("");
      syncApplicationData(true);
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
    });

    // Real-time broad event hooks
    socket.on("queueUpdated", () => {
      syncApplicationData(true);
    });

    socket.on("inventoryUpdated", () => {
      syncApplicationData(true);
    });

    socket.on("appointmentsUpdated", () => {
      syncApplicationData(true);
    });

    socket.on("auditLogsUpdated", () => {
      syncApplicationData(true);
    });

    syncApplicationData();

    return () => {
      socket.disconnect();
    };
  }, []);

  // Web Speech Synthesis Speaker
  useEffect(() => {
    const activeServing = patients.find(p => p.status === "serving");
    if (activeServing && activeServing._id !== lastCalledPatientId) {
      if (soundEnabled && lastCalledPatientId) {
        speakPatientTokenCall(activeServing.token, activeServing.name, activeServing.assignedDoctor);
      }
      setLastCalledPatientId(activeServing._id);
    }
  }, [patients, lastCalledPatientId, soundEnabled]);

  const speakPatientTokenCall = (token: string, name: string, doc: string) => {
    try {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const docSurname = doc.split(" ").slice(-1)[0] || "Physician";
        const msg = new SpeechSynthesisUtterance(
          `Now serving patient Token ${token.split("").join(" ")}. ${name}. Proceed to Doctor ${docSurname} room.`
        );
        msg.rate = 0.95;
        msg.pitch = 1.0;
        window.speechSynthesis.speak(msg);
      }
    } catch (err) {
      console.error("Synthesizer error:", err);
    }
  };

  // --- BUSINESS OPERATION TRIGGERS ---

  // 1. Register walk-in
  const handleAddPatient = async (patientData: any) => {
    try {
      const res = await fetch("/api/patient/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patientData)
      });
      const data = await res.json();
      if (data.success) {
        triggerFeedback(`Walk-in patient check-in success! Issued Token ${data.patient.token}`);
      } else {
        setErrorText(data.error || "Could not register walk-in patient");
      }
    } catch (err) {
      setErrorText("EHR database is offline.");
    }
  };

  // 2. Schedule Appointment slot
  const handleScheduleAppointment = async (aptData: any) => {
    try {
      const res = await fetch("/api/appointments/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(aptData)
      });
      const data = await res.json();
      if (data.success) {
        triggerFeedback("Appointment slot allocated successfully.");
      } else {
        setErrorText(data.error || "Could not allocate slot.");
      }
    } catch (err) {
      setErrorText("Consultation calendar router is offline.");
    }
  };

  // 3. Check-In Appointment slot
  const handleCheckInAppointment = async (id: string) => {
    try {
      const res = await fetch(`/api/appointments/checkin/${id}`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        triggerFeedback(`Checked in appointment into waitlist! Issued Token ${data.token}`);
      } else {
        setErrorText(data.error || "Check-in failed.");
      }
    } catch (err) {
      setErrorText("Clinic router failure.");
    }
  };

  // 4. Cancel Appointment
  const handleCancelAppointment = async (id: string) => {
    try {
      await fetch(`/api/appointments/cancel/${id}`, { method: "POST" });
      triggerFeedback("Roster slot cancelled.");
    } catch (err) {
      setErrorText("Sync cancel error.");
    }
  };

  // 5. Call next patient (Doctor Cabin)
  const handleCallNextPatient = async (doctorName: string) => {
    try {
      const res = await fetch("/api/queue/next", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doctorName })
      });
      const data = await res.json();
      if (data.success && data.patient) {
        triggerFeedback(`Now Calling token ${data.patient.token} (${data.patient.name})`);
      } else {
        triggerFeedback(data.message || "Lobby queue empty for this specialty.");
      }
    } catch (err) {
      setErrorText("Vitals connector failed.");
    }
  };

  // 6. Clinician Discharge Checklist Complete
  const handleCompleteConsultation = async (id: string, consultData: any) => {
    try {
      const res = await fetch("/api/queue/completeConsultation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId: id, ...consultData })
      });
      const data = await res.json();
      if (data.success) {
        triggerFeedback("Consultation finalized & files signed.");
      } else {
        setErrorText(data.error || "Could not sign case file.");
      }
    } catch (err) {
      setErrorText("EHR locker failed.");
    }
  };

  // 7. Technologist Submit Lab results
  const handleSubmitLabResult = async (patientId: string, testName: string, results: string) => {
    try {
      const res = await fetch("/api/queue/submitLabResult", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId, testName, results })
      });
      const data = await res.json();
      if (data.success) {
        triggerFeedback("Lab report parameters uploaded successfully!");
      } else {
        setErrorText(data.error || "Could not submit report.");
      }
    } catch (err) {
      setErrorText("Specimen tracker error.");
    }
  };

  // 8. Pharmacy Prescriptions Dispense
  const handleDispensePrescription = async (id: string) => {
    try {
      const res = await fetch("/api/queue/dispense", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId: id })
      });
      const data = await res.json();
      if (data.success) {
        triggerFeedback("Drugs packing & dispensing complete!");
      } else {
        setErrorText(data.error || "Inadequate stock on inventory.");
      }
    } catch (err) {
      setErrorText("Inventory catalog error.");
    }
  };

  // 9. Casher invoice settlement
  const handleSettleInvoice = async (patientId: string, paymentMethod: string, insuranceAmt: number) => {
    try {
      const res = await fetch("/api/queue/settleInvoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId, paymentMethod, insuranceApprovedAmount: insuranceAmt })
      });
      const data = await res.json();
      if (data.success) {
        triggerFeedback("Invoice payment cleared. Patient fully discharged.");
      } else {
        setErrorText(data.error || "Payment clearing failed.");
      }
    } catch (err) {
      setErrorText("Clearinghouse gateway failure.");
    }
  };

  // 10. Seed Sandbox sandbox helper
  const handleSeedSandbox = async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/queue/seed", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        triggerFeedback("Sandbox populated instantly with dynamic clinical test states!");
      }
    } catch (err) {
      setErrorText("Db seeding failure.");
    } finally {
      setRefreshing(false);
    }
  };

  // 11. Database Hard Clean reset
  const handleResetApplication = async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/queue/reset", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setPatients([]);
        setAppointments([]);
        triggerFeedback("All operational records purged from laboratory DB.");
      }
    } catch (err) {
      setErrorText("Purge DB failed.");
    } finally {
      setRefreshing(false);
    }
  };

  // 12. Update Patient details and status
  const handleUpdatePatient = async (id: string, updatedFields: any) => {
    try {
      const res = await fetch("/api/patient/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...updatedFields })
      });
      const data = await res.json();
      if (data.success) {
        triggerFeedback(`Updated patient details successfully.`);
      } else {
        setErrorText(data.error || "Update patient failed.");
      }
    } catch (err) {
      setErrorText("Record update connection failed.");
    }
  };

  // Utils
  const triggerFeedback = (message: string) => {
    setSuccessText(message);
    setTimeout(() => setSuccessText(""), 4500);
  };

  const handleQuickLogin = (role: string) => {
    const creds = ROLE_CREDENTIALS[role];
    if (creds) {
      localStorage.setItem("flowcare_user_role", role);
      setCurrentUserRole(role);
      // Pick first default active tab that is not overview for instant action focus
      const targetTab = (creds.allowedTabs.find(t => t !== "overview") || "overview") as any;
      setActiveTab(targetTab);
      triggerFeedback(`Successfully logged in to the ${creds.name} Workstation!`);
      setLoginError("");
      setFormPassword("");
    }
  };

  const handleManualLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const creds = ROLE_CREDENTIALS[formRole];
    if (!creds) {
      setLoginError("Unknown clinic workstation. Please choose a valid role.");
      return;
    }
    if (formPassword === creds.password) {
      localStorage.setItem("flowcare_user_role", formRole);
      setCurrentUserRole(formRole);
      const targetTab = (creds.allowedTabs.find(t => t !== "overview") || "overview") as any;
      setActiveTab(targetTab);
      triggerFeedback(`Successfully authorized into ${creds.name} Workstation!`);
      setLoginError("");
      setFormPassword("");
    } else {
      setLoginError(`Invalid password for ${creds.name}. Hint: use ${creds.password}`);
    }
  };

  // If no user role is authenticated, force render clinical gateway login
  if (!currentUserRole) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans border-t-4 border-blue-600 selection:bg-blue-100 selection:text-blue-950">
        <header className="bg-white border-b border-slate-200 py-4 px-6 shadow-3xs">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center space-x-2.5">
              <span className="h-10 w-10 bg-blue-600 text-white rounded-xl flex items-center justify-center font-black text-lg shadow-sm">
                FC
              </span>
              <div>
                <div className="flex items-center space-x-1.5">
                  <h1 className="font-black text-slate-900 text-sm tracking-tight">FLOWCARE AI</h1>
                  <span className="bg-slate-900 text-white text-[8px] font-black uppercase px-1.5 py-0.2 rounded tracking-wide">SaaS v2.0</span>
                </div>
                <p className="text-[10px] text-slate-500 font-semibold font-mono">Patient Flow Operating System</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowHistoryArchive(true)}
                className="bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold px-4 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer border border-purple-200 shadow-3xs"
              >
                <History className="h-4 w-4" />
                <span>Patient History 📜</span>
              </button>

              <button
                onClick={() => window.open("/manual.html", "_blank")}
                className="bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold px-4 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer border border-blue-200 shadow-3xs"
              >
                <BookOpen className="h-4 w-4" />
                <span>SOP Manual & FAQs (PDF) 📄</span>
              </button>
            </div>
          </div>
        </header>

        <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8">
          <div className="max-w-5xl w-full grid grid-cols-1 md:grid-cols-12 gap-8 items-center bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-md">
            
            <div className="md:col-span-7 space-y-5">
              <div className="space-y-1">
                <span className="bg-blue-100 text-blue-700 font-extrabold uppercase font-mono tracking-widest text-[9px] px-2.5 py-0.5 rounded-full">
                  ⚡ Hassle-Free Clinical Portals Simulation
                </span>
                <h2 className="text-2xl font-black text-slate-940 tracking-tight">Instant Authorized Entry</h2>
                <p className="text-xs text-slate-500 max-w-md leading-relaxed">
                  Click on any clinical department below to instantly pre-fill credentials and authorize entry to its access-controlled workflow workspace.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries(ROLE_CREDENTIALS).map(([key, item]) => (
                  <button
                    key={key}
                    onClick={() => handleQuickLogin(key)}
                    className="p-3 border border-slate-200 rounded-2xl text-left bg-slate-50 hover:bg-blue-50/50 hover:border-blue-300 transition cursor-pointer group space-y-1 focus:outline-none"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                        <span className="text-base">{item.icon}</span>
                        {item.name}
                      </span>
                      <span className="text-[10px] bg-white border px-1.5 py-0.2 rounded font-mono font-extrabold text-blue-600 shadow-3xs">
                        PW: {item.password}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-normal line-clamp-2">
                      {item.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div className="md:col-span-5 bg-slate-50 p-6 rounded-2xl border border-slate-200 flex flex-col justify-between">
              <form onSubmit={handleManualLogin} className="space-y-4">
                <div className="space-y-1.5 text-center">
                  <span className="inline-flex h-9 w-9 bg-blue-100 text-blue-700 items-center justify-center rounded-xl">
                    <Fingerprint className="h-5 w-5" />
                  </span>
                  <h3 className="font-extrabold text-slate-900 text-sm">Station Sign-In Guide</h3>
                  <p className="text-[10px] text-slate-500">Sign in securely with Clinical Passkey</p>
                </div>

                {loginError && (
                  <div className="bg-red-50 border border-red-200 text-red-650 text-xxs p-2 rounded-xl font-bold flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    <span>{loginError}</span>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Select Hospital Station</label>
                  <select
                    value={formRole}
                    onChange={(e) => {
                      setFormRole(e.target.value);
                      setLoginError("");
                    }}
                    className="w-full bg-white border border-slate-205 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-blue-500 transition"
                  >
                    {Object.entries(ROLE_CREDENTIALS).map(([key, val]) => (
                      <option key={key} value={key}>
                        {val.icon} {val.name} Portal
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Clinical Password</label>
                    <span className="text-[9px] text-slate-500 font-medium font-mono">Demo: {ROLE_CREDENTIALS[formRole]?.password}</span>
                  </div>
                  <input
                    type="password"
                    placeholder="Enter passkey to enter"
                    value={formPassword}
                    onChange={(e) => {
                      setFormPassword(e.target.value);
                      setLoginError("");
                    }}
                    className="w-full bg-white border border-slate-205 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-blue-500 transition"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black text-xs py-2 rounded-xl transition shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Lock className="h-3.5 w-3.5" />
                  <span>AUTHORIZE WORKSTATION</span>
                </button>
              </form>
            </div>

          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900 border-t-4 border-blue-600">
      
      {/* GLOBAL SAAS TELEMETRY HEADERS BAR */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-3xs">
        <div id="main-header" className="max-w-7xl mx-auto px-4 md:px-6 py-3.5 flex items-center justify-between gap-4">
          
          <div className="flex items-center space-x-2.5">
            <span className="h-10 w-10 bg-blue-600 text-white rounded-xl flex items-center justify-center font-black text-lg shadow-sm">
              FC
            </span>
            <div>
              <div className="flex items-center space-x-1.5">
                <h1 className="font-black text-slate-900 text-sm tracking-tight">FLOWCARE AI</h1>
                <span className="bg-slate-900 text-white text-[8px] font-black uppercase px-1.5 py-0.2 rounded tracking-wide">SaaS v2.0</span>
              </div>
              <p className="text-[10px] text-slate-500 font-semibold font-mono">Patient Flow Operating System</p>
            </div>
          </div>

          {/* TELEMETRIES */}
          <div className="hidden sm:flex items-center space-x-6 text-[10px] font-mono font-bold text-slate-500">
            <div className="flex items-center space-x-1.5">
              <span className={`h-2 w-2 rounded-full ${isConnected ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`}></span>
              <span>Websockets: {isConnected ? "CONNECTED" : "OFFLINE"}</span>
            </div>
            
            <div className="flex items-center space-x-1 border-s pl-4">
              <span>Database Engine:</span>
              <strong className="text-slate-900 font-black">MONGODB MAPPED</strong>
            </div>

            {/* Voice announcer buttons toggler */}
            <button
              onClick={() => {
                setSoundEnabled(!soundEnabled);
                triggerFeedback(soundEnabled ? "Speech Cabin Speaker disabled" : "Speech Cabin Speaker enabled!");
              }}
              className={`flex items-center space-x-1 border-s pl-4 text-[10px] uppercase font-bold cursor-pointer hover:text-slate-900 ${soundEnabled ? "text-blue-600" : "text-slate-400"}`}
            >
              <Volume2 className="h-3.5 w-3.5" />
              <span>Voice Cabin Calls: {soundEnabled ? "Enabled" : "Muted"}</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            {/* Patient History Lookup Button */}
            <button
              onClick={() => setShowHistoryArchive(true)}
              title="Look up active and completed historical EMR clinical files"
              className="bg-purple-50 hover:bg-purple-100 text-purple-750 text-xxs font-black px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer border border-purple-200 shadow-3xs"
            >
              <History className="h-3.5 w-3.5" />
              <span>Patient History 📜</span>
            </button>

            {/* FAQs Button directs a manual pdf of how to use in another page */}
            <button
              onClick={() => window.open("/manual.html", "_blank")}
              title="Open the official hospital standard operating procedures and FAQs in a new page"
              className="bg-blue-50 hover:bg-blue-100 text-blue-750 text-xxs font-black px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer border border-blue-200 shadow-3xs"
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>SOP FAQs 📄</span>
            </button>

            {currentUserRole && (
              <div className="flex items-center gap-2 border-l pl-2 border-slate-200">
                <div className="hidden md:flex flex-col text-right text-slate-800">
                  <span className="text-[8px] text-slate-400 font-mono uppercase font-black tracking-wider">Active Station</span>
                  <span className="text-xxs font-black flex items-center gap-1">
                    {ROLE_CREDENTIALS[currentUserRole]?.icon} {ROLE_CREDENTIALS[currentUserRole]?.name}
                  </span>
                </div>
                <button
                  onClick={() => {
                    localStorage.removeItem("flowcare_user_role");
                    setCurrentUserRole(null);
                    triggerFeedback("Successfully logged out of active clinical workstation.");
                  }}
                  title="Return to clinical gateway portal"
                  className="bg-red-50 hover:bg-red-100 text-red-650 h-8 px-3 py-1.5 rounded-xl border border-red-150 flex items-center justify-center gap-1.5 transition text-xxs font-black uppercase cursor-pointer"
                >
                  <LogOut className="h-3 w-3" />
                  <span>Logout</span>
                </button>
              </div>
            )}

            <button
              onClick={() => syncApplicationData()}
              disabled={refreshing}
              title="Manually force sync database states"
              className="bg-slate-50 border hover:bg-slate-100 text-slate-650 h-8 w-8 rounded-xl flex items-center justify-center transition cursor-pointer"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            </button>
          </div>

        </div>
      </header>

      {/* ERROR FEEDBACK BOXES */}
      {errorText && (
        <div className="bg-red-50 border-b border-red-200 text-red-650 font-semibold px-6 py-2.5 text-xxs flex items-center justify-between select-none">
          <span>⚠️ {errorText}</span>
          <button onClick={() => setErrorText("")} className="font-extrabold px-1">✕</button>
        </div>
      )}

      {successText && (
        <div className="bg-emerald-55 border-b border-emerald-200 text-emerald-800 font-extrabold px-6 py-2.5 text-xxs flex items-center justify-between select-none animate-slideDown">
          <span>✓ {successText}</span>
          <button onClick={() => setSuccessText("")} className="font-black px-1">✕</button>
        </div>
      )}

      {/* TAB DESK SYSTEM SWITCHER FOR EVALUATORS */}
      <section className="bg-white border-b border-slate-205 select-none shrink-0 overflow-x-auto">
        <div id="role-desk-switcher" className="max-w-7xl mx-auto px-4 flex items-center space-x-1.5 py-2 min-w-[850px]">
          
          {currentUserRole && ROLE_CREDENTIALS[currentUserRole]?.allowedTabs.includes("overview") && (
            <button
              onClick={() => setActiveTab("overview")}
              className={`px-3.5 py-1.5 text-xxs font-black uppercase rounded-lg transition border cursor-pointer flex items-center gap-1 ${
                activeTab === "overview" ? "bg-slate-900 border-slate-900 text-white" : "bg-slate-50 hover:bg-slate-100 text-slate-600"
              }`}
            >
              📋 Operating System Overview
            </button>
          )}

          {currentUserRole && ROLE_CREDENTIALS[currentUserRole]?.allowedTabs.includes("overview") && (
            <span className="h-5 border-l border-slate-200 block mx-1"></span>
          )}

          {[
            { id: "receptionist", label: "🏢 Intake Desk", badge: patients.filter(p => p.status === "waiting").length },
            { id: "doctor", label: "🩺 Doctor Cabin", badge: patients.filter(p => p.status === "serving").length },
            { id: "diagnostics", label: "🧪 Lab Diagnostics", badge: patients.filter(p => p.status === "lab_pending" || p.status === "lab_processing").length },
            { id: "pharmacy", label: "💊 Pharmacy Cabin", badge: patients.filter(p => p.status === "pharmacy").length },
            { id: "billing", label: "💳 Cashier Invoice", badge: patients.filter(p => p.status === "billing").length },
            { id: "lobby", label: "📺 TV Lobby Wait", badge: null },
            { id: "bi", label: "📊 BI Forecasts", badge: "AI" },
            { id: "controls", label: "⚙️ Sandbox Logs", badge: null }
          ].filter((tab) => {
            if (!currentUserRole) return false;
            return ROLE_CREDENTIALS[currentUserRole]?.allowedTabs.includes(tab.id);
          }).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 text-xxs font-black uppercase rounded-lg border transition cursor-pointer flex items-center space-x-1.5 ${
                activeTab === tab.id ? "bg-[#2563EB] text-white border-[#2563EB] shadow-3xs" : "bg-[#F8FAFC] hover:bg-slate-100 text-slate-700"
              }`}
            >
              <span>{tab.label}</span>
              {tab.badge !== null && (
                <span className={`h-4.5 min-w-4.5 px-1 rounded-full text-[8.5px] font-bold flex items-center justify-center font-mono ${
                  activeTab === tab.id ? "bg-white text-blue-700" : "bg-slate-200 text-slate-650"
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </section>

      {/* DYNAMIC SCANNED CONTAINER COMPONENT RENDER */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 pb-20 animate-fadeIn">
        
        {/* OVERVIEW LANDING PRESENTATIONS */}
        {activeTab === "overview" && (
          <div id="saas-overview-showcase" className="space-y-8 py-4 max-w-5xl mx-auto">
            
            <div className="text-center space-y-4 max-w-2xl mx-auto">
              <span className="bg-blue-50 text-blue-700 font-extrabold uppercase font-mono tracking-widest text-[10px] px-3.5 py-1 rounded-full border border-blue-200">
                ⭐ HOSPITAL-GRADE DIGITAL OUTPATIENT SUITE
              </span>
              <h2 className="text-3.5xl font-black text-slate-900 tracking-tight leading-tight">
                Healthcare Operating System for High-Availability Clinic Workloads.
              </h2>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Connect and manage medical patient flow pipelines instantly. FlowCare AI guides patients sequentially across registration desks, doctor consultations, lab tests, pharmacy dispense registries, and computerized cash invoices.
              </p>

              <div className="flex justify-center gap-3 pt-2">
                <button
                  onClick={() => setActiveTab("receptionist")}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs px-6 py-3 rounded-xl transition cursor-pointer shadow-xs"
                >
                  ENTER FRONT OFFICE DESK
                </button>
              </div>
            </div>

            {/* FLOW PIPELINE MODULE DIAGRAM MAP */}
            <div className="bg-white border rounded-3xl p-6.5 space-y-6 shadow-xs">
              <span className="text-[10px] font-black tracking-widest uppercase font-mono text-slate-400 block text-center">
                SEQUENTIAL FLOWCARE CLINIC PIPELINE ENGINE (11 CORE HEALTHCARE SASS MODULES)
              </span>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-center text-xxs font-semibold">
                
                <div className="border rounded-2xl p-4 space-y-2 bg-slate-50/50 hover:border-blue-500 transition">
                  <span className="h-7 w-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold font-mono text-xs mx-auto">
                    1
                  </span>
                  <h4 className="font-extrabold text-slate-900">Intake Desk</h4>
                  <p className="text-[10px] text-slate-400 font-medium leading-relaxed">Register walk-ins or scheduled calendar slots instantly into consultation.</p>
                </div>

                <div className="border rounded-2xl p-4 space-y-2 bg-slate-50/50 hover:border-teal-500 transition">
                  <span className="h-7 w-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center font-bold font-mono text-xs mx-auto">
                    2
                  </span>
                  <h4 className="font-extrabold text-slate-900">Clinician Workspace</h4>
                  <p className="text-[10px] text-slate-400 font-medium leading-relaxed">Submit SOAP notes, order lab diagnostic examinations or Rx medications.</p>
                </div>

                <div className="border rounded-2xl p-4 space-y-2 bg-slate-50/50 hover:border-purple-500 transition">
                  <span className="h-7 w-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold font-mono text-xs mx-auto">
                    3
                  </span>
                  <h4 className="font-extrabold text-slate-900">Diagnostics Lab</h4>
                  <p className="text-[10px] text-slate-400 font-medium leading-relaxed">Examine specimen orders. Submit biological checkups to proceed workflow.</p>
                </div>

                <div className="border rounded-2xl p-4 space-y-2 bg-slate-50/50 hover:border-amber-500 transition">
                  <span className="h-7 w-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold font-mono text-xs mx-auto">
                    4
                  </span>
                  <h4 className="font-extrabold text-slate-900">Rx Pharmacy</h4>
                  <p className="text-[10px] text-slate-400 font-medium leading-relaxed">Verify dosage indices, evaluate stock thresholds and dispatch medications.</p>
                </div>

                <div className="border rounded-2xl p-4 space-y-2 bg-slate-50/50 hover:border-emerald-500 transition">
                  <span className="h-7 w-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold font-mono text-xs mx-auto">
                    5
                  </span>
                  <h4 className="font-extrabold text-slate-900">Ledger Invoicing</h4>
                  <p className="text-[10px] text-slate-400 font-medium leading-relaxed">Process total consulting, tests and medicine price clearings with 18% GST.</p>
                </div>

              </div>
            </div>

            <p className="text-center text-slate-400 text-xxs font-medium font-mono leading-relaxed">
              * Fully managed behind Cloud Run reverse proxies. Socket.IO keeps all screens updated live without manually refreshing.
            </p>

          </div>
        )}

        {activeTab === "receptionist" && (
          <IntakeDesk
            patients={patients}
            appointments={appointments}
            onAddPatient={handleAddPatient}
            onCheckInAppointment={handleCheckInAppointment}
            onScheduleAppointment={handleScheduleAppointment}
            onCancelAppointment={handleCancelAppointment}
            onCallNext={handleCallNextPatient}
            onUpdatePatient={handleUpdatePatient}
          />
        )}

        {activeTab === "doctor" && (
          <DoctorCabin
            patients={patients}
            onCallNext={handleCallNextPatient}
            onCompleteConsultation={handleCompleteConsultation}
          />
        )}

        {activeTab === "diagnostics" && (
          <DiagnosticsDesk
            patients={patients}
            onSubmitLabResult={handleSubmitLabResult}
          />
        )}

        {activeTab === "pharmacy" && (
          <PharmacyDesk
            patients={patients}
            inventory={inventory}
            onDispensePrescription={handleDispensePrescription}
          />
        )}

        {activeTab === "billing" && (
          <BillingDesk
            patients={patients}
            onSettleInvoice={handleSettleInvoice}
          />
        )}

        {activeTab === "lobby" && (
          <LobbyBoard
            patients={patients}
            avgConsultTime={avgConsultTime}
          />
        )}

        {activeTab === "bi" && (
          <BiDashboard
            patients={patients}
            avgConsultTime={avgConsultTime}
          />
        )}

        {activeTab === "controls" && (
          <div className="space-y-6 max-w-5xl mx-auto">
            
            {/* AUDIT LOGS SUMMARY */}
            <div className="bg-white border rounded-3xl p-6 shadow-xs space-y-4 text-xs font-semibold">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center space-x-2">
                  <span className="h-8 w-8 bg-slate-100 text-slate-700 flex items-center justify-center rounded-lg">
                    <Shield className="h-4.5 w-4.5" />
                  </span>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm">System Compliance Logs & Audits</h3>
                    <p className="text-[10px] text-slate-500">Live operational auditing capturing clinical and financial touchpoints</p>
                  </div>
                </div>
                <button
                  onClick={handleResetApplication}
                  className="bg-red-50 text-red-600 border border-red-250 hover:bg-red-100 font-extrabold text-xxs px-3.5 py-1.5 rounded-lg transition flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>HARD RESET DATABASE</span>
                </button>
              </div>

              <div className="border rounded-2xl overflow-hidden divide-y max-h-[360px] overflow-y-auto bg-slate-50/50">
                {auditLogs.length === 0 ? (
                  <div className="text-center py-10 text-xxs text-slate-400 font-medium">
                    No records in the compliance audit trail file yet.
                  </div>
                ) : (
                  auditLogs.map((log) => (
                    <div key={log.id} className="p-3 bg-white flex items-center justify-between hover:bg-slate-50 gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <strong className="text-slate-900 text-xxs uppercase font-bold">{log.action}</strong>
                          <span className="text-[9px] font-mono font-bold text-slate-400 bg-slate-100 border rounded px-1.5 py-0.2 uppercase">{log.role}</span>
                        </div>
                        <p className="text-xxs text-slate-550 leading-relaxed font-sans">{log.details}</p>
                      </div>
                      <span className="text-[10px] text-slate-410 font-mono text-right whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        )}

      </main>

      {showHistoryArchive && (
        <HistoryArchive 
          patients={patients} 
          onClose={() => setShowHistoryArchive(false)} 
        />
      )}

    </div>
  );
}
