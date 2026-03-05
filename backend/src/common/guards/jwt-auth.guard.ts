import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

/**
 * JWT Authentication Guard
 * ตรวจสอบว่า request มี JWT token ที่ถูกต้องหรือไม่
 *
 * วิธีใช้:
 *   @UseGuards(JwtAuthGuard)
 *   @Get('profile')
 *   getProfile() { ... }
 *
 * ทำงานร่วมกับ JwtStrategy (จะสร้างใน Step 5)
 * - ถ้า token ถูกต้อง → req.user จะมีข้อมูลผู้ใช้
 * - ถ้า token ไม่ถูกต้อง/หมดอายุ → ส่ง 401 Unauthorized
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    return super.canActivate(context);
  }
}
