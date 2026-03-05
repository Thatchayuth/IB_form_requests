import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

/* PrimeNG */
import { ButtonModule } from 'primeng/button';
import { BadgeModule } from 'primeng/badge';
import { DividerModule } from 'primeng/divider';
import { TooltipModule } from 'primeng/tooltip';
import { TagModule } from 'primeng/tag';

import { NotificationService } from '../../core/services/notification.service';
import { Notification, NotificationType } from '../../core/models';

/**
 * NotificationPanelComponent — แผงแจ้งเตือน (Dropdown)
 * แสดงรายการแจ้งเตือน + badge จำนวนที่ยังไม่อ่าน
 * ใช้ polling ดึงข้อมูลทุก 30 วินาที
 */
@Component({
  selector: 'app-notification-panel',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    BadgeModule,
    DividerModule,
    TooltipModule,
    TagModule,
  ],
  templateUrl: './notification-panel.html',
  styleUrl: './notification-panel.scss',
})
export class NotificationPanelComponent implements OnInit, OnDestroy {
  /** รายการแจ้งเตือน */
  notifications = signal<Notification[]>([]);

  /** จำนวนที่ยังไม่อ่าน */
  unreadCount = signal<number>(0);

  /** เปิด/ปิด panel */
  isOpen = false;

  /** Loading state */
  loading = false;

  /** Polling interval */
  private pollInterval: any;

  /** มีแจ้งเตือนที่ยังไม่อ่าน */
  hasUnread = computed(() => this.unreadCount() > 0);

  /** Badge label */
  badgeLabel = computed(() => {
    const count = this.unreadCount();
    return count > 99 ? '99+' : count > 0 ? count.toString() : '';
  });

  constructor(
    private notificationService: NotificationService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.loadUnreadCount();
    // Polling ทุก 30 วินาที
    this.pollInterval = setInterval(() => {
      this.loadUnreadCount();
    }, 30000);
  }

  ngOnDestroy(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
  }

  /** โหลดจำนวนแจ้งเตือนที่ยังไม่อ่าน */
  loadUnreadCount(): void {
    this.notificationService.getUnreadCount().subscribe({
      next: (res) => this.unreadCount.set(res.data),
      error: () => {}, // เงียบ ๆ ถ้า error
    });
  }

  /** โหลดรายการแจ้งเตือน */
  loadNotifications(): void {
    this.loading = true;
    this.notificationService.findAll().subscribe({
      next: (res) => {
        this.notifications.set(res.data);
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  /** เปิด/ปิด panel */
  togglePanel(): void {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.loadNotifications();
    }
  }

  /** ปิด panel */
  closePanel(): void {
    this.isOpen = false;
  }

  /** คลิกแจ้งเตือน → อ่าน + นำทางไปคำร้อง */
  onClickNotification(notification: Notification): void {
    // ถ้ายังไม่อ่าน → mark as read
    if (!notification.isRead) {
      this.notificationService.markAsRead(notification.id).subscribe({
        next: () => {
          this.unreadCount.update((c) => Math.max(0, c - 1));
          // อัปเดตใน list
          this.notifications.update((list) =>
            list.map((n) =>
              n.id === notification.id ? { ...n, isRead: true } : n,
            ),
          );
        },
      });
    }

    // นำทางไปคำร้อง (ถ้ามี formRequestId)
    if (notification.formRequestId) {
      this.router.navigate(['/form-requests', notification.formRequestId]);
      this.closePanel();
    }
  }

  /** อ่านทั้งหมด */
  markAllAsRead(): void {
    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        this.unreadCount.set(0);
        this.notifications.update((list) =>
          list.map((n) => ({ ...n, isRead: true })),
        );
      },
    });
  }

  /** ลบแจ้งเตือนที่อ่านแล้ว */
  removeAllRead(): void {
    this.notificationService.removeAllRead().subscribe({
      next: () => {
        this.notifications.update((list) => list.filter((n) => !n.isRead));
      },
    });
  }

  /** ลบแจ้งเตือนรายการเดียว */
  removeNotification(event: Event, notification: Notification): void {
    event.stopPropagation();
    this.notificationService.remove(notification.id).subscribe({
      next: () => {
        if (!notification.isRead) {
          this.unreadCount.update((c) => Math.max(0, c - 1));
        }
        this.notifications.update((list) => list.filter((n) => n.id !== notification.id));
      },
    });
  }

  /** ไอคอนตามประเภทแจ้งเตือน */
  getNotificationIcon(type: NotificationType): string {
    const map: Record<string, string> = {
      [NotificationType.STATUS_CHANGE]: 'pi pi-sync',
      [NotificationType.ASSIGNMENT]: 'pi pi-user-plus',
      [NotificationType.APPROVAL]: 'pi pi-check-circle',
      [NotificationType.REJECTION]: 'pi pi-times-circle',
      [NotificationType.REMINDER]: 'pi pi-bell',
      [NotificationType.SYSTEM]: 'pi pi-info-circle',
    };
    return map[type] || 'pi pi-bell';
  }

  /** สีตามประเภทแจ้งเตือน */
  getNotificationColor(type: NotificationType): string {
    const map: Record<string, string> = {
      [NotificationType.STATUS_CHANGE]: '#3b82f6',
      [NotificationType.ASSIGNMENT]: '#8b5cf6',
      [NotificationType.APPROVAL]: '#10b981',
      [NotificationType.REJECTION]: '#ef4444',
      [NotificationType.REMINDER]: '#f59e0b',
      [NotificationType.SYSTEM]: '#6b7280',
    };
    return map[type] || '#6b7280';
  }

  /** เวลาที่ผ่านมา (relative time) */
  getTimeAgo(dateStr: string): string {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMs / 3600000);
    const diffDay = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return 'เมื่อสักครู่';
    if (diffMin < 60) return `${diffMin} นาทีที่แล้ว`;
    if (diffHr < 24) return `${diffHr} ชั่วโมงที่แล้ว`;
    if (diffDay < 7) return `${diffDay} วันที่แล้ว`;
    return date.toLocaleDateString('th-TH');
  }
}
