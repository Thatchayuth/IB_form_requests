import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../enums';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Roles Guard - ตรวจสอบบทบาทผู้ใช้
 * ใช้ร่วมกับ @Roles() decorator และ JwtAuthGuard
 *
 * วิธีใช้:
 *   @UseGuards(JwtAuthGuard, RolesGuard)
 *   @Roles(UserRole.ADMIN)
 *   @Get('admin-only')
 *   adminOnly() { ... }
 *
 * การทำงาน:
 * 1. ถ้าไม่มี @Roles() → อนุญาตทุก role (เฉพาะตรวจ JWT)
 * 2. ถ้ามี @Roles() → ตรวจสอบว่า user.role อยู่ใน role ที่กำหนด
 * 3. ถ้า role ไม่ตรง → ส่ง 403 Forbidden
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // ดึง roles ที่กำหนดไว้ใน @Roles() decorator
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // ถ้าไม่ได้กำหนด role → อนุญาตทุกคน (ที่มี JWT ถูกต้อง)
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // ดึงข้อมูล user จาก request (ถูกใส่โดย JwtAuthGuard)
    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      throw new ForbiddenException('ไม่พบข้อมูลผู้ใช้');
    }

    // ตรวจสอบว่า role ของ user ตรงกับที่กำหนดหรือไม่
    const hasRole = requiredRoles.includes(user.role);

    if (!hasRole) {
      throw new ForbiddenException(
        `ไม่มีสิทธิ์เข้าถึง ต้องเป็น: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}
