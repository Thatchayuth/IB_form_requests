import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  FormRequest,
  PaginatedResult,
  ApiResponse,
  FormRequestStats,
} from '../../core/models';

/**
 * FormRequestService — จัดการคำร้องทั้งหมด
 * CRUD + Workflow (Submit, Cancel, UpdateStatus)
 */
@Injectable({ providedIn: 'root' })
export class FormRequestService {
  private readonly API = `${environment.apiUrl}/form-requests`;

  constructor(private http: HttpClient) {}

  // ─── CRUD ───────────────────────────────────────────

  /** ดึงรายการคำร้อง (แบ่งหน้า + filter) */
  findAll(params?: Record<string, any>): Observable<ApiResponse<PaginatedResult<FormRequest>>> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach((key) => {
        if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
          httpParams = httpParams.set(key, params[key]);
        }
      });
    }
    return this.http.get<ApiResponse<PaginatedResult<FormRequest>>>(this.API, { params: httpParams });
  }

  /** ดึงคำร้องตาม ID */
  findOne(id: number): Observable<ApiResponse<FormRequest>> {
    return this.http.get<ApiResponse<FormRequest>>(`${this.API}/${id}`);
  }

  /** สร้างคำร้องใหม่ (Draft) */
  create(data: Partial<FormRequest>): Observable<ApiResponse<FormRequest>> {
    return this.http.post<ApiResponse<FormRequest>>(this.API, data);
  }

  /** อัปเดตคำร้อง (เฉพาะ Draft) */
  update(id: number, data: Partial<FormRequest>): Observable<ApiResponse<FormRequest>> {
    return this.http.patch<ApiResponse<FormRequest>>(`${this.API}/${id}`, data);
  }

  // ─── Workflow ───────────────────────────────────────

  /** ส่งคำร้อง (Draft → Submitted) */
  submit(id: number): Observable<ApiResponse<FormRequest>> {
    return this.http.patch<ApiResponse<FormRequest>>(`${this.API}/${id}/submit`, {});
  }

  /** ยกเลิกคำร้อง */
  cancel(id: number): Observable<ApiResponse<FormRequest>> {
    return this.http.patch<ApiResponse<FormRequest>>(`${this.API}/${id}/cancel`, {});
  }

  /** Admin: อัปเดตสถานะคำร้อง */
  updateStatus(
    id: number,
    data: { status: string; remarks?: string },
  ): Observable<ApiResponse<FormRequest>> {
    return this.http.patch<ApiResponse<FormRequest>>(`${this.API}/${id}/status`, data);
  }

  // ─── Stats ──────────────────────────────────────────

  /** ดึงสถิติคำร้อง */
  getStats(): Observable<ApiResponse<FormRequestStats>> {
    return this.http.get<ApiResponse<FormRequestStats>>(`${this.API}/stats`);
  }
}
