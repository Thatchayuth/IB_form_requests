import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

/* PrimeNG */
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { FileUploadModule } from 'primeng/fileupload';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

import { FormRequestService } from '../../../core/services/form-request.service';
import { AttachmentService } from '../../../core/services/attachment.service';
import { FormRequest, Priority, RequestType } from '../../../core/models';

/**
 * FormRequestFormComponent — ฟอร์มสร้าง/แก้ไขคำร้อง
 * ใช้ร่วมทั้งโหมด Create + Edit
 */
@Component({
  selector: 'app-form-request-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    CardModule,
    ButtonModule,
    InputTextModule,
    TextareaModule,
    SelectModule,
    DatePickerModule,
    FileUploadModule,
    ToastModule,
  ],
  providers: [MessageService],
  templateUrl: './form-request-form.html',
  styleUrl: './form-request-form.scss',
})
export class FormRequestFormComponent implements OnInit {
  /** โหมด: create หรือ edit */
  isEditMode = false;
  formRequestId?: number;
  loading = false;
  saving = false;

  /** ข้อมูลฟอร์ม */
  formData = {
    title: '',
    description: '',
    requestType: RequestType.GENERAL,
    priority: Priority.MEDIUM,
    dueDate: null as Date | null,
  };

  /** ไฟล์ที่เลือก */
  selectedFiles: File[] = [];

  /** Dropdown options */
  typeOptions = [
    { label: 'ทั่วไป', value: RequestType.GENERAL },
    { label: 'ขอซื้อ', value: RequestType.PURCHASE },
    { label: 'เปิด Vendor ใหม่', value: RequestType.VENDOR_REGISTRATION },
    { label: 'แจ้งซ่อม', value: RequestType.REPAIR },
    { label: 'IT Support', value: RequestType.IT_SUPPORT },
    { label: 'ขอเอกสาร', value: RequestType.DOCUMENT },
    { label: 'อื่น ๆ', value: RequestType.OTHER },
  ];

  priorityOptions = [
    { label: 'ต่ำ', value: Priority.LOW },
    { label: 'ปานกลาง', value: Priority.MEDIUM },
    { label: 'สูง', value: Priority.HIGH },
    { label: 'เร่งด่วน', value: Priority.URGENT },
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private formRequestService: FormRequestService,
    private attachmentService: AttachmentService,
    private messageService: MessageService,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.formRequestId = Number(id);
      this.loadFormRequest();
    }
  }

  /** โหลดข้อมูลคำร้องสำหรับ Edit */
  loadFormRequest(): void {
    if (!this.formRequestId) return;
    this.loading = true;

    this.formRequestService.findOne(this.formRequestId).subscribe({
      next: (res) => {
        const fr = res.data;
        this.formData = {
          title: fr.title,
          description: fr.description,
          requestType: fr.requestType,
          priority: fr.priority,
          dueDate: fr.dueDate ? new Date(fr.dueDate) : null,
        };
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

  /** เลือกไฟล์ */
  onFileSelect(event: any): void {
    this.selectedFiles = event.files || [];
  }

  /** บันทึกคำร้อง */
  save(): void {
    if (!this.formData.title || !this.formData.description) {
      this.messageService.add({
        severity: 'warn',
        summary: 'คำเตือน',
        detail: 'กรุณากรอกหัวข้อและรายละเอียด',
      });
      return;
    }

    this.saving = true;

    const payload: any = {
      title: this.formData.title,
      description: this.formData.description,
      requestType: this.formData.requestType,
      priority: this.formData.priority,
      dueDate: this.formData.dueDate?.toISOString() || null,
    };

    const request$ = this.isEditMode
      ? this.formRequestService.update(this.formRequestId!, payload)
      : this.formRequestService.create(payload);

    request$.subscribe({
      next: (res) => {
        const savedId = res.data.id;

        // อัปโหลดไฟล์แนบ (ถ้ามี)
        if (this.selectedFiles.length > 0) {
          this.attachmentService.upload(savedId, this.selectedFiles).subscribe({
            next: () => {
              this.saving = false;
              this.messageService.add({
                severity: 'success',
                summary: 'สำเร็จ',
                detail: this.isEditMode ? 'แก้ไขคำร้องเรียบร้อย' : 'สร้างคำร้องเรียบร้อย',
              });
              this.router.navigate(['/form-requests', savedId]);
            },
            error: () => {
              this.saving = false;
              this.messageService.add({
                severity: 'warn',
                summary: 'คำเตือน',
                detail: 'บันทึกคำร้องสำเร็จ แต่อัปโหลดไฟล์ล้มเหลว',
              });
              this.router.navigate(['/form-requests', savedId]);
            },
          });
        } else {
          this.saving = false;
          this.messageService.add({
            severity: 'success',
            summary: 'สำเร็จ',
            detail: this.isEditMode ? 'แก้ไขคำร้องเรียบร้อย' : 'สร้างคำร้องเรียบร้อย',
          });
          this.router.navigate(['/form-requests', savedId]);
        }
      },
      error: (err) => {
        this.saving = false;
        this.messageService.add({
          severity: 'error',
          summary: 'ข้อผิดพลาด',
          detail: err?.error?.message || 'ไม่สามารถบันทึกคำร้องได้',
        });
      },
    });
  }
}
