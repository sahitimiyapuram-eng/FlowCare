import React, { useState } from "react";
import { Monitor, Clock, Play, AlertTriangle, Sparkles, Volume2, TrendingUp, Activity } from "lucide-react";

interface LobbyBoardProps {
  patients: any[];
  avgConsultTime: number;
}

export default function LobbyBoard({ patients, avgConsultTime }: LobbyBoardProps) {
  const [patientQuery, setPatientQuery] = useState("");
  const [estimationData, setEstimationData] = useState<any | null>(null);

  // Filter lists
  const waitingPatients = patients.filter(p => p.status === "waiting");
  const servingPatients = patients.filter(p => p.status === "serving");
  const currentlyServing = servingPatients[0] || null;
  const completedPatients = patients.filter(p => p.status === "completed" || p.status === "discharged");

  const handleTokenSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.trim().toUpperCase();
    setPatientQuery(value);

    if (!value) {
      setEstimationData(null);
      return;
    }

    const matched = patients.find(p => p.token.toUpperCase() === value || p.token.toUpperCase() === `A${value}`);
    if (!matched) {
      setEstimationData({ ahead: 0, minutes: 0, name: "", found: false });
      return;
    }

    if (matched.status === "completed" || matched.status === "discharged") {
      setEstimationData({ ahead: 0, minutes: -1, name: matched.name, found: true, status: "completed" });
      return;
    }

    if (matched.status === "serving") {
      setEstimationData({ ahead: 0, minutes: 0, name: matched.name, found: true, status: "serving" });
      return;
    }

    const waitingLine = patients.filter(p => p.status === "waiting");
    const matchedIndex = waitingLine.findIndex(p => p._id === matched._id);

    if (matchedIndex !== -1) {
      setEstimationData({
        ahead: matchedIndex,
        minutes: matchedIndex * avgConsultTime,
        name: matched.name,
        found: true,
        status: "waiting",
        recommendedArrival: "12 mins prior"
      });
    } else {
      setEstimationData({
        ahead: 0,
        minutes: 0,
        name: matched.name,
        found: true,
        status: matched.status
      });
    }
  };

  return (
    <div id="lobby-board-root" className="bg-white border rounded-3xl p-6 space-y-6 shadow-xs border-slate-200 text-xs text-slate-800">
      
      {/* LOBBY RECEPTION HEADER */}
      <div className="flex items-center justify-between border-b pb-4">
        <div className="flex items-center space-x-2">
          <span className="h-8 w-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
            <Monitor className="h-4.5 w-4.5 stroke-[2.5]" />
          </span>
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm">Clinic Waiting Lobby Display Board</h3>
            <p className="text-xxs text-slate-400 font-semibold uppercase tracking-wider font-mono">Real-time TV updates — syncs automatically</p>
          </div>
        </div>
        <div className="flex items-center space-x-1.5 bg-emerald-50 text-emerald-750 px-2.5 py-0.5 border border-emerald-250 rounded-full animate-pulse">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
          <span className="text-[9px] font-black uppercase tracking-widest font-mono text-emerald-700">LIVE SYNC ACTIVE</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* NOW PUBLIC SERVING SCREEN */}
        <div className="bg-[#0F172A] text-white rounded-2xl p-5 flex flex-col justify-between space-y-6 shadow-md relative overflow-hidden border border-slate-800">
          <div className="absolute top-0 right-0 -mr-12 -mt-12 h-36 w-36 rounded-full bg-emerald-500/5 blur-2xl"></div>
          
          <div>
            <span className="text-[9px] font-mono uppercase font-black text-[#14B8A6] tracking-widest block">NOW SERVING IN CONSULT CABIN</span>
            <div className="mt-4 text-center border-y border-slate-800 py-6">
              {currentlyServing ? (
                <div className="space-y-1.5">
                  <h4 className="text-5xl font-black font-mono tracking-widest text-[#14B8A6] drop-shadow">
                    {currentlyServing.token}
                  </h4>
                  <p className="text-xs font-bold text-white uppercase tracking-wide">
                    {currentlyServing.name}
                  </p>
                  <span className="text-[9px] font-bold text-slate-400 bg-slate-800 px-2.5 py-0.5 rounded border border-slate-700 uppercase">
                    Cabin: {currentlyServing.assignedDoctor.split(" ")[1]}
                  </span>
                </div>
              ) : (
                <div className="text-slate-500 text-xxs py-3 space-y-1">
                  <Activity className="h-6 w-6 mx-auto text-slate-600 animate-pulse" />
                  <span>Next ticket called by Operator immediately.</span>
                </div>
              )}
            </div>
          </div>

          <div className="text-[10px] text-slate-400 flex items-center justify-between font-bold">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-blue-500" /> Wait Rate: {avgConsultTime} Mins
            </span>
            <span className="bg-slate-800 text-slate-300 px-2.5 py-0.5 rounded font-mono font-bold">
              {completedPatients.length} SATE SAFELY
            </span>
          </div>
        </div>

        {/* LOBBY QUEUE TOKEN BAR LISTING */}
        <div className="bg-[#F8FAFC] border rounded-2xl p-5 flex flex-col justify-between space-y-5">
          <div>
            <span className="text-[10px] font-mono uppercase font-black text-slate-500 block">LOBBY TOKEN SEQUENCE LOBBY</span>
            {waitingPatients.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xxs font-semibold">
                Lobby queue is cleared. No waiting patents.
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2.5 max-h-[140px] overflow-y-auto pt-2.5">
                {waitingPatients.map((p, idx) => (
                  <div key={p._id} className="bg-white border rounded-xl p-3 text-center shadow-3xs hover:scale-105 transition">
                    <span className="block font-black text-sm text-slate-900 font-mono">{p.token}</span>
                    <span className="text-[9px] font-bold text-[#14B8A6] font-mono block">#{idx + 1} Ahead</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white border rounded-xl p-3.5 flex items-center justify-between text-xxs text-slate-500 font-semibold shadow-3xs">
            <div className="flex items-center space-x-1">
              <TrendingUp className="h-3.5 w-3.5 text-blue-600" />
              <span>Lobby wait volume:</span>
            </div>
            <span className="font-extrabold text-slate-900 font-mono">
              {waitingPatients.length * avgConsultTime} mins total demand
            </span>
          </div>
        </div>

      </div>

      {/* SEARCH Wait ESTIMATOR BOX */}
      <div className="bg-[#F8FAFC] border border-slate-200 rounded-2xl p-4.5 space-y-3.5">
        <div className="flex items-center justify-between">
          <h4 className="font-extrabold text-xs text-slate-800 flex items-center uppercase tracking-wide">
            <Clock className="h-4.5 w-4.5 text-[#2563EB] mr-1.5" /> Direct Wait Estimator Tracker
          </h4>
          <span className="text-slate-400 font-mono text-[9px]">Telemetry optimized</span>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative w-full sm:w-56 text-xxs">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 text-[9px] font-mono font-bold uppercase select-none">Token</span>
            <input
              type="text"
              value={patientQuery}
              onChange={handleTokenSearchChange}
              placeholder="e.g. A3"
              className="w-full bg-white border border-slate-200 rounded-xl pl-16 pr-3 py-2 text-xs font-black outline-none focus:border-blue-500 uppercase"
            />
          </div>
          <p className="text-[10px] text-slate-400 font-semibold flex-1 flex items-center">
            Enter your diagnostic Token Number (e.g. A3) to calculate your exact index timing, patient count ahead, and recommended arrival advisories.
          </p>
        </div>

        {/* DETAILS ESTIMATOR OUTPUT */}
        {patientQuery && estimationData && (
          <div className="bg-white border rounded-xl p-3.5 animate-fadeIn font-semibold text-xxs leading-relaxed">
            {estimationData.found ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b pb-2 font-mono text-xxs text-slate-400">
                  <span>Name: <strong className="text-slate-950 uppercase">{estimationData.name}</strong></span>
                  <span>
                    {estimationData.status === "completed" || estimationData.status === "discharged" ? (
                      <span className="text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded border">Fully Discharged</span>
                    ) : estimationData.status === "serving" ? (
                      <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 animate-pulse font-extrabold">Active in consultation</span>
                    ) : (
                      <span className="text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-250 font-bold">Lobby Line</span>
                    )}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-slate-50 border rounded-lg p-2.5 flex items-center gap-2.5">
                    <div className="h-7 w-7 bg-white text-xs font-mono font-black text-slate-600 rounded border flex items-center justify-center">
                      {estimationData.ahead}
                    </div>
                    <div>
                      <span className="text-[8px] uppercase text-slate-400 font-bold block">Patients Ahead</span>
                      <span className="text-xxs font-extrabold text-slate-700">{estimationData.ahead} patient ahead</span>
                    </div>
                  </div>

                  <div className="bg-slate-50 border rounded-lg p-2.5 flex items-center gap-2.5">
                    <div className="h-7 w-7 bg-blue-50 text-blue-600 text-xs font-mono font-black border border-blue-200 rounded flex items-center justify-center">
                      {estimationData.status === "completed" ? "00" : estimationData.minutes}
                    </div>
                    <div>
                      <span className="text-[8px] uppercase text-slate-400 font-bold block">Estimated Waiting</span>
                      <span className="text-xxs font-extrabold text-blue-700">
                        {estimationData.status === "completed" ? "Settle Finished" : estimationData.status === "serving" ? "In cabin now!" : `${estimationData.minutes} mins wait`}
                      </span>
                    </div>
                  </div>

                  <div className="bg-slate-50 border rounded-lg p-2.5 flex items-center gap-2.5">
                    <div className="h-7 w-7 bg-purple-50 text-purple-600 text-xs font-mono font-black border border-purple-250 rounded flex items-center justify-center">
                      AI
                    </div>
                    <div>
                      <span className="text-[8px] uppercase text-slate-400 font-bold block">Arrival Advisory</span>
                      <span className="text-xxs font-extrabold text-[#2563EB]">
                        {estimationData.status === "completed" ? "Archived" : estimationData.status === "serving" ? "Now called" : "Arrive: 12m prior"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-amber-600 text-[11px] font-semibold flex items-center gap-1 select-none">
                <AlertTriangle className="h-4 w-4" />
                <span>No active medical file matched token &quot;{patientQuery}&quot;. Please verify spelling.</span>
              </div>
            )}
          </div>
        )}

      </div>

    </div>
  );
}
