import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Auth Guard (Functional — Angular 20)
 * ตรวจสอบว่าผู้ใช้เข้าสู่ระบบแล้วหรือยัง
 * ถ้ายังไม่ได้ login → redirect ไปหน้า /login
 */
export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) {
    return true;
  }

  // ยังไม่ได้ login → ไปหน้า Login
  router.navigate(['/login']);
  return false;
};

/**
 * Admin Guard (Functional — Angular 20)
 * ตรวจสอบว่าผู้ใช้เป็น Admin หรือไม่
 * ถ้าไม่ใช่ Admin → redirect ไปหน้าหลัก
 */
export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn() && authService.isAdmin()) {
    return true;
  }

  // ไม่ใช่ Admin → ไปหน้าหลัก
  router.navigate(['/']);
  return false;
};

/**
 * Guest Guard (Functional — Angular 20)
 * สำหรับหน้า Login — ถ้า login แล้วให้ redirect ไปหน้าหลัก
 */
export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) {
    // login แล้ว → ไปหน้าหลัก
    router.navigate(['/']);
    return false;
  }

  return true;
};
