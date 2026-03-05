import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

/* PrimeNG */
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { ChartModule } from 'primeng/chart';
import { TagModule } from 'primeng/tag';

import { AuthService } from '../../core/services/auth.service';
import { FormRequestService } from '../../core/services/form-request.service';
import { FormRequestStats } from '../../core/models';

/**
 * DashboardComponent — หน้าแดชบอร์ด
 * แสดงสถิติคำร้อง, จำนวนตามสถานะ, ภาพรวมระบบ
 */
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, CardModule, ButtonModule, ChartModule, TagModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class DashboardComponent implements OnInit {
  stats: FormRequestStats | null = null;
  loading = true;

  /** ข้อมูล Chart */
  statusChartData: any;
  priorityChartData: any;
  chartOptions: any;

  constructor(
    public auth: AuthService,
    private formRequestService: FormRequestService,
  ) {}

  ngOnInit(): void {
    this.loadStats();
    this.initChartOptions();
  }

  /** โหลดสถิติคำร้อง */
  loadStats(): void {
    this.formRequestService.getStats().subscribe({
      next: (res) => {
        this.stats = res.data;
        this.buildCharts();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  /** ตั้งค่า chart options */
  initChartOptions(): void {
    this.chartOptions = {
      responsive: true,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { usePointStyle: true },
        },
      },
    };
  }

  /** สร้างข้อมูล Chart จากสถิติ */
  buildCharts(): void {
    if (!this.stats) return;

    // Status chart
    const statusLabels: Record<string, string> = {
      draft: 'ร่าง',
      submitted: 'ส่งแล้ว',
      under_review: 'กำลังตรวจ',
      approved: 'อนุมัติ',
      rejected: 'ปฏิเสธ',
      completed: 'เสร็จสิ้น',
      cancelled: 'ยกเลิก',
    };

    const statusColors = ['#94a3b8', '#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#6366f1', '#9ca3af'];

    this.statusChartData = {
      labels: Object.keys(this.stats.byStatus).map((k) => statusLabels[k] || k),
      datasets: [
        {
          data: Object.values(this.stats.byStatus),
          backgroundColor: statusColors,
        },
      ],
    };

    // Priority chart
    const priorityLabels: Record<string, string> = {
      low: 'ต่ำ',
      medium: 'ปานกลาง',
      high: 'สูง',
      urgent: 'เร่งด่วน',
    };
    const priorityColors = ['#10b981', '#f59e0b', '#ef4444', '#ec4899'];

    this.priorityChartData = {
      labels: Object.keys(this.stats.byPriority).map((k) => priorityLabels[k] || k),
      datasets: [
        {
          data: Object.values(this.stats.byPriority),
          backgroundColor: priorityColors,
        },
      ],
    };
  }

  /** ดึง stat cards */
  get statCards() {
    if (!this.stats) return [];
    return [
      { label: 'คำร้องทั้งหมด', value: this.stats.total, icon: 'pi pi-file', color: '#3b82f6' },
      { label: 'รออนุมัติ', value: this.stats.byStatus?.['submitted'] || 0, icon: 'pi pi-clock', color: '#f59e0b' },
      { label: 'อนุมัติแล้ว', value: this.stats.byStatus?.['approved'] || 0, icon: 'pi pi-check-circle', color: '#10b981' },
      { label: 'ปฏิเสธ', value: this.stats.byStatus?.['rejected'] || 0, icon: 'pi pi-times-circle', color: '#ef4444' },
    ];
  }
}
