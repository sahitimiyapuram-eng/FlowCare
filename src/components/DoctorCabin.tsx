import React, { useState } from "react";
import { FileText, ClipboardList, Plus, Trash2, Heart, Activity } from "lucide-react";

interface DoctorCabinProps {
  patients: any[];
  onCallNext: (doctorName: string) => Promise<void>;
  onCompleteConsultation: (id: string, consultData: any) => Promise<void>;
}

export default function DoctorCabin({ patients, onCallNext, onCompleteConsultation }: DoctorCabinProps) {
  const [selectedDoctor, setSelectedDoctor] = useState("Dr. Vikram Rathore");
  
  // Local active clinical notes state (SOAP)
  const [subjective, setSubjective] = useState("");
  const [objective, setObjective] = useState("");
  const [assessment, setAssessment] = useState("");
  const [plan, setPlan] = useState("");
  const [generalNotes, setGeneralNotes] = useState("");

  // Prescription items state
  const [prescribedDrugs, setPrescribedDrugs] = useState<any[]>([]);
  const [drugInput, setDrugInput] = useState("");
  const [dosageInput, setDosageInput] = useState("1 Tab");
  const [frequencyInput, setFrequencyInput] = useState("1-0-1");
  const [durationInput, setDurationInput] = useState("5 Days");
  const [qtyInput, setQtyInput] = useState(10);

  // Lab orders state
  const [orderedLabs, setOrderedLabs] = useState<string[]>([]);
  const [customLab, setCustomLab] = useState("");

  const [saving, setSaving] = useState(false);

  // Filter patients by status and selected doctor
  const waitingPatients = patients.filter(p => p.status === "waiting" && p.assignedDoctor === selectedDoctor);
  const servingPatients = patients.filter(p => p.status === "serving" && p.assignedDoctor === selectedDoctor);
  
  // Find current serving patient for THIS active doctor
  const activePatient = servingPatients[0] || null;

  // Presets dictionaries
  const drugCatalog = [
    { name: "Paracetamol 650mg", dosage: "1 Tab", freq: "1-0-1", duration: "5 Days", qty: 10 },
    { name: "Amoxicillin 500mg", dosage: "1 Cap", freq: "1-1-1", duration: "7 Days", qty: 21 },
    { name: "Atorvastatin 20mg", dosage: "1 Tab", freq: "0-0-1", duration: "30 Days", qty: 30 },
    { name: "Ibuprofen 400mg", dosage: "1 Tab", freq: "1-0-1", duration: "5 Days", qty: 10 },
    { name: "Metformin 500mg", dosage: "1 Tab", freq: "1-1-1", duration: "30 Days", qty: 90 }
  ];

  const labPresets = [
    "Blood HbA1c Glycated Hemoglobin",
    "ECG Cardiological Graph",
    "Ankle Joint X-Ray Imaging",
    "Complete Blood Count (CBC)",
    "Blood Lipid Panel",
    "Chest X-Ray Digital View"
  ];

  const handleAddPrescriptionItem = () => {
    if (!drugInput.trim()) return;
    setPrescribedDrugs([
      ...prescribedDrugs,
      {
        drugName: drugInput.trim(),
        dosage: dosageInput,
        frequency: frequencyInput,
        duration: durationInput,
        qty: Number(qtyInput) || 10
      }
    ]);
    setDrugInput("");
  };

  const handlePresetPrescription = (drug: any) => {
    setPrescribedDrugs([
      ...prescribedDrugs,
      {
        drugName: drug.name,
        dosage: drug.dosage,
        frequency: drug.freq,
        duration: drug.duration,
        qty: drug.qty
      }
    ]);
  };

  const handleRemovePrescription = (index: number) => {
    setPrescribedDrugs(prescribedDrugs.filter((_, idx) => idx !== index));
  };

  const handleToggleLabOrder = (test: string) => {
    if (orderedLabs.includes(test)) {
      setOrderedLabs(orderedLabs.filter(l => l !== test));
    } else {
      setOrderedLabs([...orderedLabs, test]);
    }
  };

  const handleAddCustomLab = () => {
    if (!customLab.trim()) return;
    if (!orderedLabs.includes(customLab.trim())) {
      setOrderedLabs([...orderedLabs, customLab.trim()]);
    }
    setCustomLab("");
  };

  const calculateNoShowProbability = (name: string): number => {
    if (!name) return 15;
    const charSum = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return Math.min(95, Math.max(5, (charSum * 7) % 65));
  };

  const handleDischargeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePatient) return;
    setSaving(true);
    
    const consultData = {
      consultNotes: generalNotes.trim() || `Consultation finished for ${activePatient.name}.`,
      soapNotes: {
        subjective: subjective.trim() || "Mild symptoms and complaints.",
        objective: objective.trim() || "Vitals within standard ranges.",
        assessment: assessment.trim() || "Symptomatic relief planned.",
        plan: plan.trim() || "Follow up in 2 weeks."
      },
      prescriptions: prescribedDrugs,
      labOrders: orderedLabs.map(testName => ({ testName })),
      doctorName: selectedDoctor
    };

    await onCompleteConsultation(activePatient._id, consultData);
    
    // Clear clinical forms
    setSubjective("");
    setObjective("");
    setAssessment("");
    setPlan("");
    setGeneralNotes("");
    setPrescribedDrugs([]);
    setOrderedLabs([]);
    setSaving(false);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* DOCTOR NAV FILTER BAR */}
      <div className="bg-white border p-4 rounded-3xl shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <span className="text-xxs uppercase tracking-wider font-extrabold text-blue-600 block font-mono">WORKSPACE DECENTRALIZATION</span>
          <h2 className="text-sm font-black text-slate-800">Hospital Staff Cabinet Roster</h2>
        </div>

        <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-xl border">
          {[
            { name: "Dr. Vikram Rathore", desc: "MD - General Medicine" },
            { name: "Dr. Ananya Sen", desc: "DM - Cardiology" },
            { name: "Dr. Siddhartha Das", desc: "MS - Orthopedics" },
            { name: "Dr. Preeti Patel", desc: "MD - Pediatrics" }
          ].map((doc) => (
            <button
              key={doc.name}
              onClick={() => setSelectedDoctor(doc.name)}
              className={`px-3 py-1.5 rounded-lg text-xxs font-extrabold transition cursor-pointer ${
                selectedDoctor === doc.name ? "bg-[#2563EB] text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {doc.name.split(" ")[1]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: ACTIVE ENVELOPE & WAITING ROOM */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* NOW CALL COMPONENT */}
          <div className="bg-slate-900 text-white rounded-3xl p-5 shadow-md border border-slate-800 space-y-4">
            <span className="text-[10px] uppercase font-black text-teal-400 font-mono tracking-widest block">Active Desk Consultation</span>

            {activePatient ? (
              <div className="space-y-4">
                <div className="text-center py-4 border-y border-slate-800 space-y-1.5">
                  <span className="text-5xl font-black font-mono tracking-widest text-[#14B8A6]">{activePatient.token}</span>
                  <h4 className="font-black text-sm uppercase text-slate-100">{activePatient.name}</h4>
                  <span className="bg-slate-800 text-[10px] font-bold px-2.5 py-0.5 rounded text-teal-400">
                    {activePatient.priority} Priority Case
                  </span>
                </div>

                <div className="text-[10px] space-y-2 text-slate-400">
                  <div className="flex justify-between">
                    <span>Patient UHID:</span>
                    <strong className="text-slate-200">{activePatient.uhid || "IN-FC-120349"}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Clinical Department:</span>
                    <strong className="text-slate-200">{activePatient.department || "General Medicine"}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Contact Cell:</span>
                    <strong className="text-slate-200">{activePatient.phone || "+91 98765 43210"}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>No-Show Risk:</span>
                    <strong className="text-amber-400">{calculateNoShowProbability(activePatient.name)}% Estimated</strong>
                  </div>
                  {activePatient.medicalHistory && (
                    <div className="pt-2 border-t border-slate-800 space-y-1">
                      <span className="text-xxs block text-slate-500 uppercase">Pre-existing Allergies:</span>
                      <p className="p-2 bg-slate-950 font-semibold text-[10px] text-red-300 rounded-lg">
                        {Array.isArray(activePatient.medicalHistory) ? activePatient.medicalHistory.join(", ") : activePatient.medicalHistory}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center p-6 bg-slate-950 border border-slate-800 rounded-2xl text-slate-400 space-y-3">
                <Heart className="h-8 w-8 text-slate-600 mx-auto animate-pulse" />
                <p className="text-xs font-semibold">No patient inside cabin {selectedDoctor.split(" ")[1]}.</p>
                {waitingPatients.length > 0 ? (
                  <button
                    onClick={() => onCallNext(selectedDoctor)}
                    className="w-full bg-[#2563EB] text-white font-extrabold text-xxs py-2.5 rounded-xl cursor-pointer"
                  >
                    CALL NEXT WAITING TOKEN
                  </button>
                ) : (
                  <span className="text-xxs text-slate-500 block">Lobby queue empty</span>
                )}
              </div>
            )}
          </div>

          {/* DOCTOR'S SPECIFIC QUEUE LINEUP */}
          <div className="bg-white border rounded-3xl p-5 shadow-xs space-y-3">
            <span className="text-[10px] uppercase font-black text-slate-500 font-mono tracking-widest block">Next Patients Scheduled</span>
            
            <div className="border rounded-2xl overflow-hidden divide-y max-h-[220px] overflow-y-auto">
              {waitingPatients.length === 0 ? (
                <div className="text-center py-10 text-xxs text-slate-400 font-semibold">Waiting Lobby is empty. All clear!</div>
              ) : (
                waitingPatients.map((p, idx) => (
                  <div key={p._id} className="p-3 bg-white flex items-center justify-between hover:bg-slate-50 font-sans text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <strong className="text-slate-900 font-mono text-xs">{p.token}</strong>
                        <span className="font-extrabold text-slate-800 uppercase text-xxs">{p.name}</span>
                        {p.priority !== "STANDARD" && (
                          <span className={`px-1 py-0.2 text-[7px] font-black uppercase rounded ${
                            p.priority === "EMERGENCY" ? "bg-red-100 text-red-600 animate-pulse" : "bg-amber-100 text-amber-700"
                          }`}>
                            {p.priority}
                          </span>
                        )}
                      </div>
                      <p className="text-xxs text-slate-400 font-medium">Assigned to: {p.assignedDoctor.split(" ")[1]}</p>
                    </div>
                    <span className="text-xxs font-bold text-teal-600 block bg-teal-50 border border-teal-100 px-1.5 py-0.2 rounded font-mono">
                      #{idx + 1}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* RIGHT TWO COLUMNS: EHR SOAP WRITER & TEST ORDERS CHECKS */}
        <div className="lg:col-span-2 space-y-6">
          
          {activePatient ? (
            <form onSubmit={handleDischargeSubmit} className="bg-white border rounded-3xl p-6 shadow-sm space-y-6">
              
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <span className="h-8 w-8 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center">
                    <FileText className="h-4.5 w-4.5" />
                  </span>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-base">EHR Clinical Case SOAP & Dispatches</h3>
                    <p className="text-xxs text-slate-500 font-semibold">Fulfill SOAP assessment guidelines, diagnostic tests & drugs presets</p>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase bg-slate-900 text-white font-mono">
                  {selectedDoctor}
                </span>
              </div>

              {/* SOAP SECTIONS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1.5">
                  <label className="block text-xxs font-bold text-slate-500 uppercase">1. Subjective History (S)</label>
                  <textarea
                    placeholder="Patient describes severe headache cluster, scoring 8/10 on pains meter, sudden onset..."
                    rows={2}
                    value={subjective}
                    onChange={(e) => setSubjective(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-50"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xxs font-bold text-slate-500 uppercase">2. Objective Findings (O)</label>
                  <textarea
                    placeholder="Vitals: BP 145/95 mmHg, irregular cardiac flutters, pupil reflexes normal, lungs chest clear..."
                    rows={2}
                    value={objective}
                    onChange={(e) => setObjective(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-50"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xxs font-bold text-slate-500 uppercase">3. Medical Assessment (A)</label>
                  <textarea
                    placeholder="Essential Hypertension with occasional sinus tachycardia, suspect Atrial Fibrillation..."
                    rows={2}
                    value={assessment}
                    onChange={(e) => setAssessment(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-50"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xxs font-bold text-slate-500 uppercase">4. Clinical Plan (P)</label>
                  <textarea
                    placeholder="Prescribed Atorvastatin. Request cardiology ECG testing. Advise low sodium diet, return follow up 10 days"
                    rows={2}
                    value={plan}
                    onChange={(e) => setPlan(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-50"
                  />
                </div>
              </div>

              {/* PRESCRIPTION DRUG DISPENSER */}
              <div className="bg-[#F8FAFC] border rounded-2xl p-4.5 space-y-4">
                <span className="text-xxs font-bold text-slate-500 uppercase block font-mono">Pharmacology Digital Dispatch (Rx)</span>
                
                {/* Click medicine presets */}
                <div className="space-y-1.5">
                  <span className="text-[9px] font-bold text-slate-400 block uppercase">Instant Presets catalog</span>
                  <div className="flex flex-wrap gap-1.5">
                    {drugCatalog.map((drug) => (
                      <button
                        key={drug.name}
                        type="button"
                        onClick={() => handlePresetPrescription(drug)}
                        className="bg-white border rounded px-2 py-1 text-[10px] font-semibold text-slate-600 hover:bg-slate-50 hover:border-slate-400 transition"
                      >
                        + {drug.name.split(" ")[0]} ({drug.dosage})
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xxs font-semibold">
                  <div className="col-span-2">
                    <input
                      type="text"
                      placeholder="Medication Name (e.g. Atorvastatin 20mg)"
                      value={drugInput}
                      onChange={(e) => setDrugInput(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Dosage (1 Tab)"
                      value={dosageInput}
                      onChange={(e) => setDosageInput(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Freq (1-0-1)"
                      value={frequencyInput}
                      onChange={(e) => setFrequencyInput(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none"
                    />
                  </div>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      placeholder="5 Days"
                      value={durationInput}
                      onChange={(e) => setDurationInput(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-1.5 py-1.5 outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddPrescriptionItem}
                      className="bg-blue-600 text-white rounded px-2 hover:bg-blue-700 transition"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* CURRENT RX LIST */}
                {prescribedDrugs.length > 0 && (
                  <div className="bg-white border rounded-xl overflow-hidden text-xxs font-semibold">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-100 text-slate-500 font-bold border-b select-none uppercase">
                          <th className="p-2">Drug Item</th>
                          <th className="p-2">Dosage Detail</th>
                          <th className="p-2">Frequency</th>
                          <th className="p-2">Duration</th>
                          <th className="p-2 text-right">Delete</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y text-slate-700">
                        {prescribedDrugs.map((med, index) => (
                          <tr key={index} className="hover:bg-slate-55/20">
                            <td className="p-2 font-bold text-slate-900">{med.drugName}</td>
                            <td className="p-2">{med.dosage}</td>
                            <td className="p-2">{med.frequency}</td>
                            <td className="p-2">{med.duration}</td>
                            <td className="p-2 text-right">
                              <button
                                type="button"
                                onClick={() => handleRemovePrescription(index)}
                                className="text-red-500 hover:text-red-700 font-extrabold pr-2"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* DIAGNOSTIC LAB ORDERS SECTOR */}
              <div className="border rounded-2xl p-4.5 space-y-3.5">
                <span className="text-xxs font-bold text-slate-500 uppercase block font-mono">Laboratory Diagnostic orders</span>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {labPresets.map((test) => {
                    const isChecked = orderedLabs.includes(test);
                    return (
                      <button
                        type="button"
                        key={test}
                        onClick={() => handleToggleLabOrder(test)}
                        className={`p-2.5 border rounded-xl text-left text-[11px] font-extrabold flex items-center justify-between transition cursor-pointer hover:border-slate-400 ${
                          isChecked ? "bg-purple-50 text-purple-700 border-purple-400 shadow-3xs" : "bg-white text-slate-600 border-slate-200"
                        }`}
                      >
                        <span>{test}</span>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          readOnly
                          className="h-3 w-3 accent-purple-600 rounded"
                        />
                      </button>
                    );
                  })}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Custom diagnostic test name (e.g. MRI Brain Contrast)"
                    value={customLab}
                    onChange={(e) => setCustomLab(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xxs font-semibold"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomLab}
                    className="bg-purple-600 text-white rounded-xl px-4 text-xxs font-bold hover:bg-purple-700 transition"
                  >
                    Add Order
                  </button>
                </div>
              </div>

              {/* CASE SUMMARY COMMENTS */}
              <div className="space-y-1.5">
                <label className="block text-xxs font-bold text-slate-500 uppercase">General Clinic notes summary</label>
                <input
                  type="text"
                  placeholder="Primary diagnostic consult finished cleanly. Dispatched to diagnostics lab."
                  value={generalNotes}
                  onChange={(e) => setGeneralNotes(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold outline-none focus:border-blue-500"
                />
              </div>

              {/* MAIN CHECKOUT GATEWAY */}
              <div className="border-t pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xxs">
                <p className="text-slate-400 font-medium leading-relaxed max-w-md">
                  Finishing consultation signs and bundles the electronic patient summary. The patient automatically transitions to **Diagnostics** or **Pharmacy** matching ordered dispatches.
                </p>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-6 py-3 rounded-xl transition cursor-pointer w-full sm:w-auto"
                >
                  {saving ? "Signing File..." : "SIGN CONSULTATION & DISPATCH"}
                </button>
              </div>

            </form>
          ) : (
            <div className="bg-white border rounded-3xl p-10 text-center text-slate-500 font-semibold text-xs space-y-2">
              <Activity className="h-8 w-8 text-slate-350 mx-auto animate-pulse" />
              <p>Please call a waiting client lineup from the pending lobby sidebar.</p>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
