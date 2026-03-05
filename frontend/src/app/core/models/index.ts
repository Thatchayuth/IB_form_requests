/**
 * Enum & Interface รวมสำหรับระบบจัดการคำร้อง
 * ── สอดคล้องกับ Backend Entities ทุกค่า (PascalCase) ──
 */

// ─── Enums (ค่าต้องตรงกับ Backend) ─────────────────────

/** บทบาทผู้ใช้ */
export enum UserRole {
  USER = 'User',
  ADMIN = 'Admin',
}

/** สถานะคำร้อง */
export enum FormRequestStatus {
  DRAFT = 'Draft',
  SUBMITTED = 'Submitted',
  UNDER_REVIEW = 'UnderReview',
  APPROVED = 'Approved',
  REJECTED = 'Rejected',
  COMPLETED = 'Completed',
  CANCELLED = 'Cancelled',
}

/** ระดับความสำคัญ */
export enum Priority {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High',
  URGENT = 'Urgent',
}

/** ประเภทคำร้อง (ตรงกับ Backend RequestType) */
export enum RequestType {
  PURCHASE = 'Purchase',
  VENDOR_REGISTRATION = 'VendorReg',
  REPAIR = 'Repair',
  IT_SUPPORT = 'ITSupport',
  DOCUMENT = 'Document',
  GENERAL = 'General',
  OTHER = 'Other',
}

/** ประเภทการแจ้งเตือน */
export enum NotificationType {
  STATUS_CHANGE = 'StatusChange',
  ASSIGNMENT = 'Assignment',
  APPROVAL = 'Approval',
  REJECTION = 'Rejection',
  REMINDER = 'Reminder',
  SYSTEM = 'System',
}

// ─── Interfaces ────────────────────────────────────────

/** ผู้ใช้งาน */
export interface User {
  id: number;
  username: string;
  employeeId?: string;
  fullName: string;
  email?: string;
  role: UserRole;
  department?: string;
  isActive: boolean;
  createdAt: string;   // ISO date string
  updatedAt: string;
}

/** คำร้อง */
export interface FormRequest {
  id: number;
  requestNumber: string;       // FR-YYYY-NNNN
  title: string;
  description: string;
  requestType: RequestType;
  priority: Priority;
  status: FormRequestStatus;
  requesterId: number;
  requester?: User;
  approvedById?: number;
  approvedBy?: User;
  approvedAt?: string;
  dueDate?: string;
  remarks?: string;
  attachments?: Attachment[];
  createdAt: string;
  updatedAt: string;
}

/** ไฟล์แนบ */
export interface Attachment {
  id: number;
  formRequestId: number;
  fileName: string;
  storedFileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  uploadedById: number;
  uploadedBy?: User;
  createdAt: string;
}

/** การแจ้งเตือน */
export interface Notification {
  id: number;
  userId: number;
  formRequestId?: number;
  formRequest?: FormRequest;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

// ─── Auth ──────────────────────────────────────────────

/** ข้อมูลสำหรับ Login (AD) */
export interface LoginRequest {
  username: string;
  password: string;
}

/** ผลลัพธ์จาก Login (ตรงกับ Backend auth.service.ts) */
export interface LoginResponse {
  access_token: string;   // snake_case ตาม Backend
  user: User;
}

// ─── Pagination ────────────────────────────────────────

/** ผลลัพธ์แบบแบ่งหน้า (ตรงกับ Backend PaginatedResult) */
export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

// ─── API Response ──────────────────────────────────────

/** Wrapper response จาก Backend (TransformInterceptor) */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

// ─── Stats ─────────────────────────────────────────────

/** สถิติคำร้อง */
export interface FormRequestStats {
  total: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  byType: Record<string, number>;
}

/** สถิติผู้ใช้ */
export interface UserStats {
  total: number;
  active: number;
  inactive: number;
  byRole: Record<string, number>;
}
