import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User, ApiResponse, PaginatedResult, UserStats } from '../../core/models';

/**
 * UserService — จัดการผู้ใช้งาน (Admin)
 * CRUD + Toggle Active + Stats
 */
@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly API = `${environment.apiUrl}/users`;

  constructor(private http: HttpClient) {}

  /** ดึงรายการผู้ใช้ (แบ่งหน้า) */
  findAll(params?: Record<string, any>): Observable<ApiResponse<PaginatedResult<User>>> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach((key) => {
        if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
          httpParams = httpParams.set(key, params[key]);
        }
      });
    }
    return this.http.get<ApiResponse<PaginatedResult<User>>>(this.API, { params: httpParams });
  }

  /** ดึงผู้ใช้ตาม ID */
  findOne(id: number): Observable<ApiResponse<User>> {
    return this.http.get<ApiResponse<User>>(`${this.API}/${id}`);
  }

  /** อัปเดตข้อมูลผู้ใช้ */
  update(id: number, data: Partial<User>): Observable<ApiResponse<User>> {
    return this.http.patch<ApiResponse<User>>(`${this.API}/${id}`, data);
  }

  /** เปิด/ปิดสถานะผู้ใช้ */
  toggleActive(id: number): Observable<ApiResponse<User>> {
    return this.http.patch<ApiResponse<User>>(`${this.API}/${id}/toggle-active`, {});
  }

  /** ดึงสถิติผู้ใช้ */
  getStats(): Observable<ApiResponse<UserStats>> {
    return this.http.get<ApiResponse<UserStats>>(`${this.API}/stats`);
  }
}
