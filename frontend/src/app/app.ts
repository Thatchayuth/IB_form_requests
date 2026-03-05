import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/**
 * App Root Component — ระบบจัดการคำร้อง
 * แสดงผล router-outlet เท่านั้น (Layout อยู่ใน LayoutComponent)
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: '<router-outlet />',
})
export class App {}
