import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Attachment, ApiResponse } from '../../core/models';

/**
 * AttachmentService — จัดการไฟล์แนบ
 * อัปโหลด, ดาวน์โหลด, ลบ
 */
@Injectable({ providedIn: 'root' })
export class AttachmentService {
  private readonly API = `${environment.apiUrl}/attachments`;

  constructor(private http: HttpClient) {}

  /** อัปโหลดไฟล์แนบไปยังคำร้อง */
  upload(formRequestId: number, files: File[]): Observable<ApiResponse<Attachment[]>> {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    return this.http.post<ApiResponse<Attachment[]>>(
      `${this.API}/upload/${formRequestId}`,
      formData,
    );
  }

  /** ดึงรายการไฟล์แนบของคำร้อง */
  findByFormRequest(formRequestId: number): Observable<ApiResponse<Attachment[]>> {
    return this.http.get<ApiResponse<Attachment[]>>(
      `${this.API}/form-request/${formRequestId}`,
    );
  }

  /** ดาวน์โหลดไฟล์แนบ — ดาวน์โหลดเป็น Blob */
  download(id: number): Observable<Blob> {
    return this.http.get(`${this.API}/${id}/download`, {
      responseType: 'blob',
    });
  }

  /** ลบไฟล์แนบ */
  remove(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.API}/${id}`);
  }

  // ─── Helper: สร้าง download link แล้วคลิก ─────────

  /** ดาวน์โหลดไฟล์แนบ (trigger browser download) */
  downloadAndSave(id: number, fileName: string): void {
    this.download(id).subscribe((blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      window.URL.revokeObjectURL(url);
    });
  }
}
