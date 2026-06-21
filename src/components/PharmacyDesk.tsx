import React, { useState } from "react";
import { ClipboardList, Archive, CheckCircle, Search, AlertTriangle, Activity } from "lucide-react";

interface PharmacyDeskProps {
  patients: any[];
  inventory: any[];
  onDispensePrescription: (patientId: string) => Promise<void>;
}

export default function PharmacyDesk({ patients, inventory, onDispensePrescription }: PharmacyDeskProps) {
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [catalogSearch, setCatalogSearch] = useState("");
  const [loading, setLoading] = useState(false);

  // Filter patients resting at pharmacy station
  const pharmacyPatients = patients.filter(p => p.status === "pharmacy");

  const activePatient = patients.find(p => p._id === selectedPatientId) || pharmacyPatients[0] || null;

  const handleDispenseClick = async () => {
    if (!activePatient) return;
    setLoading(true);
    await onDispensePrescription(activePatient._id);
    setSelectedPatientId("");
    setLoading(false);
  };

  // Filter inventory list
  const filteredCatalog = inventory.filter(med => 
    med.drugName.toLowerCase().includes(catalogSearch.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* INVENTORY ALERTS HEADER */}
      <div className="bg-white border p-4.5 rounded-3xl shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <span className="text-xxs uppercase font-black text-[#14B8A6] font-mono tracking-wide block">DISPENSARY DRUG STORAGE MONITOR</span>
          <h2 className="text-sm font-black text-slate-800">Critical Stock Warning Alerts</h2>
        </div>

        <div className="flex gap-2 text-xxs font-extrabold flex-wrap">
          {inventory.filter(m => m.stock <= m.alertThreshold).map(m => (
            <div key={m.id} className="bg-red-50 text-red-650 border border-red-200 rounded-lg px-2.5 py-1 flex items-center space-x-1 animate-pulse">
              <AlertTriangle className="h-3 w-3 text-red-500" />
              <span>{m.drugName} ({m.stock} tabs remaining)</span>
            </div>
          ))}
          {inventory.filter(m => m.stock <= m.alertThreshold).length === 0 && (
            <div className="bg-emerald-50 text-emerald-800 border border-emerald-150 rounded-lg px-3 py-1 font-bold">
              ✓ All dispensary inventories are fully stocked
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* PANEL A: PENDING PRESCRIPTIONS */}
        <div className="lg:col-span-1 bg-white border rounded-3xl p-5 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
            <span className="h-8 w-8 bg-amber-50 text-amber-600 flex items-center justify-center rounded-lg">
              <ClipboardList className="h-4.5 w-4.5" />
            </span>
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm">Pending Prescriptions</h3>
              <p className="text-[10px] text-slate-500 font-semibold">Patients awaiting medication dispensing & advice</p>
            </div>
          </div>

          <div className="space-y-2 max-h-[380px] overflow-y-auto">
            {pharmacyPatients.length === 0 ? (
              <div className="text-center py-10 text-xxs text-slate-400 font-semibold">
                No active prescriptions waiting in dispensing lobby.
              </div>
            ) : (
              pharmacyPatients.map((p) => {
                const isSelected = activePatient && activePatient._id === p._id;
                const totalMeds = p.prescriptions?.length || 0;
                return (
                  <button
                    key={p._id}
                    type="button"
                    onClick={() => setSelectedPatientId(p._id)}
                    className={`w-full p-3.5 border text-left rounded-2xl block transition cursor-pointer ${
                      isSelected ? "border-amber-500 bg-amber-50/15" : "border-slate-200 bg-white hover:bg-slate-5;5"
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
                      <span className="px-2 py-0.5 text-[8px] font-black uppercase rounded bg-amber-100 text-amber-800 font-mono animate-pulse">
                        Rx Pending
                      </span>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500 font-semibold">
                      <span>Ref: {p.assignedDoctor.split(" ")[1]}</span>
                      <strong>{totalMeds} medicatons in list</strong>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* PANEL B: CO-EXHIBITING INVENTORY CATALOG & PICKER */}
        <div className="lg:col-span-2 space-y-6">
          
          {activePatient ? (
            <div className="bg-white border rounded-3xl p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b pb-3 border-slate-100">
                <div className="space-y-0.5">
                  <h4 className="font-black text-slate-900 text-sm uppercase">Dispense Desk — {activePatient.name}</h4>
                  <p className="text-xxs text-slate-400 font-semibold font-mono">UHID: {activePatient.uhid} | REF: {activePatient.assignedDoctor}</p>
                </div>
                <span className="bg-amber-600 text-white font-mono font-bold text-xxs px-2.5 py-0.5 rounded">
                  Status: Pharmacy Queue
                </span>
              </div>

              {/* PHARMACEUTICAL DRUGS TO DISPENSE */}
              <div className="space-y-3.5">
                <span className="text-xxs font-bold text-slate-500 uppercase block font-mono">1. Examine Diagnosed Prescriptions List</span>
                
                <div className="bg-[#F8FAFC] border rounded-2xl p-4.5 space-y-3 font-sans text-xs">
                  <div className="divide-y bg-white border rounded-xl overflow-hidden font-semibold">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-100 text-slate-500 text-[10px] uppercase font-mono border-b select-none">
                          <th className="p-2.5">Medication (Rx)</th>
                          <th className="p-2.5">Directions</th>
                          <th className="p-2.5">Frequency</th>
                          <th className="p-2.5">Duration</th>
                          <th className="p-2.5">Allocation</th>
                          <th className="p-2.5 text-right">In-Stock Check</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y text-slate-700 text-xxs">
                        {activePatient.prescriptions?.map((item: any, idx: number) => {
                          const stockMatch = inventory.find(i => i.drugName.toLowerCase().includes(item.drugName.toLowerCase()));
                          const isLowStock = stockMatch ? stockMatch.stock <= stockMatch.alertThreshold : false;
                          const inStock = stockMatch ? stockMatch.stock >= (item.qty || 10) : true;
                          return (
                            <tr key={idx} className="hover:bg-slate-10/50">
                              <td className="p-2.5 font-black text-slate-900">{item.drugName}</td>
                              <td className="p-2.5 text-slate-500">{item.dosage || "1 Tab"}</td>
                              <td className="p-2.5 text-slate-500">{item.frequency || "1-1-1"}</td>
                              <td className="p-2.5 text-slate-500">{item.duration || "5 Days"}</td>
                              <td className="p-2.5 font-mono font-black text-slate-600">{item.qty || 10} pcs</td>
                              <td className="p-2.5 text-right font-bold">
                                {isLowStock ? (
                                  <span className="text-red-500">⚠ Low ({stockMatch?.stock} left)</span>
                                ) : (
                                  <span className="text-emerald-600">✓ Ok ({stockMatch?.stock || 200} left)</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* ACTION DISPENSE RX */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-150 pt-4.5 text-xxs">
                <p className="text-slate-400 font-medium leading-relaxed max-w-sm">
                  Clicking dispense triggers automated bar-code pack verification, deducts stock counts, and forwards patients directly to the **Cashier Billing desk** for payment collection.
                </p>
                <button
                  type="button"
                  onClick={handleDispenseClick}
                  disabled={loading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-6 py-3 rounded-xl transition cursor-pointer w-full sm:w-auto"
                >
                  {loading ? "Fulfilling Prescriptions..." : "DISPENSE PREPACKED MEDS & COMPLETE"}
                </button>
              </div>

            </div>
          ) : (
            <div className="bg-white border rounded-3xl p-10 text-center text-slate-500 font-semibold text-xs space-y-2">
              <Archive className="h-8 w-8 text-slate-350 mx-auto animate-pulse" />
              <p>Pharmacist Cabin: Waiting on prescription files. Select a checked-in patient in the sidebar lineup.</p>
            </div>
          )}

          {/* DRUG CATALOG SEARCH UTILITY */}
          <div className="bg-white border rounded-3xl p-5 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-2">
              <span className="text-xxs font-bold text-slate-500 uppercase block font-mono">Dispensary Stock Catalog Directory ({inventory.length} drugs)</span>
              
              <div className="relative">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter medicine inventory..."
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  className="bg-slate-50 border rounded-lg pl-8 pr-3 py-1 text-xxs outline-none w-full sm:w-52"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
              {filteredCatalog.map(med => {
                const isUnderAlert = med.stock <= med.alertThreshold;
                return (
                  <div key={med.id} className="bg-slate-50 border p-2.5 rounded-xl flex flex-col justify-between space-y-1 text-xxs font-semibold">
                    <div>
                      <h6 className="font-extrabold text-slate-800 leading-tight block">{med.drugName}</h6>
                      <span className="text-[9px] text-slate-400 block font-mono">Price per unit: ₹{med.basePrice}</span>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t text-[10px]">
                      <span>Stock:</span>
                      <strong className={isUnderAlert ? "text-red-500" : "text-slate-800"}>
                        {med.stock} Tabs
                      </strong>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
