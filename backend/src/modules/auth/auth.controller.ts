import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { AdLoginDto } from './dto/ad-login.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from './strategies/jwt.strategy';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /api/auth/login
   * ?force=true → บังคับ logout เครื่องอื่นแล้ว login ใหม่
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'เข้าสู่ระบบผ่าน Active Directory' })
  @ApiQuery({
    name: 'force',
    required: false,
    type: Boolean,
    description: 'บังคับ logout จากอุปกรณ์อื่นแล้ว login ใหม่',
  })
  @ApiResponse({ status: 200, description: 'เข้าสู่ระบบสำเร็จ' })
  @ApiResponse({ status: 401, description: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' })
  @ApiResponse({ status: 409, description: 'มี session อยู่แล้วจากอุปกรณ์อื่น' })
  async login(
    @Body() adLoginDto: AdLoginDto,
    @Req() req: Request,
    @Query('force') force?: string,
  ) {
    const clientIp =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.ip ||
      'unknown';
    const userAgent = req.headers['user-agent'] || '';
    const forceLogin = force === 'true';

    return this.authService.login(adLoginDto, clientIp, userAgent, forceLogin);
  }

  /**
   * POST /api/auth/logout
   * ลบ session token ใน DB
   */
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'ออกจากระบบ' })
  @ApiResponse({ status: 200, description: 'ออกจากระบบสำเร็จ' })
  async logout(@CurrentUser() user: JwtPayload) {
    await this.authService.logout(user.sub);
    return { message: 'ออกจากระบบสำเร็จ' };
  }

  /**
   * GET /api/auth/profile
   */
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'ดูข้อมูลส่วนตัว (ต้อง Login)' })
  @ApiResponse({ status: 200, description: 'ข้อมูลผู้ใช้ปัจจุบัน' })
  async getProfile(@CurrentUser() user: JwtPayload) {
    return this.authService.getProfile(user.sub);
  }
}
