import mongoose, { Schema, Document } from "mongoose";

export interface IPatient extends Document {
  token: string;
  name: string;
  status: string; // "waiting" | "serving" | "lab_pending" | "lab_completed" | "pharmacy" | "billing" | "completed"
  createdAt: Date;
  uhid: string;
  gender: string;
  dob: string;
  phone: string;
  email: string;
  priority: string; // "STANDARD" | "VIP" | "EMERGENCY"
  assignedDoctor: string;
  department: string;
  consultNotes?: string;
  soapNotes?: {
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
  };
  prescriptions?: {
    drugName: string;
    dosage: string;
    frequency: string;
    duration: string;
    qty?: number;
    status?: string; // "PENDING" | "DISPENSED"
  }[];
  labOrders?: {
    testName: string;
    status: string; // "PENDING" | "COLLECTED" | "PROCESSING" | "RESULT_READY"
    resultDetails?: string;
    updatedAt: Date;
  }[];
  billingInvoice?: {
    subtotal: number;
    taxAmount: number;
    discount: number;
    totalAmount: number;
    status: string; // "UNPAID" | "PAID"
    paymentMethod?: string;
    insuranceApprovedAmount?: number;
    items?: {
      description: string;
      quantity: number;
      unitPrice: number;
      amount: number;
    }[];
  };
  appointmentId?: string;
}

const PatientSchema: Schema = new Schema({
  token: { type: String, required: true },
  name: { type: String, required: true },
  status: { 
    type: String, 
    default: "waiting",
    required: true 
  },
  createdAt: { type: Date, default: Date.now, required: true },
  uhid: { type: String, required: true },
  gender: { type: String, default: "Male" },
  dob: { type: String, default: "1994-06-15" },
  phone: { type: String, default: "+91 98765 43210" },
  email: { type: String, default: "patient@flowcare.ai" },
  priority: { type: String, default: "STANDARD" },
  assignedDoctor: { type: String, default: "Dr. Vikram Rathore" },
  department: { type: String, default: "General Medicine" },
  consultNotes: { type: String, default: "" },
  soapNotes: {
    subjective: { type: String, default: "" },
    objective: { type: String, default: "" },
    assessment: { type: String, default: "" },
    plan: { type: String, default: "" }
  },
  prescriptions: [{
    drugName: { type: String },
    dosage: { type: String },
    frequency: { type: String },
    duration: { type: String },
    qty: { type: Number, default: 1 },
    status: { type: String, default: "PENDING" }
  }],
  labOrders: [{
    testName: { type: String },
    status: { type: String, default: "PENDING" },
    resultDetails: { type: String, default: "" },
    updatedAt: { type: Date, default: Date.now }
  }],
  billingInvoice: {
    subtotal: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },
    status: { type: String, default: "UNPAID" },
    paymentMethod: { type: String, default: "" },
    insuranceApprovedAmount: { type: Number, default: 0 },
    items: [{
      description: { type: String },
      quantity: { type: Number, default: 1 },
      unitPrice: { type: Number, default: 0 },
      amount: { type: Number, default: 0 }
    }]
  },
  appointmentId: { type: String, default: "" }
}, { timestamps: true });

export const PatientModel = mongoose.models.Patient || mongoose.model<IPatient>("Patient", PatientSchema);
