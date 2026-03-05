import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';

/**
 * DTO สำหรับ Register (สมัครสมาชิก)
 * POST /api/auth/register
 */
export class RegisterDto {
  @ApiProperty({
    description: 'รหัสพนักงาน',
    example: 'EMP001',
  })
  @IsNotEmpty({ message: 'กรุณากรอกรหัสพนักงาน' })
  @IsString({ message: 'รหัสพนักงานต้องเป็นข้อความ' })
  @MaxLength(50, { message: 'รหัสพนักงานต้องไม่เกิน 50 ตัวอักษร' })
  employeeId: string;

  @ApiProperty({
    description: 'ชื่อ-นามสกุล',
    example: 'สมชาย ใจดี',
  })
  @IsNotEmpty({ message: 'กรุณากรอกชื่อ-นามสกุล' })
  @IsString({ message: 'ชื่อ-นามสกุลต้องเป็นข้อความ' })
  @MaxLength(200, { message: 'ชื่อ-นามสกุลต้องไม่เกิน 200 ตัวอักษร' })
  fullName: string;

  @ApiProperty({
    description: 'อีเมล',
    example: 'somchai@example.com',
  })
  @IsNotEmpty({ message: 'กรุณากรอกอีเมล' })
  @IsEmail({}, { message: 'รูปแบบอีเมลไม่ถูกต้อง' })
  email: string;

  @ApiProperty({
    description: 'รหัสผ่าน (อย่างน้อย 6 ตัวอักษร)',
    example: 'Password123!',
  })
  @IsNotEmpty({ message: 'กรุณากรอกรหัสผ่าน' })
  @IsString({ message: 'รหัสผ่านต้องเป็นข้อความ' })
  @MinLength(6, { message: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' })
  @MaxLength(100, { message: 'รหัสผ่านต้องไม่เกิน 100 ตัวอักษร' })
  @Matches(/^(?=.*[a-zA-Z])(?=.*\d)/, {
    message: 'รหัสผ่านต้องมีตัวอักษรและตัวเลขอย่างน้อยอย่างละ 1 ตัว',
  })
  password: string;

  @ApiPropertyOptional({
    description: 'แผนก/ฝ่าย',
    example: 'ฝ่ายบัญชี',
  })
  @IsOptional()
  @IsString({ message: 'แผนกต้องเป็นข้อความ' })
  @MaxLength(200, { message: 'ชื่อแผนกต้องไม่เกิน 200 ตัวอักษร' })
  department?: string;
}
