import React, { useState } from "react";
import { CreditCard, FileText, CheckCircle, Printer, Sparkles, Activity } from "lucide-react";

interface BillingDeskProps {
  patients: any[];
  onSettleInvoice: (patientId: string, paymentMethod: string, insuranceAmt: number) => Promise<void>;
}

export default function BillingDesk({ patients, onSettleInvoice }: BillingDeskProps) {
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [payMethod, setPayMethod] = useState("UPI");
  const [insuranceApproved, setInsuranceApproved] = useState(0);
  const [loading, setLoading] = useState(false);
  const [receiptPrinted, setReceiptPrinted] = useState(false);

  // Filter patients resting at cashier counter
  const billingPatients = patients.filter(p => p.status === "billing");

  const activePatient = patients.find(p => p._id === selectedPatientId) || billingPatients[0] || null;

  const handlePayClick = async () => {
    if (!activePatient) return;
    setLoading(true);
    await onSettleInvoice(activePatient._id, payMethod, Number(insuranceApproved));
    setReceiptPrinted(true);
    setLoading(false);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* FINANCIAL STAT SUMMARY */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {["Pending Invoices", "Est Unpaid Value", "GST TAX Ratio", "Insurance claims Approved"].map((lbl, idx) => (
          <div key={lbl} className="bg-white border rounded-2xl p-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 block uppercase font-mono">{lbl}</span>
              <span className="text-xl font-black text-slate-800 font-mono">
                {idx === 0 ? billingPatients.length : idx === 1 ? `₹${billingPatients.reduce((sum, p) => sum + (p.billingInvoice?.totalAmount || 531), 0)}` : idx === 2 ? "18% Support" : `₹${patients.filter(p => p.status === "completed").reduce((sum, p) => sum + (p.billingInvoice?.insuranceApprovedAmount || 0), 0)}`}
              </span>
            </div>
            <span className="h-2.5 w-2.5 bg-emerald-500 rounded-full"></span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* PANEL A: PENDING PAYMENTS LOBBY */}
        <div className="lg:col-span-1 bg-white border rounded-3xl p-5 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
            <span className="h-8 w-8 bg-emerald-50 text-emerald-600 flex items-center justify-center rounded-lg">
              <CreditCard className="h-4.5 w-4.5" />
            </span>
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm">Cashier Worklist Ledger</h3>
              <p className="text-[10px] text-slate-500 font-semibold">Patients awaiting checkout, GST bills and receipts</p>
            </div>
          </div>

          <div className="space-y-2 max-h-[380px] overflow-y-auto">
            {billingPatients.length === 0 ? (
              <div className="text-center py-10 text-xxs text-slate-400 font-semibold leading-relaxed">
                No active receipts pending payment. All patient invoices are fully settled.
              </div>
            ) : (
              billingPatients.map((p) => {
                const isSelected = activePatient && activePatient._id === p._id;
                const totalInvoice = p.billingInvoice?.totalAmount || 531;
                return (
                  <button
                    key={p._id}
                    type="button"
                    onClick={() => {
                      setSelectedPatientId(p._id);
                      setReceiptPrinted(false);
                    }}
                    className={`w-full p-4 border text-left rounded-2xl block transition cursor-pointer ${
                      isSelected ? "border-emerald-500 bg-emerald-50/15" : "border-slate-200 bg-white hover:bg-slate-5;5"
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
                      <span className="px-2 py-0.5 text-[8.5px] font-black uppercase rounded bg-red-100 text-red-650 font-mono animate-pulse">
                        Unpaid
                      </span>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-500">
                      <span>Ref Department: {p.department}</span>
                      <strong className="text-emerald-700 font-mono">₹{totalInvoice}</strong>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* PANEL B: INVOICING CALCULATOR & PRINT PREVIEWS */}
        <div className="lg:col-span-2 space-y-6">
          
          {activePatient ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white border rounded-3xl p-6 shadow-sm">
              
              {/* LEDGER DETAILS & ADJUSTMENTS */}
              <div className="md:col-span-2 space-y-5">
                <div className="flex items-center space-x-1.5 border-b pb-3 border-slate-100">
                  <h4 className="font-black text-slate-900 text-sm uppercase">Itemized Invoice — {activePatient.name}</h4>
                  <span className="bg-[#14B8A6]/10 text-[#14B8A6] font-mono font-bold text-[9px] px-1.5 py-0.2 rounded border border-teal-150 uppercase">GST OK</span>
                </div>

                {/* Ledger Items Table */}
                <div className="border rounded-2xl overflow-hidden bg-[#F8FAFC] text-xxs font-semibold">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-100 text-slate-500 text-[10px] uppercase font-mono border-b">
                        <th className="p-2.5">Ledger Charge description</th>
                        <th className="p-2.5 text-center">Qty</th>
                        <th className="p-2.5">Price</th>
                        <th className="p-2.5 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-slate-705">
                      {activePatient.billingInvoice?.items?.map((item: any, idx: number) => (
                        <tr key={idx} className="bg-white hover:bg-slate-50/50">
                          <td className="p-2.5 text-slate-800 font-bold">{item.description}</td>
                          <td className="p-2.5 text-center text-slate-510 font-mono">{item.quantity || 1}</td>
                          <td className="p-2.5 text-slate-500 font-mono">₹{item.unitPrice}</td>
                          <td className="p-2.5 text-right font-black font-mono text-slate-800">₹{item.amount}</td>
                        </tr>
                      ))}
                      {(!activePatient.billingInvoice?.items || activePatient.billingInvoice.items.length === 0) && (
                        <tr className="bg-white">
                          <td className="p-2.5 text-slate-800 font-bold">Base Clinical Consultation</td>
                          <td className="p-2.5 text-center text-slate-510 font-mono">1</td>
                          <td className="p-2.5 text-slate-500 font-mono">₹450</td>
                          <td className="p-2.5 text-right font-black font-mono text-slate-800">₹450</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* TAX / INSURANCE INPUTS */}
                <div className="bg-slate-50/50 border rounded-2xl p-4 space-y-3">
                  <span className="text-xxs font-bold text-slate-500 uppercase block font-mono">Payment configurations</span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="space-y-1 text-xxs">
                      <label className="block font-bold text-slate-400 uppercase">Payment Channel</label>
                      <select
                        value={payMethod}
                        onChange={(e) => setPayMethod(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-bold text-slate-700"
                      >
                        <option value="UPI">UPI qr scanner</option>
                        <option value="CARD">Credit/Debit POS Card</option>
                        <option value="CASH">Cash payment</option>
                        <option value="INSURANCE">Insurance coverage claim</option>
                      </select>
                    </div>

                    <div className="space-y-1 text-xxs">
                      <label className="block font-bold text-slate-100 uppercase">Insurance deductibles (₹)</label>
                      <input
                        type="number"
                        placeholder="0"
                        value={insuranceApproved}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          const total = activePatient.billingInvoice?.totalAmount || 531;
                          setInsuranceApproved(Math.min(total, val));
                        }}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-semibold"
                      />
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                    * Policyholder verified: <strong className="text-slate-600">{activePatient.insuranceName || "No Insurance Linked"}</strong> (ID: {activePatient.insuranceId || "N/A"}). Maximum insurance clearance is capped to total invoice.
                  </p>
                </div>

                {/* SETTLE ACTIONS */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handlePayClick}
                    disabled={loading || activePatient.status === "completed"}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs py-3.5 rounded-xl transition cursor-pointer"
                  >
                    {loading ? "Settling Ledger accounts..." : `SETTLE ₹${(activePatient.billingInvoice?.totalAmount || 531) - insuranceApproved} DUE & DISCHARGE`}
                  </button>
                </div>

              </div>

              {/* LIVE DIGITAL RECEIPTS PRINTER PREVIEW */}
              <div className="md:col-span-1 border-l pl-0 md:pl-6 border-slate-100 space-y-4">
                <span className="text-xxs font-bold text-slate-500 uppercase block font-mono">Digital PDF Receipt</span>

                {/* Printable receipt card */}
                <div className="border bg-[#FCFCFD] font-mono shadow-3xs p-4 text-[9px] text-slate-600 rounded-xl leading-relaxed space-y-3 relative overflow-hidden border-dashed border-slate-300">
                  
                  {/* FlowCare Receipt Watermark watermark */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] select-none pointer-events-none transform -rotate-12">
                    <span className="text-5xl font-black">FLOWCARE</span>
                  </div>

                  <div className="text-center font-black border-b border-dashed pb-2">
                    <h5 className="text-xs text-slate-900 tracking-tight">FLOWCARE CLINIC AI</h5>
                    <p className="font-semibold text-slate-400 font-sans">Patient Flow OS, Bangalore</p>
                    <p className="font-semibold text-slate-400">Date: 2026-06-22 12:45</p>
                  </div>

                  <div className="space-y-1 border-b border-dashed pb-2.5 text-[8.5px]">
                    <p>UHID: <strong className="text-slate-800">{activePatient.uhid || "IN-FC-102934"}</strong></p>
                    <p>Token: <strong className="text-slate-800">{activePatient.token}</strong></p>
                    <p>NAME: <strong className="text-slate-800 uppercase">{activePatient.name}</strong></p>
                    <p>DOCTOR: <strong className="text-slate-800">{activePatient.assignedDoctor}</strong></p>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between font-bold">
                      <span>SUBTOTAL:</span>
                      <span>₹{activePatient.billingInvoice?.subtotal || 450}</span>
                    </div>
                    <div className="flex justify-between font-bold text-slate-400">
                      <span>18% GST TAX:</span>
                      <span>₹{activePatient.billingInvoice?.taxAmount || 81}</span>
                    </div>
                    {insuranceApproved > 0 && (
                      <div className="flex justify-between font-bold text-blue-600">
                        <span>INS CLAIMS APPRV:</span>
                        <span>-₹{insuranceApproved}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-black text-slate-900 border-t border-dashed pt-1.5 text-[11px]">
                      <span>TOTAL PAID:</span>
                      <span>₹{Math.max(0, (activePatient.billingInvoice?.totalAmount || 531) - insuranceApproved)}</span>
                    </div>
                  </div>

                  <div className="text-center font-black border-t border-dashed pt-2.5 space-y-1.5">
                    <p className="bg-slate-950 font-mono text-white inline-block px-2 text-[8px] rounded uppercase font-bold tracking-wider">
                      {receiptPrinted ? "PAID IN FULL" : "UNPAID LEDGER"}
                    </p>
                    <p className="text-[7.5px] text-slate-400 font-sans">Thank you for cooperation across clinic matrix!</p>
                  </div>

                </div>

                <button
                  type="button"
                  onClick={() => alert("Simulating local thermal printer spooler... Completed!")}
                  className="w-full bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 font-extrabold text-[10px] py-2 rounded-xl flex items-center justify-center space-x-1"
                >
                  <Printer className="h-3.5 w-3.5 text-slate-500" />
                  <span>Print Thermal Receipt</span>
                </button>
              </div>

            </div>
          ) : (
            <div className="bg-white border rounded-3xl p-10 text-center text-slate-500 font-semibold text-xs space-y-2">
              <Activity className="h-8 w-8 text-slate-350 mx-auto animate-pulse" />
              <p>Cashier desk standing by. Select an unpaid patient record in the billing sidebar lineup.</p>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
