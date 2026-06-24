// Mô hình dữ liệu chức năng — tương ứng mục 8 của đặc tả.

export type LeadStatus =
  | "new" // mới
  | "discovering" // đang xác định nhu cầu
  | "qualified" // đã đánh giá - đạt
  | "rejected" // đã đánh giá - không đạt
  | "booked" // đã đặt lịch hẹn
  | "pending_human" // chờ con người
  | "closed"; // đã đóng

export type ProjectType = "buy" | "rent"; // mua / thuê
export type FinancingStatus = "cash" | "will_loan" | "loan_approved" | "unknown";
export type Conclusion = "pass" | "fail" | "incomplete";
export type Priority = "high" | "medium" | "low";

export interface Property {
  id: string;
  title: string;
  type: string; // appartement, maison, studio, villa...
  price: number; // EUR
  area: string; // quartier / ville
  rooms: number;
  surface: number; // m2
  description: string;
}

// Tiêu chí riêng của một lead (nhu cầu khách)
export interface LeadCriteria {
  projectType?: ProjectType;
  propertyType?: string;
  minBudget?: number;
  maxBudget?: number;
  area?: string;
  rooms?: number;
  timelineMonths?: number;
  financing?: FinancingStatus;
  notes?: string;
}

// Bộ tiêu chí đủ điều kiện do môi giới đặt (EF2) — nguồn duy nhất để đánh giá
export interface QualificationCriteria {
  id: string;
  naturalText: string; // mô tả tự nhiên môi giới nhập
  minBudget?: number;
  financingRequired?: FinancingStatus[]; // các trạng thái tài chính chấp nhận
  areas?: string[];
  propertyTypes?: string[];
  maxTimelineMonths?: number;
  active: boolean;
  updatedAt: number;
}

export interface Evaluation {
  conclusion: Conclusion;
  seriousness: number; // 0-100
  priority: Priority;
  reasons: string[]; // lý do đạt/không đạt + tín hiệu nghiêm túc
  missing: string[]; // thông tin còn thiếu (nếu incomplete)
  at: number;
}

export type Sender = "client" | "ai" | "broker";
export interface Message {
  id: string;
  sender: Sender;
  text: string;
  at: number;
}

export interface Slot {
  id: string;
  start: number; // epoch ms
  end: number;
  booked: boolean;
}

export interface Appointment {
  id: string;
  leadId: string;
  slotId: string;
  propertyId?: string;
  status: "confirmed" | "cancelled";
  at: number;
}

export type ReportType =
  | "booked"
  | "rejected"
  | "escalation"
  | "shortlist"
  | "query";
export interface Report {
  id: string;
  type: ReportType;
  leadId?: string;
  content: string;
  at: number;
}

export interface Escalation {
  id: string;
  leadId: string;
  reason: string;
  draftReply: string;
  status: "pending" | "sent";
  at: number;
}

export interface Lead {
  id: string;
  name?: string;
  phone?: string;
  source: string; // form, email, seloger, web...
  propertyId?: string; // BĐS quan tâm
  status: LeadStatus;
  criteria: LeadCriteria;
  evaluation?: Evaluation;
  messages: Message[];
  createdAt: number;
}

export interface InboundRequest {
  name?: string;
  phone?: string;
  source?: string;
  propertyId?: string;
  message: string;
}
