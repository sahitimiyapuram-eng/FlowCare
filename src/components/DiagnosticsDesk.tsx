import React, { useState } from "react";
import { Activity, ClipboardList, PenTool, CheckCircle, FileText } from "lucide-react";

interface DiagnosticsDeskProps {
  patients: any[];
  onSubmitLabResult: (patientId: string, testName: string, results: string) => Promise<void>;
}

export default function DiagnosticsDesk({ patients, onSubmitLabResult }: DiagnosticsDeskProps) {
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [selectedTestName, setSelectedTestName] = useState("");
  const [reportText, setReportText] = useState("");
  const [publishing, setPublishing] = useState(false);

  // Filter patients currently resting at lab station
  const labPatients = patients.filter(p => p.status === "lab_pending" || p.status === "lab_processing");

  const activePatient = patients.find(p => p._id === selectedPatientId) || labPatients[0] || null;

  // Render presets based on test name
  const loadPresetResults = (test: string) => {
    const t = test.toLowerCase();
    if (t.includes("hba1c") || t.includes("diabetic")) {
      setReportText("Blood Glucose Fasting: 135 mg/dL [High]\nHbA1c: 7.1% [Elevated - suggests unsatisfactory prolonged glycemic control]");
    } else if (t.includes("ecg") || t.includes("cardio")) {
      setReportText("Sinus Rhythm - HR: 74 bpm. Borderline ST-segment elevations. No acute infarct patterns found.");
    } else if (t.includes("x-ray") || t.includes("imaging")) {
      setReportText("Bone cortex shows healthy alignment, soft tissue swelling surrounding right lateral malleolus, no visual fractures.");
    } else if (t.includes("lipid")) {
      setReportText("Total Cholesterol: 245 mg/dL [High]\nTriglycerides: 190 mg/dL [Elevated]\nLDL Cholesterol: 155 mg/dL [High]\nHDL Cholesterol: 42 mg/dL [Normal]");
    } else {
      setReportText("General specimen diagnostics check completed successfully. Parameters are within healthy reference intervals.");
    }
  };

  const handlePublishClick = async (testName: string) => {
    if (!activePatient) return;
    setPublishing(true);
    const content = reportText.trim() || "Specimen examined. Parameters classified as normal status.";
    await onSubmitLabResult(activePatient._id, testName, content);
    setReportText("");
    setSelectedTestName("");
    setPublishing(false);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* LAB METRIC HEADER */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {["Pending Specimen", "Under processing", "Equipment Status", "Biohazard Safety"].map((label, idx) => (
          <div key={label} className="bg-white border rounded-2xl p-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 block uppercase font-mono">{label}</span>
              <span className="text-xl font-black text-slate-800 font-mono">
                {idx === 0 ? labPatients.filter(p => p.status === "lab_pending").length : idx === 1 ? labPatients.filter(p => p.status === "lab_processing").length : idx === 2 ? "98% Online" : "ISO Class 7"}
              </span>
            </div>
            <span className="h-2 w-2 rounded-full bg-purple-500"></span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* PANEL A: PENDING SPECS WORKLIST */}
        <div className="lg:col-span-1 bg-white border rounded-3xl p-5 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
            <span className="h-8 w-8 bg-purple-50 text-purple-600 flex items-center justify-center rounded-lg">
              <ClipboardList className="h-4.5 w-4.5" />
            </span>
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm">Lab Pending Worklist</h3>
              <p className="text-[10px] text-slate-500 font-semibold">Live clinical tests dispatches pending processing</p>
            </div>
          </div>

          <div className="space-y-2 max-h-[360px] overflow-y-auto">
            {labPatients.length === 0 ? (
              <div className="text-center py-10 text-xxs text-slate-400 font-semibold leading-relaxed">
                No active specimens in the diagnostics pipeline right now.
              </div>
            ) : (
              labPatients.map((p) => {
                const isSelected = activePatient && activePatient._id === p._id;
                const pendingTests = p.labOrders?.filter((l: any) => l.status !== "RESULT_READY") || [];
                return (
                  <button
                    key={p._id}
                    type="button"
                    onClick={() => {
                      setSelectedPatientId(p._id);
                      setSelectedTestName("");
                    }}
                    className={`w-full p-3.5 border text-left rounded-2xl block transition cursor-pointer ${
                      isSelected ? "border-purple-500 bg-purple-50/20" : "border-slate-200 bg-white hover:bg-slate-5;5"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-1.5">
                          <strong className="text-slate-900 font-mono text-xs">{p.token}</strong>
                          <span className="font-black text-slate-800 uppercase text-xxs">{p.name}</span>
                        </div>
                        <p className="text-[10px] text-slate-400">UHID: {p.uhid}</p>
                      </div>
                      <span className={`px-2 py-0.5 text-[8px] font-black uppercase rounded ${
                        p.status === "lab_pending" ? "bg-amber-100 text-amber-700 font-mono" : "bg-purple-100 text-purple-700 animate-pulse"
                      }`}>
                        {p.status === "lab_pending" ? "Sample Due" : "Processing"}
                      </span>
                    </div>

                    <div className="mt-2.5 pt-2.5 border-t border-slate-100 space-y-1">
                      <span className="text-[8px] uppercase tracking-wider font-bold text-slate-400 block">Ordered Examinations</span>
                      <div className="flex flex-wrap gap-1">
                        {p.labOrders?.map((test: any, idx: number) => (
                          <span
                            key={idx}
                            className={`px-1.5 py-0.2 text-[9px] font-bold rounded ${
                              test.status === "RESULT_READY" ? "bg-emerald-50 text-emerald-700 border" : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {test.testName.length > 22 ? test.testName.substring(0, 22) + "..." : test.testName}
                          </span>
                        ))}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* PANEL B: SPECIMEN VERIFICATION & TESTING CONSOLE */}
        <div className="lg:col-span-2 bg-white border rounded-3xl p-6 shadow-sm space-y-5">
          
          {activePatient ? (
            <div className="space-y-5">
              <div className="flex items-center justify-between border-b pb-3 border-slate-100">
                <div className="space-y-0.5">
                  <h4 className="font-black text-slate-900 text-sm uppercase">Testing Console cabin — {activePatient.name}</h4>
                  <p className="text-xxs text-slate-400 font-semibold font-mono">UHID: {activePatient.uhid} | REF DOCTOR: {activePatient.assignedDoctor}</p>
                </div>
                <span className="bg-slate-900 text-white font-mono font-bold text-xxs px-2.5 py-0.5 rounded">
                  Status: {activePatient.status.toUpperCase()}
                </span>
              </div>

              {/* SPECIMEN LIST FOR THIS PATIENT */}
              <div className="space-y-3">
                <span className="text-xxs font-bold text-slate-500 uppercase block font-mono">1. Select Ordered Examination</span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {activePatient.labOrders?.map((order: any, idx: number) => {
                    const isSelected = selectedTestName === order.testName;
                    return (
                      <div
                        key={idx}
                        className={`p-3 border rounded-2xl flex items-center justify-between gap-3 ${
                          order.status === "RESULT_READY" ? "bg-slate-50 border-slate-200" : isSelected ? "border-purple-500 bg-purple-50/10" : "bg-white border-slate-200"
                        }`}
                      >
                        <div className="space-y-1">
                          <h5 className="font-extrabold text-[11px] text-slate-800">{order.testName}</h5>
                          <span className={`text-[9px] font-bold uppercase font-mono block ${
                            order.status === "RESULT_READY" ? "text-emerald-600" : "text-amber-500"
                          }`}>
                            {order.status === "RESULT_READY" ? "• Result Published" : "• Sample Awaiting"}
                          </span>
                        </div>

                        {order.status !== "RESULT_READY" && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTestName(order.testName);
                              loadPresetResults(order.testName);
                            }}
                            className={`px-3 py-1.5 font-bold text-[9px] rounded-lg transition ${
                              isSelected ? "bg-purple-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            }`}
                          >
                            Add Findings
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* FINDINGS EDITOR */}
              {selectedTestName ? (
                <div className="space-y-4 bg-slate-50/40 p-4 rounded-2xl border border-dashed border-slate-200 animate-fadeIn text-xs">
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="text-xxs font-bold text-slate-500 uppercase block font-mono">
                      2. Submit Results: <strong className="text-purple-700">{selectedTestName}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => loadPresetResults(selectedTestName)}
                      className="text-[9px] font-bold text-purple-600 bg-white border px-2 py-0.5 rounded shadow-3xs"
                    >
                      Autofill Normal Template
                    </button>
                  </div>

                  {/* Standard reference table for technicians */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-white border p-2.5 rounded-lg text-[9px] font-semibold text-slate-500 leading-relaxed">
                    <div>
                      <span className="block text-slate-400 font-bold uppercase">Blood FBG:</span>
                      <span className="text-slate-800">Normal 70 - 100 mg/dL</span>
                    </div>
                    <div>
                      <span className="block text-slate-400 font-bold uppercase">HbA1c:</span>
                      <span className="text-slate-800">Healthy &lt; 5.7%</span>
                    </div>
                    <div>
                      <span className="block text-slate-400 font-bold uppercase">Total Cholesterol:</span>
                      <span className="text-slate-800">&lt; 200 mg/dL</span>
                    </div>
                    <div>
                      <span className="block text-slate-400 font-bold uppercase">X-Ray:</span>
                      <span className="text-slate-800">Clear Bone Alignment</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase">Diagnostic Findings Log comments *</label>
                    <textarea
                      placeholder="Write specimen test outcomes, values, blood count levels, cell volume, annotations..."
                      rows={4}
                      value={reportText}
                      onChange={(e) => setReportText(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl p-3 outline-none font-mono text-xxs leading-relaxed focus:border-purple-500"
                    />
                  </div>

                  <div className="flex justify-end gap-2 text-xxs">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTestName("");
                        setReportText("");
                      }}
                      className="px-3.5 py-2 font-bold text-slate-500 border rounded-xl bg-white cursor-pointer"
                    >
                      Dismiss
                    </button>
                    <button
                      type="button"
                      disabled={publishing}
                      onClick={() => handlePublishClick(selectedTestName)}
                      className="bg-purple-600 hover:bg-purple-700 text-white font-extrabold px-5 py-2 rounded-xl transition cursor-pointer"
                    >
                      {publishing ? "Uploading Report..." : "PUBLISH DIAGNOSTIC REPORT"}
                    </button>
                  </div>

                </div>
              ) : (
                <div className="bg-slate-50 border p-6 rounded-2xl text-center text-slate-400 text-xxs font-medium leading-relaxed">
                  Select an ordered examination test in the list above to write and publish corresponding diagnostic report comments.
                </div>
              )}

              {/* REPORTS REVIEWS */}
              <div className="pt-4 border-t text-xxs text-slate-400 font-medium leading-relaxed">
                * When all ordered diagnostic examinations are fully reported, the high-availability flow core automatically pathways the patient to **Pharmacy Dispensary** or **Billing desks**.
              </div>
            </div>
          ) : (
            <div className="bg-white border rounded-3xl p-10 text-center text-slate-500 font-semibold text-xs space-y-2">
              <Activity className="h-8 w-8 text-slate-350 mx-auto animate-pulse" />
              <p>No specifications files selected. Please select a patient in the sidebar lineup sheet.</p>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
