import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard, guestGuard } from './core/guards/auth.guard';

/**
 * App Routes — เส้นทางหลักของระบบ
 * ใช้ Lazy Loading สำหรับทุก module
 */
export const routes: Routes = [
  // ─── หน้า Login (Guest เท่านั้น) ─────────────────
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./pages/login/login').then((m) => m.LoginComponent),
  },

  // ─── หน้าหลัก (ต้อง Login) ────────────────────────
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./layout/layout').then((m) => m.LayoutComponent),
    children: [
      // Dashboard
      {
        path: '',
        loadComponent: () =>
          import('./pages/dashboard/dashboard').then((m) => m.DashboardComponent),
      },

      // คำร้อง
      {
        path: 'form-requests',
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./pages/form-requests/form-request-list/form-request-list').then(
                (m) => m.FormRequestListComponent,
              ),
          },
          {
            path: 'create',
            loadComponent: () =>
              import('./pages/form-requests/form-request-form/form-request-form').then(
                (m) => m.FormRequestFormComponent,
              ),
          },
          {
            path: ':id',
            loadComponent: () =>
              import('./pages/form-requests/form-request-detail/form-request-detail').then(
                (m) => m.FormRequestDetailComponent,
              ),
          },
          {
            path: ':id/edit',
            loadComponent: () =>
              import('./pages/form-requests/form-request-form/form-request-form').then(
                (m) => m.FormRequestFormComponent,
              ),
          },
        ],
      },

      // Admin: จัดการผู้ใช้
      {
        path: 'admin/users',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./pages/admin/user-management/user-management').then(
            (m) => m.UserManagementComponent,
          ),
      },
    ],
  },

  // ─── Redirect ─────────────────────────────────────
  { path: '**', redirectTo: '' },
];
