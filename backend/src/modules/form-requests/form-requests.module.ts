import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FormRequestsController } from './form-requests.controller';
import { FormRequestsService } from './form-requests.service';
import { FormRequest } from './entities/form-request.entity';

/**
 * Form Requests Module
 * จัดการคำร้อง — CRUD + Workflow สถานะ
 *
 * Dependencies:
 * - TypeOrmModule: ใช้ FormRequest repository
 *
 * Exports:
 * - FormRequestsService: ให้ module อื่น (เช่น Notifications) ใช้ดึงข้อมูลคำร้องได้
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([FormRequest]),
  ],
  controllers: [FormRequestsController],
  providers: [FormRequestsService],
  exports: [FormRequestsService],
})
export class FormRequestsModule {}
