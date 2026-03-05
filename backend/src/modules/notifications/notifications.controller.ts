import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

/**
 * Notifications Controller
 * จัดการแจ้งเตือนในระบบ (In-App Notifications)
 *
 * Endpoints (ทุก endpoint ต้อง Login — ดูได้เฉพาะของตัวเอง):
 *   GET    /api/notifications              - รายการแจ้งเตือน (pagination)
 *   GET    /api/notifications/unread-count  - จำนวนที่ยังไม่อ่าน (สำหรับ badge)
 *   PATCH  /api/notifications/:id/read     - อ่านแจ้งเตือน 1 รายการ
 *   PATCH  /api/notifications/read-all     - อ่านทั้งหมด
 *   DELETE /api/notifications/:id          - ลบแจ้งเตือน 1 รายการ
 *   DELETE /api/notifications/read         - ลบแจ้งเตือนที่อ่านแล้วทั้งหมด
 *
 * หมายเหตุ: การสร้างแจ้งเตือนจะเรียกจาก Service อื่น (เช่น FormRequestsService)
 *           ไม่มี POST endpoint ให้ client เรียกโดยตรง
 */
@ApiTags('Notifications')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // =============================================
  // GET /api/notifications — รายการแจ้งเตือน
  // =============================================
  /**
   * ดูแจ้งเตือนของตัวเอง (pagination)
   * เรียงจาก: ยังไม่อ่านก่อน → ใหม่ก่อน
   */
  @Get()
  @ApiOperation({ summary: 'ดูรายการแจ้งเตือน (ของตัวเอง)' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiResponse({ status: 200, description: 'รายการแจ้งเตือนพร้อม pagination' })
  async findAll(
    @CurrentUser() user: User,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.notificationsService.findByUser(
      user.id,
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
    );
  }

  // =============================================
  // GET /api/notifications/unread-count — จำนวนที่ยังไม่อ่าน
  // =============================================
  /**
   * นับแจ้งเตือนที่ยังไม่อ่าน — ใช้แสดง badge บน icon
   * Frontend เรียก polling ทุก 30 วินาที หรือเมื่อ focus กลับมา
   */
  @Get('unread-count')
  @ApiOperation({ summary: 'จำนวนแจ้งเตือนที่ยังไม่อ่าน (สำหรับ badge)' })
  @ApiResponse({ status: 200, description: '{ unreadCount: number }' })
  async getUnreadCount(@CurrentUser() user: User) {
    return this.notificationsService.getUnreadCount(user.id);
  }

  // =============================================
  // PATCH /api/notifications/read-all — อ่านทั้งหมด
  // =============================================
  /**
   * ทำเครื่องหมายอ่านทั้งหมด (Mark All as Read)
   * ⚠️ ต้องอยู่ก่อน :id/read เพื่อไม่ให้ NestJS จับเป็น param
   */
  @Patch('read-all')
  @ApiOperation({ summary: 'อ่านแจ้งเตือนทั้งหมด' })
  @ApiResponse({ status: 200, description: '{ affected: number }' })
  async markAllAsRead(@CurrentUser() user: User) {
    return this.notificationsService.markAllAsRead(user.id);
  }

  // =============================================
  // PATCH /api/notifications/:id/read — อ่าน 1 รายการ
  // =============================================
  @Patch(':id/read')
  @ApiOperation({ summary: 'อ่านแจ้งเตือน 1 รายการ' })
  @ApiParam({ name: 'id', description: 'Notification ID', example: 1 })
  @ApiResponse({ status: 200, description: 'แจ้งเตือนที่อ่านแล้ว' })
  @ApiResponse({ status: 404, description: 'ไม่พบแจ้งเตือน' })
  async markAsRead(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    return this.notificationsService.markAsRead(id, user.id);
  }

  // =============================================
  // DELETE /api/notifications/read — ลบที่อ่านแล้วทั้งหมด
  // =============================================
  /**
   * ลบแจ้งเตือนที่อ่านแล้วทั้งหมด (cleanup)
   * ⚠️ ต้องอยู่ก่อน :id เพื่อไม่ให้ NestJS จับเป็น param
   */
  @Delete('read')
  @ApiOperation({ summary: 'ลบแจ้งเตือนที่อ่านแล้วทั้งหมด' })
  @ApiResponse({ status: 200, description: '{ affected: number }' })
  async removeAllRead(@CurrentUser() user: User) {
    return this.notificationsService.removeAllRead(user.id);
  }

  // =============================================
  // DELETE /api/notifications/:id — ลบ 1 รายการ
  // =============================================
  @Delete(':id')
  @ApiOperation({ summary: 'ลบแจ้งเตือน 1 รายการ' })
  @ApiParam({ name: 'id', description: 'Notification ID', example: 1 })
  @ApiResponse({ status: 200, description: 'ลบสำเร็จ' })
  @ApiResponse({ status: 404, description: 'ไม่พบแจ้งเตือน' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    return this.notificationsService.remove(id, user.id);
  }
}
