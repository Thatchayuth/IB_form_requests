import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Custom Decorator: @CurrentUser()
 * ดึงข้อมูลผู้ใช้ปัจจุบันจาก JWT payload ใน request
 *
 * วิธีใช้:
 *   @UseGuards(JwtAuthGuard)
 *   @Get('profile')
 *   getProfile(@CurrentUser() user: any) {
 *     return user; // { id, employeeId, email, role }
 *   }
 *
 *   // ดึงเฉพาะ field ที่ต้องการ
 *   @Get('my-id')
 *   getMyId(@CurrentUser('id') userId: number) {
 *     return userId; // 1
 *   }
 */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    // ถ้าระบุ field → ส่งเฉพาะ field นั้น เช่น @CurrentUser('id')
    if (data) {
      return user?.[data];
    }

    // ถ้าไม่ระบุ → ส่ง user ทั้ง object
    return user;
  },
);
