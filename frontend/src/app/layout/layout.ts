import { Component } from '@angular/core';
import { Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../core/services/auth.service';
import { NotificationPanelComponent } from '../shared/notification-panel/notification-panel';

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
    NotificationPanelComponent,
  ],
  providers: [MessageService],
  templateUrl: './layout.html',
  styleUrl: './layout.scss',
})
export class LayoutComponent {
  /** เปิด/ปิด Sidebar (desktop) */
  sidebarCollapsed = false;
  /** เปิด Sidebar บน mobile (overlay) */
  mobileOpen = false;

  private isMobile = false;

  constructor(
    public auth: AuthService,
    private router: Router,
    private messageService: MessageService,
  ) {
    // ซ่อน sidebar อัตโนมัติบนจอเล็ก
    this.checkMobile();
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', () => this.checkMobile());
    }
  }

  private checkMobile(): void {
    if (typeof window === 'undefined') return;
    this.isMobile = window.innerWidth < 768;
    if (this.isMobile) {
      this.sidebarCollapsed = true;
      this.mobileOpen = false;
    }
  }

  /** Toggle Sidebar — desktop: collapse/expand, mobile: overlay */
  toggleSidebar(): void {
    if (this.isMobile) {
      this.mobileOpen = !this.mobileOpen;
    } else {
      this.sidebarCollapsed = !this.sidebarCollapsed;
    }
  }

  /** ปิด sidebar บน mobile */
  closeMobile(): void {
    this.mobileOpen = false;
  }

  /**
   * Sidebar ขยาย? (desktop: !collapsed, mobile: mobileOpen)
   * ใช้ใน template เพื่อแสดง/ซ่อนข้อความเมนู + ขนาด sidebar
   */
  get isExpanded(): boolean {
    return this.isMobile ? this.mobileOpen : !this.sidebarCollapsed;
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
