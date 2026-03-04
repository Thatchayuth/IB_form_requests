import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

/**
 * App Controller - ใช้ตรวจสอบว่า API ทำงานปกติ (Health Check)
 */
@ApiTags('ทั่วไป')
@Controller()
export class AppController {
  /**
   * Health Check - ตรวจสอบสถานะ API
   * GET /api/health
   */
  @Get('health')
  @ApiOperation({ summary: 'ตรวจสอบสถานะ API (Health Check)' })
  healthCheck() {
    return {
      success: true,
      message: 'ระบบจัดการคำร้อง API ทำงานปกติ',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    };
  }
}
