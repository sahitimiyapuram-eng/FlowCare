import React, { useState } from "react";
import { 
  UserPlus, Calendar, Plus, Clock, Key, Shield, RefreshCw, 
  UserCheck, ArrowRight, CheckCircle2, ChevronRight, AlertCircle,
  MoreVertical, ShieldAlert, Sliders, Play, Trash2, Heart,
  Activity, Sparkles, Phone, Mail, User, Radio, ArrowUpRight
} from "lucide-react";

interface IntakeDeskProps {
  patients: any[];
  appointments: any[];
  onAddPatient: (patientData: any) => Promise<void>;
  onCheckInAppointment: (id: string) => Promise<void>;
  onScheduleAppointment: (aptData: any) => Promise<void>;
  onCancelAppointment: (id: string) => Promise<void>;
  onCallNext: (doctorName: string) => Promise<void>;
  onUpdatePatient: (id: string, updatedFields: any) => Promise<void>;
}

export default function IntakeDesk({
  patients,
  appointments,
  onAddPatient,
  onCheckInAppointment,
  onScheduleAppointment,
  onCancelAppointment,
  onCallNext,
  onUpdatePatient
}: IntakeDeskProps) {
  // Tabs for registration column
  const [regTab, setRegTab] = useState<"walkin" | "schedule">("walkin");
  
  // Walk-in form state
  const [name, setName] = useState("");
  const [gender, setGender] = useState("Male");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [priority, setPriority] = useState("STANDARD");
  const [department, setDepartment] = useState("General Medicine");
  const [doctor, setDoctor] = useState("Dr. Vikram Rathore");
  const [insuranceName, setInsuranceName] = useState("");
  const [insuranceId, setInsuranceId] = useState("");
  const [medHistory, setMedHistory] = useState("");

  // Appointment form state
  const [aptName, setAptName] = useState("");
  const [aptPhone, setAptPhone] = useState("");
  const [aptDoctor, setAptDoctor] = useState("Dr. Vikram Rathore");
  const [aptSpecialty, setAptSpecialty] = useState("General Medicine");
  const [aptDate, setAptDate] = useState("2026-06-22");
  const [aptTime, setAptTime] = useState("10:00 AM");
  const [aptGender, setAptGender] = useState("Male");

  // Local loading feedback flags
  const [signing, setSigning] = useState(false);
  const [booking, setBooking] = useState(false);
  
  // Filter states for active queue display
  const [queueFilter, setQueueFilter] = useState<"active" | "waiting" | "consulting" | "labs" | "pharmacy" | "billing">("active");

  const handleWalkInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return alert("Patient name is required");
    setSigning(true);
    await onAddPatient({
      name: name.trim(),
      gender,
      phone: phone.trim() || "+91 98765 43210",
      email: email.trim() || "patient@flowcare.ai",
      priority,
      assignedDoctor: doctor,
      department,
      insuranceName: insuranceName.trim() || "None",
      insuranceId: insuranceId.trim() || "",
      medicalHistory: medHistory.trim() || "No prior history specified"
    });
    setName("");
    setPhone("");
    setEmail("");
    setInsuranceName("");
    setInsuranceId("");
    setMedHistory("");
    setSigning(false);
  };

  const handleAptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aptName.trim() || !aptPhone.trim()) return alert("Patient name and contact are required");
    setBooking(true);
    await onScheduleAppointment({
      name: aptName.trim(),
      phone: aptPhone.trim(),
      doctorName: aptDoctor,
      specialty: aptSpecialty,
      date: aptDate,
      timeSlot: aptTime,
      gender: aptGender,
      dob: "1994-06-15"
    });
    setAptName("");
    setAptPhone("");
    setBooking(false);
  };

  const handleDeptChange = (dept: string) => {
    setDepartment(dept);
    if (dept === "General Medicine") setDoctor("Dr. Vikram Rathore");
    else if (dept === "Cardiology") setDoctor("Dr. Ananya Sen");
    else if (dept === "Orthopedics") setDoctor("Dr. Siddhartha Das");
    else if (dept === "Pediatrics") setDoctor("Dr. Preeti Patel");
  };

  const handleAptDeptChange = (dept: string) => {
    setAptSpecialty(dept);
    if (dept === "General Medicine") setAptDoctor("Dr. Vikram Rathore");
    else if (dept === "Cardiology") setAptDoctor("Dr. Ananya Sen");
    else if (dept === "Orthopedics") setAptDoctor("Dr. Siddhartha Das");
    else if (dept === "Pediatrics") setAptDoctor("Dr. Preeti Patel");
  };

  // Compute stats helper
  const waitingPatients = patients.filter(p => p.status === "waiting");
  const activeInClinic = patients.filter(p => p.status !== "completed" && p.status !== "discharged");

  // Filters candidates for Operations Board
  const filteredPatients = activeInClinic.filter(p => {
    if (queueFilter === "active") return true;
    if (queueFilter === "waiting") return p.status === "waiting";
    if (queueFilter === "consulting") return p.status === "serving";
    if (queueFilter === "labs") return p.status === "lab_pending" || p.status === "lab_processing";
    if (queueFilter === "pharmacy") return p.status === "pharmacy";
    if (queueFilter === "billing") return p.status === "billing";
    return true;
  });

  // Cycle priority helper
  const cyclePriority = async (patientId: string, currentPriority: string) => {
    let nextPriority = "STANDARD";
    if (currentPriority === "STANDARD") nextPriority = "VIP";
    else if (currentPriority === "VIP") nextPriority = "EMERGENCY";
    else nextPriority = "STANDARD";
    
    await onUpdatePatient(patientId, { priority: nextPriority });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      
      {/* METRIC RIBBON */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-100 p-4.5 rounded-2xl flex items-center justify-between shadow-2xs">
          <div>
            <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider font-mono">Today's Registrations</span>
            <span className="text-2xl font-black text-slate-800 font-mono tracking-tight">{patients.length}</span>
          </div>
          <span className="h-10 w-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-bold text-xs">
            Total
          </span>
        </div>
        <div className="bg-white border border-slate-100 p-4.5 rounded-2xl flex items-center justify-between shadow-2xs">
          <div>
            <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider font-mono">Waiting Consultation</span>
            <span className="text-2xl font-black text-teal-600 font-mono tracking-tight">{waitingPatients.length}</span>
          </div>
          <span className="h-10 w-10 bg-teal-50 text-teal-600 rounded-xl flex items-center justify-center font-bold text-xs text-center leading-none">
            Queue
          </span>
        </div>
        <div className="bg-white border border-slate-100 p-4.5 rounded-2xl flex items-center justify-between shadow-2xs">
          <div>
            <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider font-mono">Booked Appointments</span>
            <span className="text-2xl font-black text-purple-600 font-mono tracking-tight">
              {appointments.filter(a => a.status === "SCHEDULED").length}
            </span>
          </div>
          <span className="h-10 w-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center font-bold text-xs uppercase tracking-tighter">
            Booked
          </span>
        </div>
        <div className="bg-white border border-slate-100 p-4.5 rounded-2xl flex items-center justify-between shadow-2xs">
          <div>
            <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider font-mono">Active In-clinic</span>
            <span className="text-2xl font-black text-rose-500 font-mono tracking-tight">{activeInClinic.length}</span>
          </div>
          <span className="h-10 w-10 bg-rose-50 text-rose-500 rounded-xl flex items-center justify-center font-bold text-xs uppercase tracking-tighter">
            Clinical
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: CONTROLS & NEW ENTRIES (45% size -> lg:col-span-5) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-slate-100 rounded-2xl p-5.5 shadow-xs space-y-5">
            
            {/* COMPACT SEGMENT TABS */}
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setRegTab("walkin")}
                className={`flex-1 py-2 text-center rounded-lg text-xs font-bold transition flex items-center justify-center space-x-2 cursor-pointer ${
                  regTab === "walkin" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>Walk-In Patient</span>
              </button>
              <button
                onClick={() => setRegTab("schedule")}
                className={`flex-1 py-2 text-center rounded-lg text-xs font-bold transition flex items-center justify-center space-x-2 cursor-pointer ${
                  regTab === "schedule" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Calendar className="h-3.5 w-3.5" />
                <span>Book Appointment</span>
              </button>
            </div>

            {/* TAB CONTENT A: WALKIN FORM */}
            {regTab === "walkin" ? (
              <form onSubmit={handleWalkInSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="block text-xxs font-bold text-slate-400 uppercase tracking-wider">Patient Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rahul Sharma"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:bg-white focus:border-blue-500 transition"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xxs font-bold text-slate-400 uppercase tracking-wider">Mobile Number *</label>
                    <input
                      type="text"
                      placeholder="e.g. +91 98765 43210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:bg-white focus:border-blue-500 transition"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="block text-xxs font-bold text-slate-400 uppercase tracking-wider">Gender</label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-xs font-semibold outline-none"
                    >
                      <option>Male</option>
                      <option>Female</option>
                      <option>Other</option>
                    </select>
                  </div>
                  <div className="space-y-1 col-span-2">
                    <label className="block text-xxs font-bold text-slate-400 uppercase tracking-wider">Email Address</label>
                    <input
                      type="email"
                      placeholder="e.g. rahul@gmail.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:bg-white focus:border-blue-500 transition"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="block text-xxs font-bold text-slate-400 uppercase tracking-wider">Specialty</label>
                    <select
                      value={department}
                      onChange={(e) => handleDeptChange(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-xs font-semibold outline-none text-slate-700"
                    >
                      <option value="General Medicine">Med Specialty</option>
                      <option value="Cardiology">Cardiology</option>
                      <option value="Orthopedics">Orthopedics</option>
                      <option value="Pediatrics">Pediatrics</option>
                    </select>
                  </div>
                  <div className="space-y-1 overflow-hidden">
                    <label className="block text-xxs font-bold text-slate-400 uppercase tracking-wider">Clinician</label>
                    <input
                      type="text"
                      readOnly
                      value={doctor}
                      className="w-full bg-slate-100 border border-slate-200 text-slate-500 rounded-xl px-2.5 py-2 text-[11px] font-black outline-none truncate"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xxs font-bold text-slate-400 uppercase tracking-wider">Priority Code</label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                      className={`w-full bg-slate-50 border rounded-xl px-2 py-2 text-xs font-extrabold outline-none ${
                        priority === "EMERGENCY" ? "border-red-500 text-red-600 bg-red-50/50" : priority === "VIP" ? "border-amber-500 text-amber-600 bg-amber-50" : "border-slate-200 text-slate-700"
                      }`}
                    >
                      <option value="STANDARD">Standard</option>
                      <option value="VIP">VIP Fast</option>
                      <option value="EMERGENCY">Emergency</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-slate-50/40 p-3 rounded-xl border border-slate-100">
                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Insurance Carrier</label>
                    <input
                      type="text"
                      placeholder="e.g. Max Bupa"
                      value={insuranceName}
                      onChange={(e) => setInsuranceName(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xxs font-semibold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Policy ID Number</label>
                    <input
                      type="text"
                      placeholder="e.g. MB-92330"
                      value={insuranceId}
                      onChange={(e) => setInsuranceId(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xxs font-semibold"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-xxs font-bold text-slate-400 uppercase tracking-wider">Critical History / Allergies</label>
                  <textarea
                    placeholder="Allergies, hypertension, diabetic history if any..."
                    rows={2}
                    value={medHistory}
                    onChange={(e) => setMedHistory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-medium outline-none focus:bg-white focus:border-blue-500 transition"
                  />
                </div>

                <button
                  type="submit"
                  disabled={signing}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs py-3 rounded-xl transition cursor-pointer shadow-xs flex items-center justify-center space-x-2"
                >
                  {signing ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Saving Patient Roster...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4" />
                      <span>Register & Issue Token</span>
                    </>
                  )}
                </button>
              </form>
            ) : (
              /* TAB CONTENT B: FORM FOR PRE-ROSTER SLOTS APPOINTMENT */
              <form onSubmit={handleAptSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="block text-xxs font-bold text-slate-400 uppercase tracking-wider text-purple-600">Select Registered Patient (Optional)</label>
                  <select
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      if (selectedId) {
                        const p = patients.find(pat => pat._id === selectedId);
                        if (p) {
                          setAptName(p.name || "");
                          setAptPhone(p.phone || "");
                          if (p.gender) setAptGender(p.gender);
                          if (p.assignedDoctor) {
                            setAptDoctor(p.assignedDoctor);
                            if (p.department) setAptSpecialty(p.department);
                          }
                        }
                      } else {
                        setAptName("");
                        setAptPhone("");
                      }
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-semibold outline-none focus:bg-white focus:border-blue-500 transition"
                  >
                    <option value="">-- Manual Entry / Pick Registered Patient --</option>
                    {patients.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.name} ({p.token || p.uhid || "No Token"})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="block text-xxs font-bold text-slate-400 uppercase tracking-wider">Patient Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Sameer Roy"
                      value={aptName}
                      onChange={(e) => setAptName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:bg-white focus:border-blue-500 transition"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xxs font-bold text-slate-400 uppercase tracking-wider">Contact Phone *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. +91 99011 22334"
                      value={aptPhone}
                      onChange={(e) => setAptPhone(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:bg-white focus:border-blue-500 transition"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="block text-xxs font-bold text-slate-400 uppercase tracking-wider">Specialty</label>
                    <select
                      value={aptSpecialty}
                      onChange={(e) => handleAptDeptChange(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-xs font-semibold outline-none"
                    >
                      <option value="General Medicine">General Medicine</option>
                      <option value="Cardiology">Cardiology</option>
                      <option value="Orthopedics">Orthopedics</option>
                      <option value="Pediatrics">Pediatrics</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xxs font-bold text-slate-400 uppercase tracking-wider">Target Doctor</label>
                    <input
                      type="text"
                      readOnly
                      value={aptDoctor}
                      className="w-full bg-slate-100 border border-slate-200 text-slate-500 rounded-xl px-2.5 py-2 text-xs font-semibold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="block text-xxs font-bold text-slate-400 uppercase tracking-wider">Date</label>
                    <input
                      type="date"
                      value={aptDate}
                      onChange={(e) => setAptDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xxs font-bold text-slate-400 uppercase tracking-wider">Time Slot</label>
                    <select
                      value={aptTime}
                      onChange={(e) => setAptTime(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-xs font-semibold"
                    >
                      <option>09:30 AM</option>
                      <option>10:15 AM</option>
                      <option>11:00 AM</option>
                      <option>12:00 PM</option>
                      <option>02:30 PM</option>
                      <option>03:45 PM</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-xxs font-bold text-slate-400 uppercase tracking-wider">Patient Gender</label>
                  <select
                    value={aptGender}
                    onChange={(e) => setAptGender(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-xs font-semibold"
                  >
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={booking}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs py-3 rounded-xl transition cursor-pointer shadow-xs"
                >
                  {booking ? "Booking Slot..." : "Allocate Appointment Slot"}
                </button>
              </form>
            )}
          </div>

          {/* COMPACT APPOINTMENT GRID ROSTER */}
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wide"> Roster Schedule ({appointments.length})</span>
              <span className="text-xxs font-bold text-purple-600 font-mono">Real-time Predictions</span>
            </div>

            <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
              {appointments.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xxs">No active bookings listed.</div>
              ) : (
                appointments.map((apt) => (
                  <div key={apt.id} className="p-3 bg-slate-50/50 border rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-slate-50 transition">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <strong className="text-slate-900 font-semibold">{apt.patientName}</strong>
                        <span className={`px-1.5 py-0.2 text-[8px] font-black rounded ${
                          apt.status === "CHECKED_IN" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : apt.status === "CANCELLED" ? "bg-red-50 text-red-600 border border-red-100" : "bg-purple-100 text-purple-700 border border-purple-200"
                        }`}>
                          {apt.status === "CHECKED_IN" ? "Checked-In" : apt.status === "CANCELLED" ? "Cancelled" : "Scheduled"}
                        </span>
                      </div>
                      <p className="text-xxs text-slate-500">
                        Slot: <strong className="text-slate-700 font-mono">{apt.timeSlot}</strong> | Doctor: <strong className="text-slate-700">{apt.doctorName.split(" ")[1]} ({apt.specialty.split(" ")[0]})</strong>
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        UHID: {apt.uhid} | Attendance Likelihood:{" "}
                        <span className={`font-bold ${apt.noShowProbability > 60 ? "text-red-500" : apt.noShowProbability > 30 ? "text-amber-500" : "text-emerald-500"}`}>
                          {100 - apt.noShowProbability}%
                        </span>
                      </p>
                    </div>

                    {apt.status === "SCHEDULED" && (
                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                        <button
                          onClick={() => onCheckInAppointment(apt.id)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] px-2.5 py-1.5 rounded-lg transition active:scale-95 cursor-pointer shadow-xs flex items-center space-x-1"
                        >
                          <UserCheck className="h-3 w-3" />
                          <span>Check In</span>
                        </button>
                        <button
                          onClick={() => onCancelAppointment(apt.id)}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-[10px] px-2.5 py-1.5 rounded-lg border transition cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: REAL-TIME CLINIC STATUS & OPERATIONS BOARD (55% size -> lg:col-span-7) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white border border-slate-100 rounded-3xl p-5.5 shadow-sm space-y-4">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Clinic Status & Patient Operations</h3>
                <p className="text-xxs text-slate-500 font-medium">Re-route doctors, override active stages, and trigger cabin consultations</p>
              </div>
              
              {/* COMPACT STAGE TABS */}
              <div className="flex bg-slate-50 border p-0.5 rounded-lg text-[10px] font-bold overflow-x-auto shrink-0 max-w-full">
                {[
                  { id: "active", label: "Active" },
                  { id: "waiting", label: "Waiting" },
                  { id: "consulting", label: "In Cabin" },
                  { id: "labs", label: "Labs" },
                  { id: "pharmacy", label: "Rx Row" },
                  { id: "billing", label: "Billing" }
                ].map((tb) => (
                  <button
                    key={tb.id}
                    onClick={() => setQueueFilter(tb.id as any)}
                    className={`px-2.5 py-1.5 rounded-md transition whitespace-nowrap cursor-pointer ${
                      queueFilter === tb.id ? "bg-white text-slate-800 border-slate-200 shadow-3xs" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {tb.label}
                  </button>
                ))}
              </div>
            </div>

            {/* OPERATIONS ROSTER LIST */}
            <div className="space-y-3.5 max-h-[710px] overflow-y-auto pr-1">
              {filteredPatients.length === 0 ? (
                <div className="text-center py-20 bg-slate-50/50 border border-dashed rounded-2xl text-slate-400 space-y-2">
                  <Activity className="h-8 w-8 text-slate-300 mx-auto animate-pulse" />
                  <p className="text-xs font-semibold">No patients matched this stage filter.</p>
                  <p className="text-xxs">Verify registrations or register a walking token using the left form.</p>
                </div>
              ) : (
                filteredPatients.map((p, idx) => {
                  return (
                    <div 
                      key={p._id} 
                      className={`p-4 rounded-2xl border transition relative flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                        p.priority === "EMERGENCY" 
                          ? "border-red-150 bg-red-50/10 hover:bg-red-50/20" 
                          : p.priority === "VIP" 
                            ? "border-amber-150 bg-amber-50/10 hover:bg-amber-50/20" 
                            : "border-slate-100 bg-white hover:bg-slate-50/50"
                      }`}
                    >
                      {/* Left Block: Token & Info */}
                      <div className="flex items-start space-x-3.5">
                        <div className="text-center shrink-0">
                          <span className={`h-11 w-11 flex items-center justify-center rounded-xl font-mono text-xs font-black tracking-widest leading-none ${
                            p.priority === "EMERGENCY" 
                              ? "bg-red-600 text-white animate-pulse" 
                              : p.priority === "VIP" 
                                ? "bg-amber-500 text-slate-900" 
                                : "bg-slate-900 text-white"
                          }`}>
                            {p.token}
                          </span>
                          <span className="text-[8px] font-bold text-slate-400 uppercase mt-1 block">TK</span>
                        </div>

                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="font-extrabold text-slate-800 text-sm truncate">{p.name}</span>
                            
                            {/* PRIORITY CYCLER BADGE */}
                            <button
                              onClick={() => cyclePriority(p._id, p.priority)}
                              title="Click to toggle priority level"
                              className={`px-2 py-0.5 text-[8px] font-black rounded cursor-pointer transition active:scale-90 ${
                                p.priority === "EMERGENCY" 
                                  ? "bg-red-100 text-red-600 border border-red-200" 
                                  : p.priority === "VIP" 
                                    ? "bg-amber-100 text-amber-700 border border-amber-200" 
                                    : "bg-slate-100 text-slate-600 border border-slate-200"
                              }`}
                            >
                              {p.priority}
                            </button>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xxs text-slate-400 font-medium">
                            <span className="font-mono">UHID: {p.uhid || "FC-92019"}</span>
                            <span>•</span>
                            <span className="flex items-center"><Phone className="h-2.5 w-2.5 mr-0.5" /> {p.phone}</span>
                            <span>•</span>
                            <span className="bg-slate-100 text-slate-600 px-1 py-0.2 rounded text-[9px] capitalize">{p.gender}</span>
                          </div>

                          <div className="text-[10px] text-slate-400 max-w-[280px] truncate">
                            <strong>Allergies:</strong> {p.medicalHistory ? (Array.isArray(p.medicalHistory) ? p.medicalHistory.join(", ") : p.medicalHistory) : "None specified"}
                          </div>
                        </div>
                      </div>

                      {/* Right Block: Interactive Direct Updation Fields */}
                      <div className="flex flex-wrap items-center gap-3 shrink-0 self-end md:self-center">
                        
                        {/* 1. CLINICIAN RE-ASSIGNMENT DROPDOWN */}
                        <div className="flex flex-col">
                          <span className="text-[8px] text-slate-400 uppercase font-black font-mono tracking-wider mb-0.5">Assigned Clinician</span>
                          <select
                            value={p.assignedDoctor || "Dr. Vikram Rathore"}
                            onChange={(e) => onUpdatePatient(p._id, { assignedDoctor: e.target.value })}
                            className="bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-2 py-1 text-xxs font-bold text-slate-700 outline-none transition cursor-pointer"
                          >
                            <option value="Dr. Vikram Rathore">Dr. Rathore (Med)</option>
                            <option value="Dr. Ananya Sen">Dr. Sen (Cardio)</option>
                            <option value="Dr. Siddhartha Das">Dr. Das (Ortho)</option>
                            <option value="Dr. Preeti Patel">Dr. Patel (Ped)</option>
                          </select>
                        </div>

                        {/* 2. OVERRIDE ACTIVE STAGE DROPDOWN (UPDATING LOGIC) */}
                        <div className="flex flex-col">
                          <span className="text-[8px] text-slate-400 uppercase font-black font-mono tracking-wider mb-0.5">Clinical Journey Stage</span>
                          <select
                            value={p.status}
                            onChange={(e) => onUpdatePatient(p._id, { status: e.target.value })}
                            className={`border rounded-lg px-2 py-1 text-xxs font-extrabold outline-none transition cursor-pointer ${
                              p.status === "waiting" 
                                ? "bg-teal-50 text-teal-700 border-teal-200" 
                                : p.status === "serving" 
                                  ? "bg-blue-50 text-blue-700 border-blue-200" 
                                  : p.status === "pharmacy" 
                                    ? "bg-amber-50 text-amber-700 border-amber-200"
                                    : p.status === "billing" 
                                      ? "bg-rose-50 text-rose-700 border-rose-200" 
                                      : "bg-slate-100 text-slate-600 border-slate-200"
                            }`}
                          >
                            <option value="waiting">Waiting Desk</option>
                            <option value="serving">Doctor Consultation</option>
                            <option value="lab_pending">Lab Tests Pending</option>
                            <option value="lab_processing">Lab Sample Running</option>
                            <option value="pharmacy">Pharmacy Dispense</option>
                            <option value="billing">Invoicing & Billing</option>
                          </select>
                        </div>

                        {/* 3. CONTEXTUAL IN-LINE ACTION BUTTON ("DONT KEEP SEPARATE BUTTON FOR CALL NEXT") */}
                        {p.status === "waiting" && (
                          <button
                            onClick={() => onCallNext(p.assignedDoctor)}
                            className="bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xxs px-3 py-2 rounded-xl transition active:scale-95 flex items-center space-x-1 cursor-pointer tracking-wider shadow-xs mt-3.5"
                            title="Induct patient into doctor's room instantly"
                          >
                            <Play className="h-3 w-3 fill-white" />
                            <span>Call Room</span>
                          </button>
                        )}
                        
                        {p.status === "serving" && (
                          <span className="text-[10px] text-blue-600 bg-blue-50 border border-blue-100 px-2 py-1.5 rounded-lg font-extrabold flex items-center mt-3.5">
                            <Radio className="h-3 w-3 mr-1 animate-pulse" /> Consulting
                          </span>
                        )}
                        
                        {(p.status === "lab_pending" || p.status === "lab_processing") && (
                          <span className="text-[10px] text-purple-600 bg-purple-50 border border-purple-100 px-2 py-1.5 rounded-lg font-extrabold flex items-center mt-3.5">
                            <Activity className="h-3 w-3 mr-1 animate-spin" /> In Lab
                          </span>
                        )}

                        {p.status === "pharmacy" && (
                          <span className="text-[10px] text-amber-600 bg-amber-50 border border-amber-100 px-2 py-1.5 rounded-lg font-extrabold flex items-center mt-3.5">
                            <Sparkles className="h-3 w-3 mr-1 animate-bounce" /> Rx Ready
                          </span>
                        )}

                        {p.status === "billing" && (
                          <span className="text-[10px] text-rose-600 bg-rose-50 border border-rose-100 px-2 py-1.5 rounded-lg font-extrabold flex items-center mt-3.5 animate-pulse">
                            <ArrowUpRight className="h-3 w-3 mr-1" /> Settle bill
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
