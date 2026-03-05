/**
 * Enum & Interface รวมสำหรับระบบจัดการคำร้อง
 * สอดคล้องกับ Backend Entities ทั้งหมด
 */

// ─── Enums ─────────────────────────────────────────────

/** บทบาทผู้ใช้ */
export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

/** สถานะคำร้อง */
export enum FormRequestStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  UNDER_REVIEW = 'under_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

/** ระดับความสำคัญ */
export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

/** ประเภทคำร้อง */
export enum RequestType {
  GENERAL = 'general',
  IT_SUPPORT = 'it_support',
  PROCUREMENT = 'procurement',
  HR = 'hr',
  FINANCE = 'finance',
  MAINTENANCE = 'maintenance',
  OTHER = 'other',
}

/** ประเภทการแจ้งเตือน */
export enum NotificationType {
  STATUS_CHANGE = 'status_change',
  NEW_REQUEST = 'new_request',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  COMMENT = 'comment',
  SYSTEM = 'system',
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

/** ผลลัพธ์จาก Login */
export interface LoginResponse {
  accessToken: string;
  user: User;
}

// ─── Pagination ────────────────────────────────────────

/** ผลลัพธ์แบบแบ่งหน้า */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─── API Response ──────────────────────────────────────

/** Wrapper response จาก Backend (TransformInterceptor) */
export interface ApiResponse<T> {
  statusCode: number;
  message: string;
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
