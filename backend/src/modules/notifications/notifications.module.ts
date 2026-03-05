import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { Notification } from './entities/notification.entity';

/**
 * Notifications Module
 * จัดการแจ้งเตือนในระบบ (In-App Notifications)
 *
 * Dependencies:
 * - TypeOrmModule: ใช้ Notification repository
 *
 * Exports:
 * - NotificationsService: ให้ module อื่นเรียกสร้างแจ้งเตือนได้
 *   เช่น FormRequestsService เรียก create() ตอนเปลี่ยนสถานะคำร้อง
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Notification]),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService], // สำคัญ — ให้ module อื่นใช้สร้างแจ้งเตือนได้
})
export class NotificationsModule {}
