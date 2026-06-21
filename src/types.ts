/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum UserRole {
  SUPER_ADMIN = "SUPER_ADMIN",
  HOSPITAL_ADMIN = "HOSPITAL_ADMIN",
  DOCTOR = "DOCTOR",
  RECEPTIONIST = "RECEPTIONIST",
  NURSE = "NURSE",
  PHARMACIST = "PHARMACIST",
  LAB_TECHNICIAN = "LAB_TECHNICIAN",
  PATIENT = "PATIENT"
}

export enum QueueStatus {
  REGISTERED = "REGISTERED",         // Checked-in / Waiting at Reception
  QUEUED_CONSULT = "QUEUED_CONSULT",   // Waiting to see Doctor
  IN_CONSULT = "IN_CONSULT",          // Currently inside Doctor's Cabin
  QUEUED_LAB = "QUEUED_LAB",          // Diagnostic tests ordered, waiting
  IN_LAB = "IN_LAB",                  // Samples being collected/processed
  QUEUED_PHARMACY = "QUEUED_PHARMACY",// Transferred to pharmacy, waiting
  QUEUED_BILLING = "QUEUED_BILLING",  // Done with clinical flow, waiting for billing
  COMPLETED = "COMPLETED"             // Paid and discharged
}

export enum FlowPriority {
  STANDARD = "STANDARD",
  VIP = "VIP",
  EMERGENCY = "EMERGENCY"
}

export interface Patient {
  uhid: string; // Unique Health Identification Code (e.g., IN-FC-102934)
  firstName: string;
  lastName: string;
  gender: string;
  dob: string;
  phone: string;
  email: string;
  insuranceName?: string;
  insuranceId?: string;
  medicalHistory: string[];
  registeredAt: string;
}

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  roomNumber: string;
  avatarUrl: string;
  avgConsultTimeMins: number; // For AI Queue prediction
  activeStatus: "ACTIVE" | "ON_BREAK" | "INACTIVE";
}

export interface QueueItem {
  id: string;
  tokenNumber: string; // e.g. GEN-024, CAR-003
  patientUhid: string;
  patientName: string;
  patientPhone: string;
  assignedDoctorId?: string;
  assignedDoctorName?: string;
  specialty: string;
  status: QueueStatus;
  priority: FlowPriority;
  estimatedWaitMinutes: number; // Predicted by server/AI
  recommendedArrivalTime: string; // Predicted arrival recommendation
  checkInTime: string;
  completedTime?: string;
  consultNotes?: string;
  soapNotes?: {
    subjective?: string;
    objective?: string;
    assessment?: string;
    plan?: string;
  };
}

export interface Appointment {
  id: string;
  patientUhid: string;
  patientName: string;
  patientPhone: string;
  doctorId: string;
  doctorName: string;
  specialty: string;
  date: string;
  timeSlot: string; // e.g., "10:30 AM"
  status: "SCHEDULED" | "CHECKED_IN" | "NO_SHOW" | "CANCELLED";
  noShowProbability?: number; // AI predicted probability from 0 to 1
}

export interface LabOrder {
  id: string;
  tokenNumber: string;
  patientUhid: string;
  patientName: string;
  testName: string; // e.g. "Complete Blood Count", "Lipid Profile"
  orderedByDoctorId: string;
  orderedByDoctorName: string;
  status: "PENDING" | "COLLECTED" | "PROCESSING" | "RESULT_READY";
  resultDetails?: string;
  notes?: string;
  updatedAt: string;
}

export interface PrescriptionItem {
  drugName: string;
  dosage: string; // e.g. "500mg"
  frequency: string; // e.g. "1-0-1" or "Three times a day"
  duration: string; // e.g. "5 Days"
  instructions: string; // e.g. "Post Meals"
  qty: number;
}

export interface Prescription {
  id: string;
  tokenNumber: string;
  patientUhid: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  date: string;
  items: PrescriptionItem[];
  status: "PENDING" | "DISPENSED";
  dispensedAt?: string;
}

export interface BillingItem {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number; // percent, e.g. 18 representing 18% GST
  amount: number;
}

export interface Bill {
  id: string;
  tokenNumber: string;
  patientUhid: string;
  patientName: string;
  items: BillingItem[];
  subtotal: number;
  taxAmount: number; // GST
  discount: number;
  totalAmount: number;
  status: "UNPAID" | "PAID";
  paymentMethod?: "CASH" | "CARD" | "UPI" | "INSURANCE";
  insuranceApprovedAmount?: number;
  invoiceDate: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userEmail: string;
  role: string;
  action: string; // e.g., "Walk-In Registered", "Token Assigned", "Prescription Dispensed"
  details: string;
}

export interface LiveStats {
  totalRegisteredToday: number;
  avgWaitTimeMinutes: number;
  peakHourPercentage: number;
  activeDoctorsCount: number;
  emergencyCount: number;
  queueBreakdown: {
    reception: number;
    consultation: number;
    lab: number;
    pharmacy: number;
    billing: number;
  };
}

export interface AIInsights {
  bottleneckAlert: string;
  predictedCongestionHour: string;
  recommendedStaffingCount: number;
  explanation: string;
}
