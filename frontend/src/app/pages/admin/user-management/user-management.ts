import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

/* PrimeNG */
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { CardModule } from 'primeng/card';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';

import { UserService } from '../../../core/services/user.service';
import { User, UserStats, PaginatedResult, UserRole } from '../../../core/models';

/**
 * UserManagementComponent — จัดการผู้ใช้ (Admin Only)
 * แสดงรายการผู้ใช้ + เปลี่ยน Role + เปิด/ปิดสถานะ
 */
@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    TagModule,
    TooltipModule,
    CardModule,
    SelectModule,
    ToastModule,
    ConfirmDialogModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './user-management.html',
  styleUrl: './user-management.scss',
})
export class UserManagementComponent implements OnInit {
  users: User[] = [];
  totalRecords = 0;
  loading = true;
  stats: UserStats | null = null;

  /** Pagination */
  page = 1;
  limit = 10;
  search = '';

  /** Role options */
  roleOptions = [
    { label: 'ผู้ใช้งาน', value: UserRole.USER },
    { label: 'ผู้ดูแลระบบ', value: UserRole.ADMIN },
  ];

  constructor(
    private userService: UserService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
  ) {}

  ngOnInit(): void {
    this.loadUsers();
    this.loadStats();
  }

  /** โหลดรายการผู้ใช้ */
  loadUsers(): void {
    this.loading = true;
    this.userService.findAll({ page: this.page, limit: this.limit, search: this.search }).subscribe({
      next: (res) => {
        this.users = res.data.data;
        this.totalRecords = res.data.total;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  /** โหลดสถิติ */
  loadStats(): void {
    this.userService.getStats().subscribe({
      next: (res) => {
        this.stats = res.data;
      },
    });
  }

  /** ค้นหา */
  onSearch(): void {
    this.page = 1;
    this.loadUsers();
  }

  /** เปลี่ยนหน้า */
  onPageChange(event: any): void {
    this.page = Math.floor(event.first / event.rows) + 1;
    this.limit = event.rows;
    this.loadUsers();
  }

  /** เปลี่ยนบทบาท */
  changeRole(user: User, newRole: UserRole): void {
    this.userService.update(user.id, { role: newRole } as any).subscribe({
      next: () => {
        user.role = newRole;
        this.messageService.add({
          severity: 'success',
          summary: 'สำเร็จ',
          detail: `เปลี่ยนบทบาท ${user.fullName} เป็น ${newRole === 'admin' ? 'ผู้ดูแลระบบ' : 'ผู้ใช้งาน'}`,
        });
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'ข้อผิดพลาด',
          detail: 'ไม่สามารถเปลี่ยนบทบาทได้',
        });
      },
    });
  }

  /** เปิด/ปิดสถานะผู้ใช้ */
  toggleActive(user: User): void {
    const action = user.isActive ? 'ปิดการใช้งาน' : 'เปิดการใช้งาน';
    this.confirmationService.confirm({
      message: `ต้องการ${action} ${user.fullName} ใช่หรือไม่?`,
      header: 'ยืนยัน',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.userService.toggleActive(user.id).subscribe({
          next: (res) => {
            user.isActive = res.data.isActive;
            this.messageService.add({
              severity: 'success',
              summary: 'สำเร็จ',
              detail: `${action} ${user.fullName} เรียบร้อย`,
            });
          },
          error: () => {
            this.messageService.add({
              severity: 'error',
              summary: 'ข้อผิดพลาด',
              detail: `ไม่สามารถ${action}ได้`,
            });
          },
        });
      },
    });
  }
}
