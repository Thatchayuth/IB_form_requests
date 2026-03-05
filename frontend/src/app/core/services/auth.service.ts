import { Injectable, signal, computed, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoginRequest, LoginResponse, User, ApiResponse, UserRole } from '../../core/models';

// ─── localStorage Keys ─────────────────────────────────
const TOKEN_KEY = 'access_token';
const USER_KEY = 'current_user';
const SYNC_KEY = 'ib_auth_sync'; // สำหรับ sync ข้าม tab

/**
 * AuthService — จัดการ Authentication (AD Login)
 * เก็บ token ใน localStorage, ใช้ Signals สำหรับ state management
 * รองรับ Cross-Tab Sync: login/logout จาก tab หนึ่ง → sync ไปทุก tab อัตโนมัติ
 */
@Injectable({ providedIn: 'root' })
export class AuthService implements OnDestroy {
  private readonly API = environment.apiUrl;

  /** Signal: ผู้ใช้ปัจจุบัน */
  currentUser = signal<User | null>(this.loadUser());

  /** Computed: เข้าสู่ระบบแล้วหรือยัง */
  isLoggedIn = computed(() => !!this.currentUser() && !!this.getToken());

  /** Computed: เป็น Admin หรือไม่ */
  isAdmin = computed(() => this.currentUser()?.role === UserRole.ADMIN);

  /** Computed: ชื่อสำหรับแสดง */
  displayName = computed(
    () => this.currentUser()?.fullName || this.currentUser()?.username || '',
  );

  // ─── Storage event listener reference ──────────────────
  private storageListener: ((e: StorageEvent) => void) | null = null;

  constructor(
    private http: HttpClient,
    private router: Router,
  ) {
    // ─── ฟัง storage event จาก tab อื่น ──────────────────
    this.storageListener = (event: StorageEvent) => {
      this.handleStorageChange(event);
    };
    window.addEventListener('storage', this.storageListener);
  }

  ngOnDestroy(): void {
    if (this.storageListener) {
      window.removeEventListener('storage', this.storageListener);
    }
  }

  // ═══════════════════════════════════════════════════════
  //  Cross-Tab Sync — ฟัง localStorage เปลี่ยนจาก tab อื่น
  // ═══════════════════════════════════════════════════════

  /**
   * เมื่อ tab อื่นเปลี่ยนค่าใน localStorage:
   * - Token ถูกลบ (logout จาก tab อื่น) → logout tab นี้ด้วย
   * - Token ถูกเพิ่ม (login จาก tab อื่น) → อัพเดท signal + redirect
   * - User ถูกเปลี่ยน → อัพเดท signal
   */
  private handleStorageChange(event: StorageEvent): void {
    // ─── Token ถูกลบ = logout จาก tab อื่น ────────────
    if (event.key === TOKEN_KEY) {
      if (!event.newValue) {
        console.log('[AuthSync] ตรวจพบ logout จาก tab อื่น');
        this.currentUser.set(null);
        this.router.navigate(['/login']);
      } else {
        console.log('[AuthSync] ตรวจพบ login จาก tab อื่น');
        const user = this.loadUser();
        this.currentUser.set(user);
        if (this.router.url === '/login') {
          this.router.navigate(['/dashboard']);
        }
      }
    }

    // ─── User data เปลี่ยนจาก tab อื่น ────────────────
    if (event.key === USER_KEY) {
      if (event.newValue) {
        try {
          const user = JSON.parse(event.newValue) as User;
          this.currentUser.set(user);
        } catch { /* ignore */ }
      } else {
        this.currentUser.set(null);
      }
    }

    // ─── Sync signal (force refresh) ─────────────────
    if (event.key === SYNC_KEY) {
      console.log('[AuthSync] ได้รับ sync signal จาก tab อื่น');
      this.currentUser.set(this.loadUser());
    }
  }

  /** ส่ง sync signal ไปยัง tab อื่น */
  private broadcastSync(): void {
    localStorage.setItem(SYNC_KEY, Date.now().toString());
  }

  // ═══════════════════════════════════════════════════════
  //  Login / Logout / Profile
  // ═══════════════════════════════════════════════════════

  /**
   * เข้าสู่ระบบผ่าน AD
   * ส่ง username/password ไป Backend → Backend ยิง AD API → ได้ JWT กลับมา
   */
  login(credentials: LoginRequest): Observable<ApiResponse<LoginResponse>> {
    return this.http
      .post<ApiResponse<LoginResponse>>(`${this.API}/auth/login`, credentials)
      .pipe(
        tap((res) => {
          const { access_token, user } = res.data;
          this.setSession(access_token, user);
        }),
        catchError((err) => {
          console.error('Login failed:', err);
          return throwError(() => err);
        }),
      );
  }

  /** ดึงข้อมูล Profile ล่าสุดจาก Backend */
  getProfile(): Observable<ApiResponse<User>> {
    return this.http.get<ApiResponse<User>>(`${this.API}/auth/profile`).pipe(
      tap((res) => {
        this.setUser(res.data);
        this.currentUser.set(res.data);
      }),
    );
  }

  /**
   * ออกจากระบบ — ลบ token, user แล้ว redirect ไปหน้า Login
   * Tab อื่นจะรับ storage event แล้ว logout ตามอัตโนมัติ
   */
  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.currentUser.set(null);
    this.broadcastSync();
    this.router.navigate(['/login']);
  }

  // ═══════════════════════════════════════════════════════
  //  Token / Session Management
  // ═══════════════════════════════════════════════════════

  /** ดึง JWT Token */
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  /** บันทึก token + user ลง localStorage + signal แล้ว broadcast sync */
  private setSession(token: string, user: User): void {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    this.currentUser.set(user);
    this.broadcastSync();
  }

  /** บันทึกข้อมูลผู้ใช้ */
  private setUser(user: User): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  /** โหลดข้อมูลผู้ใช้จาก localStorage */
  private loadUser(): User | null {
    try {
      const data = localStorage.getItem(USER_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  /**
   * ตรวจสอบว่า token ยัง valid อยู่ (ยังไม่หมดอายุ)
   * ใช้ตรวจเบื้องต้นฝั่ง client — backend ตรวจจริงอีกรอบ
   */
  isTokenValid(): boolean {
    const token = this.getToken();
    if (!token) return false;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const exp = payload.exp * 1000;
      const isValid = exp > Date.now();

      if (!isValid) {
        console.log('[Auth] Token หมดอายุ — ล้าง session');
        this.logout();
      }

      return isValid;
    } catch {
      return false;
    }
  }
}
