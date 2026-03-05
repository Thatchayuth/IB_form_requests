import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsEnum,
  MaxLength,
  IsDateString,
} from 'class-validator';
import { Priority, RequestType } from '../../../common/enums';

/**
 * DTO สำหรับแก้ไขคำร้อง (เจ้าของคำร้อง)
 *
 * ฟิลด์ที่แก้ได้: title, description, requestType, priority, dueDate
 *
 * หมายเหตุ:
 * - แก้ไขได้เฉพาะตอนสถานะเป็น Draft เท่านั้น
 * - ผู้แก้ไขต้องเป็นเจ้าของคำร้อง (requesterId)
 */
export class UpdateFormRequestDto {
  @ApiPropertyOptional({
    description: 'หัวข้อคำร้อง',
    example: 'ขอซื้ออุปกรณ์สำนักงาน (แก้ไข)',
    maxLength: 300,
  })
  @IsOptional()
  @IsString({ message: 'title ต้องเป็นข้อความ' })
  @MaxLength(300, { message: 'หัวข้อคำร้องต้องไม่เกิน 300 ตัวอักษร' })
  title?: string;

  @ApiPropertyOptional({
    description: 'รายละเอียดคำร้อง',
    example: 'ขอซื้อกระดาษ A4 จำนวน 20 รีม (เพิ่มจำนวน)',
  })
  @IsOptional()
  @IsString({ message: 'description ต้องเป็นข้อความ' })
  description?: string;

  @ApiPropertyOptional({
    description: 'ประเภทคำร้อง',
    enum: RequestType,
    example: RequestType.PURCHASE,
  })
  @IsOptional()
  @IsEnum(RequestType, { message: 'requestType ต้องเป็นค่าที่กำหนด' })
  requestType?: RequestType;

  @ApiPropertyOptional({
    description: 'ลำดับความสำคัญ',
    enum: Priority,
    example: Priority.HIGH,
  })
  @IsOptional()
  @IsEnum(Priority, { message: 'priority ต้องเป็น Low, Medium, High หรือ Urgent' })
  priority?: Priority;

  @ApiPropertyOptional({
    description: 'วันครบกำหนด (YYYY-MM-DD)',
    example: '2026-04-15',
  })
  @IsOptional()
  @IsDateString({}, { message: 'dueDate ต้องเป็นรูปแบบวันที่ที่ถูกต้อง (YYYY-MM-DD)' })
  dueDate?: string;
}
