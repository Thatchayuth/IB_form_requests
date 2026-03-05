import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

/* PrimeNG */
import { FormsModule } from '@angular/forms';

/* PrimeNG */
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DividerModule } from 'primeng/divider';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';

import { MessageService, ConfirmationService } from 'primeng/api';

import { FormRequestService } from '../../../core/services/form-request.service';
import { AttachmentService } from '../../../core/services/attachment.service';
import { AuthService } from '../../../core/services/auth.service';
import { FormRequest, Attachment, FormRequestStatus } from '../../../core/models';

/**
 * FormRequestDetailComponent — รายละเอียดคำร้อง
 * แสดงข้อมูลคำร้อง + ไฟล์แนบ + เปลี่ยนสถานะ (Admin)
 */
@Component({
  selector: 'app-form-request-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    CardModule,
    ButtonModule,
    TagModule,
    DividerModule,
    ConfirmDialogModule,
    ToastModule,
    TextareaModule,
    SelectModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './form-request-detail.html',
  styleUrl: './form-request-detail.scss',
})
export class FormRequestDetailComponent implements OnInit {
  formRequest: FormRequest | null = null;
  attachments: Attachment[] = [];
  loading = true;

  /** Admin: เปลี่ยนสถานะ */
  showStatusDialog = false;
  selectedNewStatus = '';
  statusRemarks = '';

  statusOptions = [
    { label: 'กำลังตรวจสอบ', value: FormRequestStatus.UNDER_REVIEW },
    { label: 'อนุมัติ', value: FormRequestStatus.APPROVED },
    { label: 'ปฏิเสธ', value: FormRequestStatus.REJECTED },
    { label: 'เสร็จสิ้น', value: FormRequestStatus.COMPLETED },
  ];

  /** Status Labels (Thai) */
  statusLabels: Record<string, string> = {
    Draft: 'ร่าง',
    Submitted: 'ส่งแล้ว',
    UnderReview: 'กำลังตรวจสอบ',
    Approved: 'อนุมัติ',
    Rejected: 'ปฏิเสธ',
    Completed: 'เสร็จสิ้น',
    Cancelled: 'ยกเลิก',
  };

  priorityLabels: Record<string, string> = {
    Low: 'ต่ำ',
    Medium: 'ปานกลาง',
    High: 'สูง',
    Urgent: 'เร่งด่วน',
  };

  typeLabels: Record<string, string> = {
    General: 'ทั่วไป',
    Purchase: 'ขอซื้อ',
    VendorReg: 'เปิด Vendor ใหม่',
    Repair: 'แจ้งซ่อม',
    ITSupport: 'IT Support',
    Document: 'ขอเอกสาร',
    Other: 'อื่น ๆ',
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private formRequestService: FormRequestService,
    private attachmentService: AttachmentService,
    public auth: AuthService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (id) {
      this.loadDetail(id);
      this.loadAttachments(id);
    }
  }

  /** โหลดรายละเอียดคำร้อง */
  loadDetail(id: number): void {
    this.formRequestService.findOne(id).subscribe({
      next: (res) => {
        this.formRequest = res.data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'ข้อผิดพลาด',
          detail: 'ไม่สามารถโหลดข้อมูลคำร้องได้',
        });
      },
    });
  }

  /** โหลดไฟล์แนบ */
  loadAttachments(id: number): void {
    this.attachmentService.findByFormRequest(id).subscribe({
      next: (res) => {
        this.attachments = res.data;
      },
    });
  }

  /** ส่งคำร้อง (Draft → Submitted) */
  submitRequest(): void {
    if (!this.formRequest) return;
    this.confirmationService.confirm({
      message: 'ต้องการส่งคำร้องนี้ใช่หรือไม่?',
      header: 'ยืนยันการส่ง',
      icon: 'pi pi-send',
      accept: () => {
        this.formRequestService.submit(this.formRequest!.id).subscribe({
          next: (res) => {
            this.formRequest = res.data;
            this.messageService.add({
              severity: 'success',
              summary: 'สำเร็จ',
              detail: 'ส่งคำร้องเรียบร้อย',
            });
          },
          error: () => {
            this.messageService.add({
              severity: 'error',
              summary: 'ข้อผิดพลาด',
              detail: 'ไม่สามารถส่งคำร้องได้',
            });
          },
        });
      },
    });
  }

  /** ยกเลิกคำร้อง */
  cancelRequest(): void {
    if (!this.formRequest) return;
    this.confirmationService.confirm({
      message: 'ต้องการยกเลิกคำร้องนี้ใช่หรือไม่?',
      header: 'ยืนยันการยกเลิก',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.formRequestService.cancel(this.formRequest!.id).subscribe({
          next: (res) => {
            this.formRequest = res.data;
            this.messageService.add({
              severity: 'success',
              summary: 'สำเร็จ',
              detail: 'ยกเลิกคำร้องเรียบร้อย',
            });
          },
        });
      },
    });
  }

  /** Admin: อัปเดตสถานะ */
  updateStatus(): void {
    if (!this.formRequest || !this.selectedNewStatus) return;

    this.formRequestService
      .updateStatus(this.formRequest.id, {
        status: this.selectedNewStatus,
        remarks: this.statusRemarks || undefined,
      })
      .subscribe({
        next: (res) => {
          this.formRequest = res.data;
          this.showStatusDialog = false;
          this.selectedNewStatus = '';
          this.statusRemarks = '';
          this.messageService.add({
            severity: 'success',
            summary: 'สำเร็จ',
            detail: 'อัปเดตสถานะเรียบร้อย',
          });
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'ข้อผิดพลาด',
            detail: 'ไม่สามารถอัปเดตสถานะได้',
          });
        },
      });
  }

  /** ดาวน์โหลดไฟล์แนบ */
  downloadAttachment(attachment: Attachment): void {
    this.attachmentService.downloadAndSave(attachment.id, attachment.fileName);
  }

  /** ดึง severity สำหรับ PrimeNG Tag */
  getStatusSeverity(status: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    const map: Record<string, 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast'> = {
      Draft: 'secondary',
      Submitted: 'info',
      UnderReview: 'warn',
      Approved: 'success',
      Rejected: 'danger',
      Completed: 'info',
      Cancelled: 'secondary',
    };
    return map[status] || 'info';
  }

  getPrioritySeverity(priority: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    const map: Record<string, 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast'> = {
      Low: 'success',
      Medium: 'warn',
      High: 'danger',
      Urgent: 'danger',
    };
    return map[priority] || 'info';
  }
}
