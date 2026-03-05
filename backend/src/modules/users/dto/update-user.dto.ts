import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsEnum,
  IsBoolean,
  MaxLength,
} from 'class-validator';
import { UserRole } from '../../../common/enums';

/**
 * DTO สำหรับ Admin แก้ไขข้อมูลผู้ใช้
 *
 * ฟิลด์ที่ Admin แก้ไขได้:
 * - role: เปลี่ยนบทบาท (User ↔ Admin)
 * - department: กำหนดแผนก
 * - employeeId: กำหนดรหัสพนักงาน
 * - isActive: เปิด/ปิดการใช้งานบัญชี
 *
 * หมายเหตุ: username, fullName, email, adGroups จะ update จาก AD อัตโนมัติตอน login เท่านั้น
 */
export class UpdateUserDto {
  @ApiPropertyOptional({
    description: 'บทบาทผู้ใช้',
    enum: UserRole,
    example: UserRole.ADMIN,
  })
  @IsOptional()
  @IsEnum(UserRole, { message: 'role ต้องเป็น User หรือ Admin' })
  role?: UserRole;

  @ApiPropertyOptional({
    description: 'แผนก/ฝ่าย',
    example: 'ฝ่ายบัญชี',
  })
  @IsOptional()
  @IsString({ message: 'department ต้องเป็นข้อความ' })
  @MaxLength(200, { message: 'department ต้องไม่เกิน 200 ตัวอักษร' })
  department?: string;

  @ApiPropertyOptional({
    description: 'รหัสพนักงาน',
    example: 'EMP001',
  })
  @IsOptional()
  @IsString({ message: 'employeeId ต้องเป็นข้อความ' })
  @MaxLength(50, { message: 'employeeId ต้องไม่เกิน 50 ตัวอักษร' })
  employeeId?: string;

  @ApiPropertyOptional({
    description: 'สถานะใช้งาน (true = เปิด, false = ปิด)',
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'isActive ต้องเป็น true หรือ false' })
  isActive?: boolean;
}
