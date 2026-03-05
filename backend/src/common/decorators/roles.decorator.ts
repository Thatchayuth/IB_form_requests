import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../enums';

/**
 * Key สำหรับเก็บ metadata ของ roles
 * ใช้ร่วมกับ RolesGuard ในการอ่านค่า
 */
export const ROLES_KEY = 'roles';

/**
 * Custom Decorator: @Roles()
 * กำหนดบทบาทที่อนุญาตให้เข้าถึง endpoint
 *
 * วิธีใช้:
 *   @UseGuards(JwtAuthGuard, RolesGuard)
 *   @Roles(UserRole.ADMIN)
 *   @Delete(':id')
 *   deleteUser() { ... }
 *
 *   // อนุญาตหลาย role
 *   @Roles(UserRole.ADMIN, UserRole.USER)
 *   @Get('shared')
 *   sharedEndpoint() { ... }
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
