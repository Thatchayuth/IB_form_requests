/**
 * Enum รวมทั้งหมดของระบบจัดการคำร้อง
 * ใช้ร่วมกันทุก module (Entity, DTO, Service, Controller)
 */

// =============================================
// บทบาทผู้ใช้
// =============================================
export enum UserRole {
  USER = 'User',     // ผู้ใช้ทั่วไป - สร้างคำร้อง
  ADMIN = 'Admin',   // ผู้ดูแลระบบ - อนุมัติ/ปฏิเสธ + จัดการผู้ใช้
}

// =============================================
// สถานะคำร้อง
// =============================================
export enum FormRequestStatus {
  DRAFT = 'Draft',               // แบบร่าง - ยังไม่ส่ง
  SUBMITTED = 'Submitted',       // ส่งแล้ว - รอตรวจสอบ
  UNDER_REVIEW = 'UnderReview',  // กำลังตรวจสอบ
  APPROVED = 'Approved',         // อนุมัติแล้ว
  REJECTED = 'Rejected',         // ปฏิเสธ
  COMPLETED = 'Completed',       // เสร็จสิ้น
  CANCELLED = 'Cancelled',       // ยกเลิก
}

// =============================================
// ลำดับความสำคัญ
// =============================================
export enum Priority {
  LOW = 'Low',         // ต่ำ
  MEDIUM = 'Medium',   // ปานกลาง
  HIGH = 'High',       // สูง
  URGENT = 'Urgent',   // เร่งด่วน
}

// =============================================
// ประเภทคำร้อง (Back Office)
// =============================================
export enum RequestType {
  PURCHASE = 'Purchase',               // ขอซื้อ
  VENDOR_REGISTRATION = 'VendorReg',   // เปิด Vendor ใหม่
  REPAIR = 'Repair',                   // แจ้งซ่อม
  IT_SUPPORT = 'ITSupport',            // ขอ IT Support
  DOCUMENT = 'Document',               // ขอเอกสาร
  GENERAL = 'General',                 // ทั่วไป
  OTHER = 'Other',                     // อื่นๆ
}

// =============================================
// ประเภทแจ้งเตือน
// =============================================
export enum NotificationType {
  STATUS_CHANGE = 'StatusChange',   // คำร้องเปลี่ยนสถานะ
  ASSIGNMENT = 'Assignment',        // ได้รับมอบหมายงาน
  APPROVAL = 'Approval',           // คำร้องได้รับการอนุมัติ
  REJECTION = 'Rejection',         // คำร้องถูกปฏิเสธ
  REMINDER = 'Reminder',           // แจ้งเตือนทั่วไป
  SYSTEM = 'System',               // แจ้งเตือนจากระบบ
}
