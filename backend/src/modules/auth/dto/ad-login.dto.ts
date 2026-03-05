import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

/**
 * DTO สำหรับ AD Login
 * POST /api/auth/login
 *
 * ส่ง username + password ไปตรวจสอบกับ Active Directory API
 */
export class AdLoginDto {
  @ApiProperty({
    description: 'ชื่อผู้ใช้ AD (Active Directory username)',
    example: 'thatchayuth',
  })
  @IsNotEmpty({ message: 'กรุณากรอกชื่อผู้ใช้' })
  @IsString({ message: 'ชื่อผู้ใช้ต้องเป็นข้อความ' })
  username: string;

  @ApiProperty({
    description: 'รหัสผ่าน AD',
    example: 'mypassword',
  })
  @IsNotEmpty({ message: 'กรุณากรอกรหัสผ่าน' })
  @IsString({ message: 'รหัสผ่านต้องเป็นข้อความ' })
  password: string;
}
