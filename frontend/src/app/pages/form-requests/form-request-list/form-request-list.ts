import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

/* PrimeNG */
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { CardModule } from 'primeng/card';

import { FormRequestService } from '../../../core/services/form-request.service';
import { AuthService } from '../../../core/services/auth.service';
import {
  FormRequest,
  FormRequestStatus,
  Priority,
  RequestType,
  PaginatedResult,
} from '../../../core/models';

/**
 * FormRequestListComponent — รายการคำร้อง
 * แสดงตาราง + ค้นหา/กรอง + แบ่งหน้า
 */
@Component({
  selector: 'app-form-request-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    TableModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
    TagModule,
    TooltipModule,
    CardModule,
  ],
  templateUrl: './form-request-list.html',
  styleUrl: './form-request-list.scss',
})
export class FormRequestListComponent implements OnInit {
  formRequests: FormRequest[] = [];
  totalRecords = 0;
  loading = true;

  /** ค่าค้นหา / filter */
  search = '';
  selectedStatus = '';
  selectedPriority = '';

  /** Pagination */
  page = 1;
  limit = 10;

  /** Dropdown Options */
  statusOptions = [
    { label: 'ทั้งหมด', value: '' },
    { label: 'ร่าง', value: FormRequestStatus.DRAFT },
    { label: 'ส่งแล้ว', value: FormRequestStatus.SUBMITTED },
    { label: 'กำลังตรวจสอบ', value: FormRequestStatus.UNDER_REVIEW },
    { label: 'อนุมัติ', value: FormRequestStatus.APPROVED },
    { label: 'ปฏิเสธ', value: FormRequestStatus.REJECTED },
    { label: 'เสร็จสิ้น', value: FormRequestStatus.COMPLETED },
    { label: 'ยกเลิก', value: FormRequestStatus.CANCELLED },
  ];

  priorityOptions = [
    { label: 'ทั้งหมด', value: '' },
    { label: 'ต่ำ', value: Priority.LOW },
    { label: 'ปานกลาง', value: Priority.MEDIUM },
    { label: 'สูง', value: Priority.HIGH },
    { label: 'เร่งด่วน', value: Priority.URGENT },
  ];

  /** Status label/severity mapping */
  statusLabels: Record<string, string> = {
    draft: 'ร่าง',
    submitted: 'ส่งแล้ว',
    under_review: 'กำลังตรวจ',
    approved: 'อนุมัติ',
    rejected: 'ปฏิเสธ',
    completed: 'เสร็จสิ้น',
    cancelled: 'ยกเลิก',
  };

  priorityLabels: Record<string, string> = {
    low: 'ต่ำ',
    medium: 'ปานกลาง',
    high: 'สูง',
    urgent: 'เร่งด่วน',
  };

  constructor(
    private formRequestService: FormRequestService,
    public auth: AuthService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  /** โหลดรายการคำร้อง */
  loadData(): void {
    this.loading = true;
    const params: Record<string, any> = {
      page: this.page,
      limit: this.limit,
      search: this.search,
      status: this.selectedStatus,
      priority: this.selectedPriority,
    };

    this.formRequestService.findAll(params).subscribe({
      next: (res) => {
        this.formRequests = res.data.data;
        this.totalRecords = res.data.total;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  /** เปลี่ยนหน้า */
  onPageChange(event: any): void {
    this.page = Math.floor(event.first / event.rows) + 1;
    this.limit = event.rows;
    this.loadData();
  }

  /** ค้นหา */
  onSearch(): void {
    this.page = 1;
    this.loadData();
  }

  /** ดูรายละเอียดคำร้อง */
  viewDetail(id: number): void {
    this.router.navigate(['/form-requests', id]);
  }

  /** แก้ไขคำร้อง */
  editRequest(id: number): void {
    this.router.navigate(['/form-requests', id, 'edit']);
  }

  /** ดึง severity สำหรับ PrimeNG Tag */
  getStatusSeverity(status: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    const map: Record<string, 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast'> = {
      draft: 'secondary',
      submitted: 'info',
      under_review: 'warn',
      approved: 'success',
      rejected: 'danger',
      completed: 'info',
      cancelled: 'secondary',
    };
    return map[status] || 'info';
  }

  getPrioritySeverity(priority: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    const map: Record<string, 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast'> = {
      low: 'success',
      medium: 'warn',
      high: 'danger',
      urgent: 'danger',
    };
    return map[priority] || 'info';
  }
}
