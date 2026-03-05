import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

/**
 * DTO สำหรับ Login
 * POST /api/auth/login
 */
export class LoginDto {
  @ApiProperty({
    description: 'อีเมลผู้ใช้',
    example: 'somchai@example.com',
  })
  @IsNotEmpty({ message: 'กรุณากรอกอีเมล' })
  @IsEmail({}, { message: 'รูปแบบอีเมลไม่ถูกต้อง' })
  email: string;

  @ApiProperty({
    description: 'รหัสผ่าน',
    example: 'Password123!',
  })
  @IsNotEmpty({ message: 'กรุณากรอกรหัสผ่าน' })
  @IsString({ message: 'รหัสผ่านต้องเป็นข้อความ' })
  password: string;
}
