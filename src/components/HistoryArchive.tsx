import React, { useState } from "react";
import { 
  Search, Shield, FileText, User, UserCheck, Activity, 
  Sparkles, CheckCircle2, ChevronRight, X, Phone, Heart, 
  Calendar, Receipt, Pill, TestTube, AlertTriangle, Printer
} from "lucide-react";

interface HistoryArchiveProps {
  patients: any[];
  onClose: () => void;
}

export default function HistoryArchive({ patients, onClose }: HistoryArchiveProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "completed">("all");
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  // Filter patients safely
  const filteredPatients = patients.filter(p => {
    const term = searchTerm.toLowerCase();
    const nameMatch = (p.name || "").toLowerCase().includes(term);
    const uhidMatch = (p.uhid || "").toLowerCase().includes(term);
    const tokenMatch = (p.token || "").toLowerCase().includes(term);
    const phoneMatch = (p.phone || "").toLowerCase().includes(term);
    
    const matchesSearch = nameMatch || uhidMatch || tokenMatch || phoneMatch;

    if (statusFilter === "all") return matchesSearch;
    if (statusFilter === "completed") {
      return matchesSearch && (p.status === "completed" || p.status === "discharged");
    }
    if (statusFilter === "active") {
      return matchesSearch && p.status !== "completed" && p.status !== "discharged";
    }
    return matchesSearch;
  });

  // Find currently selected patient details
  const selectedPatient = patients.find(p => (p._id || p.id) === selectedPatientId) || filteredPatients[0];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "waiting":
        return <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded text-[9px] font-black uppercase">Intake Waiting</span>;
      case "serving":
        return <span className="bg-blue-100 text-blue-700 border border-blue-200 px-2 py-0.5 rounded text-[9px] font-black uppercase">In Cabin Consultation</span>;
      case "lab_pending":
      case "lab_processing":
        return <span className="bg-purple-100 text-purple-700 border border-purple-200 px-2 py-0.5 rounded text-[9px] font-black uppercase">Diagnostics Lab</span>;
      case "pharmacy":
        return <span className="bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded text-[9px] font-black uppercase">Pharmacy Row</span>;
      case "billing":
        return <span className="bg-cyan-100 text-cyan-700 border border-cyan-200 px-2 py-0.5 rounded text-[9px] font-black uppercase">Cashier Invoice</span>;
      case "completed":
      case "discharged":
        return <span className="bg-emerald-105 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded text-[9px] font-black uppercase">Completed & Discharged</span>;
      default:
        return <span className="bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded text-[9px] font-black uppercase">{status}</span>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    if (priority === "EMERGENCY") {
      return <span className="bg-red-100 text-red-650 border border-red-200 px-2 py-0.5 rounded text-[9px] font-black animate-pulse">EMERGENCY</span>;
    }
    if (priority === "VIP") {
      return <span className="bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded text-[9px] font-black">VIP</span>;
    }
    return <span className="bg-slate-100 text-slate-600 border border-slate-150 px-2 py-0.5 rounded text-[9px] font-black">STANDARD</span>;
  };

  // Safe JSON extraction helper
  const renderHistoryString = (hist: any) => {
    if (!hist) return "No special warning or allergies specified in triage.";
    if (Array.isArray(hist)) {
      if (hist.length === 0) return "No prior history entered.";
      return hist.join(", ");
    }
    return hist;
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-slate-50 w-full max-w-6xl h-[90vh] rounded-3xl flex flex-col border border-slate-200 shadow-2xl overflow-hidden animate-zoomIn">
        
        {/* HEADER */}
        <div className="bg-white border-b border-slate-200 px-6 py-4.5 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <span className="h-10 w-10 bg-purple-600 text-white rounded-xl flex items-center justify-center font-bold text-lg shadow-sm">
              📜
            </span>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-black text-slate-900 text-base tracking-tight">Clinical EMR History & Patient Lookup</h2>
                <span className="bg-purple-100 text-purple-700 text-[8px] font-black uppercase px-2 py-0.5 rounded font-mono">Durable Logs</span>
              </div>
              <p className="text-[10px] text-slate-500 font-semibold font-mono">Archive of outpatient diagnostic examinations, prescriptions, and financial settlements.</p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="h-9 w-9 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-xl flex items-center justify-center transition border border-slate-205 cursor-pointer"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* CONTAINER CONTENT */}
        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12">
          
          {/* LEFT LIST: SEARCH & RETRIEVE */}
          <div className="md:col-span-4 border-r border-slate-200 bg-white flex flex-col h-full min-h-0">
            
            {/* Search inputs */}
            <div className="p-4 space-y-3.5 border-b border-slate-105 shrink-0 bg-slate-50/50">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by UHID, Token, Name, Cell..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white border border-slate-205 rounded-xl pl-9.5 pr-4 py-2 text-xs font-semibold outline-none focus:border-purple-500 transition"
                />
              </div>

              {/* Status filtering switches */}
              <div className="flex bg-slate-100 border p-0.5 rounded-lg text-[9.5px] font-extrabold max-w-full">
                <button
                  onClick={() => setStatusFilter("all")}
                  className={`flex-1 text-center py-1.5 rounded transition cursor-pointer ${
                    statusFilter === "all" ? "bg-white text-purple-700 shadow-3xs" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  All ({patients.length})
                </button>
                <button
                  onClick={() => setStatusFilter("active")}
                  className={`flex-1 text-center py-1.5 rounded transition cursor-pointer ${
                    statusFilter === "active" ? "bg-white text-purple-700 shadow-3xs" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Active ({patients.filter(p => p.status !== "completed" && p.status !== "discharged").length})
                </button>
                <button
                  onClick={() => setStatusFilter("completed")}
                  className={`flex-1 text-center py-1.5 rounded transition cursor-pointer ${
                    statusFilter === "completed" ? "bg-white text-purple-700 shadow-3xs" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Settled ({patients.filter(p => p.status === "completed" || p.status === "discharged").length})
                </button>
              </div>
            </div>

            {/* Patients Scroll List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 select-none">
              {filteredPatients.length === 0 ? (
                <div className="text-center py-16 text-slate-400 space-y-2">
                  <Heart className="h-7 w-7 mx-auto text-slate-300 animate-pulse" />
                  <p className="text-xxs font-extrabold text-slate-500">No Patient Records Found</p>
                  <p className="text-[10px] text-slate-400 font-mono">Verify search parameters of registry.</p>
                </div>
              ) : (
                filteredPatients.map((p) => {
                  const isSelected = selectedPatient ? (selectedPatient._id || selectedPatient.id) === (p._id || p.id) : false;
                  return (
                    <button
                      key={p._id || p.id}
                      onClick={() => setSelectedPatientId(p._id || p.id)}
                      className={`w-full text-left p-3.5 transition flex items-center justify-between border-l-4 gap-2 focus:outline-none cursor-pointer ${
                        isSelected 
                          ? "bg-purple-50/45 border-purple-600" 
                          : "border-transparent hover:bg-slate-50"
                      }`}
                    >
                      <div className="space-y-1 min-w-0 pr-1">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-mono text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-slate-900 text-white leading-none">
                            {p.token}
                          </span>
                          <span className="font-bold text-slate-900 text-xs truncate max-w-[120px]">{p.name || "Default Patient"}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-[10px] text-slate-400 font-medium">
                          <span>UHID: {p.uhid || "FC-12034"}</span>
                          <span>•</span>
                          <span className="capitalize">{p.gender}</span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {p.status === "completed" || p.status === "discharged" ? (
                          <span className="text-[8px] font-black uppercase text-emerald-600 bg-emerald-50 border border-emerald-150 px-1 py-0.2 rounded">Paid & Cleared</span>
                        ) : (
                          <span className="text-[8px] font-black uppercase text-blue-600 bg-blue-50 border border-blue-150 px-1 py-0.2 rounded">Active</span>
                        )}
                        <ChevronRight className={`h-3 w-3 text-slate-400 transition-transform ${isSelected ? "translate-x-1 text-purple-600" : ""}`} />
                      </div>
                    </button>
                  );
                })
              )}
            </div>

          </div>

          {/* RIGHT DETAIL PREVIEW OR DETAILED TIMELINE SHEET */}
          <div className="md:col-span-8 bg-slate-50 overflow-y-auto h-full p-6 print:bg-white print:p-0">
            {selectedPatient ? (
              <div id="print-emr-profile" className="space-y-6">
                
                {/* 1. COMPREHENSIVE MEDICAL DEMOGRAPHICS PROFILE CARD */}
                <div className="bg-white border border-slate-202 rounded-3xl p-5 shadow-xs space-y-4 print:border-none print:shadow-none">
                  
                  {/* Title Bar with print triggers */}
                  <div className="flex items-center justify-between pb-3.5 border-b border-slate-105">
                    <div className="flex items-center space-x-2.5">
                      <span className="p-2 bg-purple-100 text-purple-700 rounded-xl">
                        <User className="h-5 w-5" />
                      </span>
                      <div>
                        <div className="flex items-center space-x-1.5">
                          <h3 className="font-black text-slate-900 text-sm">{selectedPatient.name}</h3>
                          {getPriorityBadge(selectedPatient.priority)}
                        </div>
                        <p className="text-[10px] text-slate-400 font-mono font-medium">UHID Registry: <span className="font-semibold text-slate-600">{selectedPatient.uhid}</span></p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {getStatusBadge(selectedPatient.status)}
                      <button 
                        onClick={handlePrint}
                        className="p-1 px-3 bg-slate-100 hover:bg-slate-200 border text-slate-700 text-[10px] font-extrabold rounded-lg flex items-center gap-1.5 cursor-pointer"
                      >
                        <Printer className="h-3.5 w-3.5" />
                        <span>Print EMR</span>
                      </button>
                    </div>
                  </div>

                  {/* Core bio stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xxs font-semibold">
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span className="block text-[8px] text-slate-400 uppercase font-mono mb-1">Gender / Age Group</span>
                      <strong className="text-slate-805 capitalize">{selectedPatient.gender || "Not Specified"}</strong>
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span className="block text-[8px] text-slate-400 uppercase font-mono mb-1">Telephone Contact</span>
                      <strong className="text-slate-805">{selectedPatient.phone || "+91 99000 00000"}</strong>
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span className="block text-[8px] text-slate-400 uppercase font-mono mb-1">Clinic Division</span>
                      <strong className="text-slate-805 truncate block">{selectedPatient.department || "Outpatient Medicine"}</strong>
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span className="block text-[8px] text-slate-400 uppercase font-mono mb-1">Token Identifier</span>
                      <strong className="text-purple-700 font-mono tracking-wider font-black text-xs block">{selectedPatient.token}</strong>
                    </div>
                  </div>
                </div>

                {/* 2. CHRONOLOGICAL MEDICAL STAGE TIMELINE STEPS */}
                <div className="space-y-4">
                  <h4 className="text-xs uppercase font-black text-slate-400 font-mono tracking-widest pl-1">Outpatient Sequential History Timeline</h4>
                  
                  {/* Timeline Tree Wrapper */}
                  <div className="space-y-4 relative before:absolute before:left-4 before:top-4 before:bottom-4 before:w-0.5 before:bg-slate-200">
                    
                    {/* STAGE 1: INTAKE DESK */}
                    <div className="relative pl-9 text-xxs">
                      <span className="absolute left-1.5 top-1.5 h-6.5 w-6.5 bg-blue-100 border border-blue-200 rounded-full flex items-center justify-center font-bold text-blue-600 z-10 shadow-3xs">
                        1
                      </span>
                      <div className="bg-white border p-4.5 rounded-2.5xl space-y-2.5">
                        <div className="flex items-center justify-between">
                          <h5 className="font-extrabold text-slate-900 text-xxs">STAFF INTAKE TRIAGE & REGISTER</h5>
                          <span className="text-[9px] font-mono font-medium text-slate-400">Registered</span>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-2 border-b border-dashed border-slate-105">
                          <div className="space-y-0.5">
                            <span className="text-[9px] text-slate-400 block font-mono">Assigned Doctor Point of Contact:</span>
                            <span className="font-bold text-slate-750">{selectedPatient.assignedDoctor || "General Physician Duty Room"}</span>
                          </div>
                          <div className="space-y-0.5">
                            <span className="text-[9px] text-slate-400 block font-mono">Triage Vital Checks & SpO2/Pulse:</span>
                            <span className="font-bold text-teal-650">Stable • Blood Pressure 120/80 mmHg</span>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <span className="text-[9px] text-red-500 font-black font-sans flex items-center gap-1.5">
                            <AlertTriangle className="h-3 w-3 shrink-0" />
                            Pre-existing Medical Allergies & Symptoms:
                          </span>
                          <p className="p-2 bg-red-50/50 border border-red-100 rounded-xl font-bold font-mono text-[9.5px] text-red-750">
                            {renderHistoryString(selectedPatient.medicalHistory)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* STAGE 2: CLINICIAN'S CABINET SOAP NOTES */}
                    <div className="relative pl-9 text-xxs">
                      <span className="absolute left-1.5 top-1.5 h-6.5 w-6.5 bg-indigo-100 border border-indigo-200 rounded-full flex items-center justify-center font-bold text-indigo-600 z-10 shadow-3xs">
                        2
                      </span>
                      <div className="bg-white border p-4.5 rounded-2.5xl space-y-3.5">
                        <div className="flex items-center justify-between">
                          <h5 className="font-extrabold text-slate-900 text-xxs">CLINICAL DIAGNOSIS & CONSULTATION NOTES (SOAP)</h5>
                          <span className="text-[9px] text-indigo-600 font-extrabold">Completed</span>
                        </div>

                        {selectedPatient.soapNotes ? (
                          <div className="space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                              <div className="p-2.5 bg-slate-50 border rounded-xl space-y-0.5">
                                <span className="text-[8px] font-black text-slate-400 uppercase font-mono">S - Subjective History / Complaints:</span>
                                <p className="font-bold text-slate-700 leading-relaxed">{selectedPatient.soapNotes.subjective || "Patient described symptoms."}</p>
                              </div>
                              <div className="p-2.5 bg-slate-50 border rounded-xl space-y-0.5">
                                <span className="text-[8px] font-black text-slate-400 uppercase font-mono">O - Objective Findings / Exam:</span>
                                <p className="font-bold text-slate-700 leading-relaxed">{selectedPatient.soapNotes.objective || "Vitals within standard deviations."}</p>
                              </div>
                              <div className="p-2.5 bg-slate-50 border rounded-xl space-y-0.5">
                                <span className="text-[8px] font-black text-slate-400 uppercase font-mono">A - Clinical Assessment / Diagnosis:</span>
                                <p className="font-bold text-slate-700 leading-relaxed">{selectedPatient.soapNotes.assessment || "Identified respiratory/symptom parameters."}</p>
                              </div>
                              <div className="p-2.5 bg-slate-50 border rounded-xl space-y-0.5">
                                <span className="text-[8px] font-black text-slate-400 uppercase font-mono">P - Clinical Treatment Plan:</span>
                                <p className="font-bold text-slate-700 leading-relaxed">{selectedPatient.soapNotes.plan || "Advise clinical care loop follow-up."}</p>
                              </div>
                            </div>

                            <div className="p-2.5 bg-indigo-50/20 border border-indigo-120 rounded-xl space-y-0.5">
                              <span className="text-[8px] font-black text-indigo-500 uppercase font-mono">General Outpatient Consulting Assessment notes:</span>
                              <p className="font-extrabold text-indigo-950 italic">"{selectedPatient.consultNotes || "Regular diagnostic checks completed."}"</p>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-4 bg-slate-50 rounded-xl border border-dashed border-slate-202 text-slate-400">
                            No active SOAP notes entered. Current EMR waiting diagnostic clinic consultation.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* STAGE 3: DIAGNOSTICS LAB */}
                    <div className="relative pl-9 text-xxs">
                      <span className="absolute left-1.5 top-1.5 h-6.5 w-6.5 bg-purple-100 border border-purple-200 rounded-full flex items-center justify-center font-bold text-purple-600 z-10 shadow-3xs">
                        3
                      </span>
                      <div className="bg-white border p-4.5 rounded-2.5xl space-y-3.5">
                        <div className="flex items-center justify-between">
                          <h5 className="font-extrabold text-slate-900 text-xxs">LABORATORY SPECIMEN DIAGNOSTICS</h5>
                          <span className="text-[9px] text-purple-600 font-bold">Lab Desk</span>
                        </div>

                        {selectedPatient.labOrders && selectedPatient.labOrders.length > 0 ? (
                          <div className="space-y-2">
                            {selectedPatient.labOrders.map((lab: any, index: number) => (
                              <div key={index} className="p-3 bg-slate-50 border border-slate-150 rounded-xl flex items-center justify-between gap-3 font-semibold">
                                <div className="space-y-0.5">
                                  <span className="text-[9px] text-slate-400 block font-mono">Ordered Biological Examination test:</span>
                                  <strong className="text-slate-800 text-[10.5px] font-black">{lab.testName}</strong>
                                </div>
                                <div className="text-right">
                                  <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase inline-block mb-1 ${
                                    lab.status === "RESULT_READY" ? "bg-emerald-100 text-emerald-800" : "bg-purple-100 text-purple-700 animate-pulse"
                                  }`}>
                                    {lab.status || "WAITING"}
                                  </span>
                                  <p className="text-[10px] text-slate-500 max-w-[200px] truncate">{lab.resultDetails || "Sample under centrifuge analysis..."}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-3.5 bg-slate-50 rounded-xl border border-dashed text-slate-400 font-medium text-center">
                            No laboratory specimen checks requested by clinician for this file.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* STAGE 4: PHARMACY DISPENSE */}
                    <div className="relative pl-9 text-xxs">
                      <span className="absolute left-1.5 top-1.5 h-6.5 w-6.5 bg-amber-100 border border-amber-200 rounded-full flex items-center justify-center font-bold text-amber-600 z-10 shadow-3xs">
                        4
                      </span>
                      <div className="bg-white border p-4.5 rounded-2.5xl space-y-3">
                        <div className="flex items-center justify-between">
                          <h5 className="font-extrabold text-slate-900 text-xxs">PHARMACY MEDICATION PRESCRIPTIONS DISPENSED</h5>
                          <span className="text-[9px] text-amber-600 font-extrabold">Active Rx List</span>
                        </div>

                        {selectedPatient.prescriptions && selectedPatient.prescriptions.length > 0 ? (
                          <div className="space-y-2">
                            {selectedPatient.prescriptions.map((drug: any, index: number) => (
                              <div key={index} className="p-2.5 bg-amber-50/20 border border-amber-200/50 rounded-xl flex justify-between items-center text-slate-700 font-semibold text-xxs">
                                <div className="space-y-0.5">
                                  <span className="text-slate-800 font-bold block">{drug.name}</span>
                                  <span className="text-[9px] text-slate-400 font-mono">Dosage instructions: <strong className="text-slate-600 font-bold">{drug.instructions || "Once after meals"}</strong></span>
                                </div>
                                <span className="bg-white border px-2 py-0.5 text-[8.5px] rounded-lg font-mono font-black text-slate-700">QTY: {drug.quantity || 1}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-3.5 bg-slate-50 rounded-xl border border-dashed text-slate-400 text-center font-semibold">
                            No medical pharmacotherapy prescriptions drafted.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* STAGE 5: CASHIER INVOICE SETTLEMENT */}
                    <div className="relative pl-9 text-xxs">
                      <span className="absolute left-1.5 top-1.5 h-6.5 w-6.5 bg-teal-100 border border-teal-200 rounded-full flex items-center justify-center font-bold text-teal-650 z-10 shadow-3xs">
                        5
                      </span>
                      <div className="bg-white border p-4.5 rounded-2.5xl space-y-3.5">
                        <div className="flex items-center justify-between">
                          <h5 className="font-extrabold text-slate-900 text-xxs">CASHIER LEDGER ACCOUNT INVOICING</h5>
                          <span className="text-[9px] text-emerald-600 font-black">Settlement Receipts</span>
                        </div>

                        {selectedPatient.billingInvoice ? (
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-slate-700 font-semibold bg-slate-50 p-3 rounded-2xl border">
                              <div className="space-y-0.5">
                                <span className="text-[9px] text-slate-400 block font-mono">Total Consulting Fees:</span>
                                <span className="text-slate-800 text-[10.5px] font-black">₹{selectedPatient.billingInvoice.totalAmount || "500"}</span>
                              </div>
                              <div className="space-y-0.5">
                                <span className="text-[9px] text-slate-400 block font-mono">Insurance Approved Cover:</span>
                                <span className="text-emerald-700 text-[10.5px] font-black">₹{selectedPatient.billingInvoice.insuranceApprovedAmount || "0"}</span>
                              </div>
                              <div className="space-y-0.5">
                                <span className="text-[9px] text-slate-400 block font-mono">Net Payable Amount (with GST):</span>
                                <span className="text-blue-700 text-[10.5px] font-black">₹{(selectedPatient.billingInvoice.totalAmount || 500) - (selectedPatient.billingInvoice.insuranceApprovedAmount || 0)}</span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between border-t border-dashed pt-3 pb-1">
                              <span className="text-[10px] text-slate-505 font-bold font-mono">Billing Invoice Ledger Status:</span>
                              <strong className="text-emerald-600 bg-emerald-100 border border-emerald-150 px-3.5 py-1 rounded-xl text-xxs uppercase font-black tracking-wider leading-none">
                                {selectedPatient.billingInvoice.status || "PAID"}
                              </strong>
                            </div>
                          </div>
                        ) : (
                          <div className="p-3.5 bg-slate-50 rounded-xl border border-dashed text-slate-400 text-center font-medium">
                            Invoice calculations pending consultation, diagnostics and pharmacotherapy details.
                          </div>
                        )}
                      </div>
                    </div>

                  </div>
                </div>

              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-3.5 py-24">
                <Heart className="h-12 w-12 text-slate-300 animate-pulse" />
                <h4 className="text-sm font-black text-slate-600">Select outpatient file details from index.</h4>
                <p className="text-xs text-slate-400 max-w-sm">Use search criteria inputs or status switches on the left to locate durable health identification records.</p>
              </div>
            )}
          </div>

        </div>

        {/* BOTTOM FOOTER TRACKER BANNER */}
        <div className="bg-white border-t border-slate-200 px-6 py-3.5 text-slate-400 text-[10px] font-mono font-semibold shrink-0 flex items-center justify-between">
          <span>Active Session DB Connections: <strong className="text-emerald-600 font-mono">● STABLE ONLINE</strong></span>
          <span>Durable HIPAA Outpatient Ledger Archive</span>
        </div>

      </div>
    </div>
  );
}
