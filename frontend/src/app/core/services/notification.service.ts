import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Notification, ApiResponse } from '../../core/models';

/**
 * NotificationService — จัดการการแจ้งเตือน
 * ดึงรายการ, อ่าน, ลบ, นับจำนวนที่ยังไม่อ่าน
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly API = `${environment.apiUrl}/notifications`;

  constructor(private http: HttpClient) {}

  /** ดึงรายการแจ้งเตือนของผู้ใช้ปัจจุบัน */
  findAll(): Observable<ApiResponse<Notification[]>> {
    return this.http.get<ApiResponse<Notification[]>>(this.API);
  }

  /** นับจำนวนแจ้งเตือนที่ยังไม่อ่าน */
  getUnreadCount(): Observable<ApiResponse<number>> {
    return this.http.get<ApiResponse<number>>(`${this.API}/unread-count`);
  }

  /** อ่านแจ้งเตือนรายการเดียว */
  markAsRead(id: number): Observable<ApiResponse<Notification>> {
    return this.http.patch<ApiResponse<Notification>>(`${this.API}/${id}/read`, {});
  }

  /** อ่านทั้งหมด */
  markAllAsRead(): Observable<ApiResponse<void>> {
    return this.http.patch<ApiResponse<void>>(`${this.API}/read-all`, {});
  }

  /** ลบแจ้งเตือน */
  remove(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.API}/${id}`);
  }

  /** ลบแจ้งเตือนที่อ่านแล้วทั้งหมด */
  removeAllRead(): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.API}/read`);
  }
}
