import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoginRequest, LoginResponse, User, ApiResponse } from '../../core/models';

/**
 * AuthService — จัดการ Authentication (AD Login)
 * เก็บ token ใน localStorage, ใช้ Signals สำหรับ state management
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly API = environment.apiUrl;
  private readonly TOKEN_KEY = 'access_token';
  private readonly USER_KEY = 'current_user';

  /** Signal: ผู้ใช้ปัจจุบัน */
  currentUser = signal<User | null>(this.loadUser());

  /** Computed: เข้าสู่ระบบแล้วหรือยัง */
  isLoggedIn = computed(() => !!this.currentUser() && !!this.getToken());

  /** Computed: เป็น Admin หรือไม่ */
  isAdmin = computed(() => this.currentUser()?.role === 'admin');

  constructor(
    private http: HttpClient,
    private router: Router,
  ) {}

  // ─── Login ด้วย AD ──────────────────────────────────

  /**
   * เข้าสู่ระบบผ่าน AD
   * ส่ง username/password ไป Backend → Backend ยิง AD API → ได้ JWT กลับมา
   */
  login(credentials: LoginRequest): Observable<ApiResponse<LoginResponse>> {
    return this.http
      .post<ApiResponse<LoginResponse>>(`${this.API}/auth/login`, credentials)
      .pipe(
        tap((res) => {
          const { accessToken, user } = res.data;
          this.setToken(accessToken);
          this.setUser(user);
          this.currentUser.set(user);
        }),
        catchError((err) => {
          console.error('Login failed:', err);
          return throwError(() => err);
        }),
      );
  }

  // ─── Profile ────────────────────────────────────────

  /** ดึงข้อมูล Profile ล่าสุดจาก Backend */
  getProfile(): Observable<ApiResponse<User>> {
    return this.http.get<ApiResponse<User>>(`${this.API}/auth/profile`).pipe(
      tap((res) => {
        this.setUser(res.data);
        this.currentUser.set(res.data);
      }),
    );
  }

  // ─── Logout ─────────────────────────────────────────

  /** ออกจากระบบ — ลบ token, user แล้ว redirect ไปหน้า Login */
  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  // ─── Token Management ───────────────────────────────

  /** ดึง JWT Token */
  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  /** บันทึก Token */
  private setToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  /** บันทึกข้อมูลผู้ใช้ */
  private setUser(user: User): void {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  /** โหลดข้อมูลผู้ใช้จาก localStorage */
  private loadUser(): User | null {
    try {
      const data = localStorage.getItem(this.USER_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }
}
