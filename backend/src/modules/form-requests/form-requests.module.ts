import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FormRequestsController } from './form-requests.controller';
import { FormRequestsService } from './form-requests.service';
import { FormRequest } from './entities/form-request.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersModule } from '../users/users.module';

/**
 * Form Requests Module
 * จัดการคำร้อง — CRUD + Workflow สถานะ + แจ้งเตือนอัตโนมัติ
 *
 * Dependencies:
 * - TypeOrmModule: ใช้ FormRequest repository
 * - NotificationsModule: สร้างแจ้งเตือนอัตโนมัติเมื่อเปลี่ยนสถานะ
 * - UsersModule: ดึงรายชื่อ Admin สำหรับส่งแจ้งเตือน
 *
 * Exports:
 * - FormRequestsService: ให้ module อื่นใช้ดึงข้อมูลคำร้องได้
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([FormRequest]),
    NotificationsModule, // ใช้สร้างแจ้งเตือนอัตโนมัติ
    UsersModule,         // ใช้ดึงรายชื่อ Admin
  ],
  controllers: [FormRequestsController],
  providers: [FormRequestsService],
  exports: [FormRequestsService],
})
export class FormRequestsModule {}
