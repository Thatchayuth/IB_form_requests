import { Controller, Post, Get, Body, UseGuards, HttpCode, HttpStatus, Req } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { AdLoginDto } from './dto/ad-login.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

/**
 * Auth Controller
 * จัดการ Authentication ผ่าน Active Directory + JWT
 *
 * Endpoints:
 *   POST /api/auth/login     - เข้าสู่ระบบผ่าน AD (username + password)
 *   GET  /api/auth/profile   - ดูข้อมูลส่วนตัว (ต้องมี JWT token)
 */
@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /api/auth/login
   * เข้าสู่ระบบด้วย AD username + password
   * → ส่ง Basic Auth ไปยัง AD API → ได้ข้อมูลผู้ใช้ → Insert/Update ในระบบ → สร้าง JWT
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'เข้าสู่ระบบผ่าน Active Directory' })
  @ApiResponse({ status: 200, description: 'เข้าสู่ระบบสำเร็จ ได้รับ JWT token' })
  @ApiResponse({ status: 401, description: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' })
  @ApiResponse({ status: 500, description: 'ไม่สามารถเชื่อมต่อ AD ได้' })
  async login(@Body() adLoginDto: AdLoginDto, @Req() req: Request) {
    // ─── ดึง client IP สำหรับ audit log ──────────────────
    const clientIp =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.ip ||
      'unknown';
    return this.authService.login(adLoginDto, clientIp);
  }

  /**
   * GET /api/auth/profile
   * ดูข้อมูลผู้ใช้ปัจจุบัน (ต้อง Login แล้ว)
   */
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'ดูข้อมูลส่วนตัว (ต้อง Login)' })
  @ApiResponse({ status: 200, description: 'ข้อมูลผู้ใช้ปัจจุบัน' })
  @ApiResponse({ status: 401, description: 'ไม่ได้ Login หรือ token หมดอายุ' })
  async getProfile(@CurrentUser() user: User) {
    return this.authService.getProfile(user.id);
  }
}
