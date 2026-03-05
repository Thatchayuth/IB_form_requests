import { Component } from '@angular/core';
import { Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../core/services/auth.service';

/* PrimeNG */
import { ButtonModule } from 'primeng/button';
import { BadgeModule } from 'primeng/badge';
import { RippleModule } from 'primeng/ripple';
import { TooltipModule } from 'primeng/tooltip';
import { MenuModule } from 'primeng/menu';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

/**
 * LayoutComponent — โครงสร้างหลัก (Sidebar + Header + Content)
 * แสดงผลหลัง Login เท่านั้น
 */
@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    ButtonModule,
    BadgeModule,
    RippleModule,
    TooltipModule,
    MenuModule,
    ToastModule,
  ],
  providers: [MessageService],
  templateUrl: './layout.html',
  styleUrl: './layout.scss',
})
export class LayoutComponent {
  /** เปิด/ปิด Sidebar */
  sidebarCollapsed = false;

  constructor(
    public auth: AuthService,
    private router: Router,
    private messageService: MessageService,
  ) {}

  /** Toggle Sidebar */
  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  /** เมนูหลักสำหรับ User */
  get menuItems() {
    const items = [
      { label: 'แดชบอร์ด', icon: 'pi pi-home', routerLink: '/' },
      { label: 'คำร้องของฉัน', icon: 'pi pi-file', routerLink: '/form-requests' },
      { label: 'สร้างคำร้องใหม่', icon: 'pi pi-plus', routerLink: '/form-requests/create' },
    ];

    // เมนู Admin
    if (this.auth.isAdmin()) {
      items.push(
        { label: 'จัดการผู้ใช้', icon: 'pi pi-users', routerLink: '/admin/users' },
      );
    }

    return items;
  }

  /** Logout */
  logout(): void {
    this.auth.logout();
  }
}
