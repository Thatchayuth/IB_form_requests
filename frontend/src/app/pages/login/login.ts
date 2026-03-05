import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';

/* PrimeNG */
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { MessageModule } from 'primeng/message';
import { DialogModule } from 'primeng/dialog';

import { AuthService } from '../../core/services/auth.service';

/**
 * LoginComponent — หน้า Login (AD Authentication)
 * รองรับ: Session Conflict Dialog (409), Session Expired Notice, Force Login
 */
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    InputTextModule,
    PasswordModule,
    ButtonModule,
    CardModule,
    MessageModule,
    DialogModule,
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class LoginComponent implements OnInit {
  username = '';
  password = '';
  loading = false;
  errorMessage = '';

  // ─── Session Conflict (409) ────────────────────────────
  showSessionConflict = false;
  conflictDevice = '';
  conflictIp = '';
  conflictTime = '';
  isForceLoading = false;

  // ─── Session Expired Notice (query param) ──────────────
  sessionExpiredReason = '';

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    // ─── อ่าน query param ?reason=session_expired|session_replaced ──
    this.route.queryParams.subscribe((params) => {
      if (params['reason']) {
        this.sessionExpiredReason = params['reason'];
      }
    });
  }

  /** ข้อความแจ้งเตือนเหตุผลที่ถูก redirect มาหน้า Login */
  get sessionExpiredMessage(): string {
    switch (this.sessionExpiredReason) {
      case 'session_expired':
        return 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่';
      case 'session_replaced':
        return 'มีการเข้าสู่ระบบจากอุปกรณ์อื่น คุณถูกออกจากระบบโดยอัตโนมัติ';
      default:
        return '';
    }
  }

  /** เข้าสู่ระบบ */
  onLogin(): void {
    if (!this.username || !this.password) {
      this.errorMessage = 'กรุณากรอก Username และ Password';
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.sessionExpiredReason = '';

    this.authService.login({ username: this.username, password: this.password }).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/']);
      },
      error: (err) => {
        this.loading = false;

        // ─── 409 Session Conflict → แสดง dialog ──────────
        if (err?.type === 'ACTIVE_SESSION_CONFLICT') {
          this.conflictDevice = err.device;
          this.conflictIp = err.ip;
          this.conflictTime = this.formatDateTime(err.time);
          this.showSessionConflict = true;
          return;
        }

        this.errorMessage =
          err?.error?.message || 'เข้าสู่ระบบไม่สำเร็จ กรุณาตรวจสอบข้อมูลอีกครั้ง';
      },
    });
  }

  /** ยืนยัน Force Login — เตะ session เดิมออก */
  confirmForceLogin(): void {
    this.isForceLoading = true;

    this.authService.forceLogin().subscribe({
      next: () => {
        this.isForceLoading = false;
        this.showSessionConflict = false;
        this.router.navigate(['/']);
      },
      error: (err) => {
        this.isForceLoading = false;
        this.showSessionConflict = false;
        this.errorMessage =
          err?.error?.message || 'เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่';
      },
    });
  }

  /** ยกเลิก Force Login */
  cancelForceLogin(): void {
    this.showSessionConflict = false;
  }

  /** จัดรูปแบบวันที่ */
  private formatDateTime(dateStr: string): string {
    if (!dateStr) return 'ไม่ทราบเวลา';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  }
}
