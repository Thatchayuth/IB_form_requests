import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsEnum, IsOptional, IsString } from 'class-validator';
import { FormRequestStatus } from '../../../common/enums';

/**
 * DTO สำหรับ Admin เปลี่ยนสถานะคำร้อง (อนุมัติ / ปฏิเสธ / เปลี่ยนสถานะอื่น)
 *
 * สถานะที่ Admin เปลี่ยนได้:
 * - Submitted → UnderReview (รับเรื่องแล้ว)
 * - UnderReview → Approved / Rejected
 * - Approved → Completed
 * - ทุกสถานะ → Cancelled (ยกเลิก)
 *
 * หมายเหตุ: remarks จะเก็บเหตุผลการอนุมัติ/ปฏิเสธ
 */
export class UpdateStatusDto {
  @ApiProperty({
    description: 'สถานะใหม่',
    enum: FormRequestStatus,
    example: FormRequestStatus.APPROVED,
  })
  @IsNotEmpty({ message: 'กรุณาระบุสถานะ' })
  @IsEnum(FormRequestStatus, { message: 'status ต้องเป็นค่าที่กำหนด' })
  status: FormRequestStatus;

  @ApiPropertyOptional({
    description: 'หมายเหตุจากผู้อนุมัติ (จำเป็นเมื่อปฏิเสธ)',
    example: 'อนุมัติเรียบร้อย งบประมาณเพียงพอ',
  })
  @IsOptional()
  @IsString({ message: 'remarks ต้องเป็นข้อความ' })
  remarks?: string;
}
