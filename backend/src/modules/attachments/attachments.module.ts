import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttachmentsController } from './attachments.controller';
import { AttachmentsService } from './attachments.service';
import { Attachment } from './entities/attachment.entity';
import { FormRequest } from '../form-requests/entities/form-request.entity';

/**
 * Attachments Module
 * จัดการไฟล์แนบของคำร้อง — อัปโหลด, ดาวน์โหลด, ลบ
 *
 * Dependencies:
 * - TypeOrmModule: ใช้ Attachment + FormRequest repositories
 *   (ใช้ FormRequest เพื่อตรวจสอบสิทธิ์เข้าถึงคำร้อง)
 *
 * Exports:
 * - AttachmentsService: ให้ module อื่นใช้จัดการไฟล์ได้
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Attachment, FormRequest]),
  ],
  controllers: [AttachmentsController],
  providers: [AttachmentsService],
  exports: [AttachmentsService],
})
export class AttachmentsModule {}
