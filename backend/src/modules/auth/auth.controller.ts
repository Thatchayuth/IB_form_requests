import { Controller, Post, Get, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

/**
 * Auth Controller
 * จัดการ Authentication: Login, Register, Profile
 *
 * Endpoints:
 *   POST /api/auth/login     - เข้าสู่ระบบ
 *   POST /api/auth/register  - สมัครสมาชิก
 *   GET  /api/auth/profile   - ดูข้อมูลส่วนตัว (ต้อง Login)
 */
@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /api/auth/login
   * เข้าสู่ระบบด้วยอีเมลและรหัสผ่าน
   */
  @Post('login')
  @HttpCode(HttpStatus.OK) // ส่ง 200 แทน 201
  @ApiOperation({ summary: 'เข้าสู่ระบบ' })
  @ApiResponse({ status: 200, description: 'เข้าสู่ระบบสำเร็จ ได้รับ JWT token' })
  @ApiResponse({ status: 401, description: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  /**
   * POST /api/auth/register
   * สมัครสมาชิกใหม่
   */
  @Post('register')
  @ApiOperation({ summary: 'สมัครสมาชิก' })
  @ApiResponse({ status: 201, description: 'สมัครสมาชิกสำเร็จ ได้รับ JWT token' })
  @ApiResponse({ status: 409, description: 'อีเมลหรือรหัสพนักงานซ้ำ' })
  @ApiResponse({ status: 400, description: 'ข้อมูลไม่ถูกต้อง' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
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
