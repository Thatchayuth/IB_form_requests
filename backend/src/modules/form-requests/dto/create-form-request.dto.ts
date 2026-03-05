import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsOptional,
  MaxLength,
  IsDateString,
} from 'class-validator';
import { Priority, RequestType } from '../../../common/enums';

/**
 * DTO สำหรับสร้างคำร้องใหม่
 *
 * ฟิลด์ที่ต้องกรอก: title, description
 * ฟิลด์เสริม: requestType, priority, dueDate
 *
 * หมายเหตุ:
 * - requestNumber จะถูกสร้างอัตโนมัติ (FR-YYYY-NNNN)
 * - requesterId จะดึงจาก JWT token (@CurrentUser)
 * - status เริ่มต้นเป็น Draft เสมอ
 */
export class CreateFormRequestDto {
  @ApiProperty({
    description: 'หัวข้อคำร้อง',
    example: 'ขอซื้ออุปกรณ์สำนักงาน',
    maxLength: 300,
  })
  @IsNotEmpty({ message: 'กรุณาระบุหัวข้อคำร้อง' })
  @IsString({ message: 'title ต้องเป็นข้อความ' })
  @MaxLength(300, { message: 'หัวข้อคำร้องต้องไม่เกิน 300 ตัวอักษร' })
  title: string;

  @ApiProperty({
    description: 'รายละเอียดคำร้อง',
    example: 'ขอซื้อกระดาษ A4 จำนวน 10 รีม, ปากกา 20 ด้าม สำหรับฝ่ายบัญชี',
  })
  @IsNotEmpty({ message: 'กรุณาระบุรายละเอียดคำร้อง' })
  @IsString({ message: 'description ต้องเป็นข้อความ' })
  description: string;

  @ApiPropertyOptional({
    description: 'ประเภทคำร้อง',
    enum: RequestType,
    default: RequestType.GENERAL,
    example: RequestType.PURCHASE,
  })
  @IsOptional()
  @IsEnum(RequestType, { message: 'requestType ต้องเป็นค่าที่กำหนด' })
  requestType?: RequestType;

  @ApiPropertyOptional({
    description: 'ลำดับความสำคัญ',
    enum: Priority,
    default: Priority.MEDIUM,
    example: Priority.MEDIUM,
  })
  @IsOptional()
  @IsEnum(Priority, { message: 'priority ต้องเป็น Low, Medium, High หรือ Urgent' })
  priority?: Priority;

  @ApiPropertyOptional({
    description: 'วันครบกำหนด (YYYY-MM-DD)',
    example: '2026-04-01',
  })
  @IsOptional()
  @IsDateString({}, { message: 'dueDate ต้องเป็นรูปแบบวันที่ที่ถูกต้อง (YYYY-MM-DD)' })
  dueDate?: string;
}
