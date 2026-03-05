import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * Auth Interceptor (Functional — Angular 20)
 * - แนบ JWT Bearer Token ในทุก request
 * - จัดการ 401 Unauthorized:
 *   - Session ถูก invalidate (มีคนอื่น force login) → forceLogout พร้อม reason
 *   - Token หมดอายุ / ไม่ถูกต้อง → forceLogout
 * - ไม่จับ 401 จาก /auth/login หรือ /auth/logout (หลีกเลี่ยง loop)
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  // ดึง token จาก AuthService
  const token = authService.getToken();

  // ถ้ามี token → แนบ Authorization header
  let authReq = req;
  if (token) {
    authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // ─── ไม่จับ 401 จาก auth endpoints (หลีกเลี่ยง redirect loop) ──
      const isAuthEndpoint =
        req.url.includes('/auth/login') || req.url.includes('/auth/logout');

      if (error.status === 401 && !isAuthEndpoint) {
        // ─── ถ้า message บอกว่า session ถูก invalidate ──────────
        const msg = error.error?.message || '';
        if (msg.includes('session') || msg.includes('Session')) {
          authService.forceLogout('session_replaced');
        } else {
          authService.forceLogout('session_expired');
        }
      }
      return throwError(() => error);
    }),
  );
};
