import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums';

/**
 * Users Controller (Admin Only)
 * จัดการผู้ใช้งานระบบ — เฉพาะ Admin เท่านั้น
 *
 * Endpoints:
 *   GET    /api/users           - ดูรายชื่อผู้ใช้ทั้งหมด (pagination + search)
 *   GET    /api/users/stats     - สถิติผู้ใช้ (สำหรับ Dashboard)
 *   GET    /api/users/:id       - ดูรายละเอียดผู้ใช้
 *   PATCH  /api/users/:id       - แก้ไขข้อมูลผู้ใช้ (role, department, employeeId, isActive)
 *   PATCH  /api/users/:id/toggle-active - เปิด/ปิดสถานะใช้งาน
 *
 * Guards:
 *   - JwtAuthGuard: ต้อง Login (มี JWT token)
 *   - RolesGuard + @Roles(Admin): เฉพาะ Admin
 */
@ApiTags('Users (Admin)')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // =============================================
  // GET /api/users — ดูรายชื่อผู้ใช้ทั้งหมด
  // =============================================
  /**
   * ดึงรายชื่อผู้ใช้ทั้งหมด (Admin Only)
   * รองรับ pagination, search, sort
   *
   * @example GET /api/users?page=1&limit=10&search=thatchayuth&sortBy=createdAt&sortOrder=DESC
   */
  @Get()
  @ApiOperation({ summary: 'ดูรายชื่อผู้ใช้ทั้งหมด (Admin)' })
  @ApiResponse({ status: 200, description: 'รายชื่อผู้ใช้พร้อม pagination' })
  @ApiResponse({ status: 401, description: 'ไม่ได้ Login' })
  @ApiResponse({ status: 403, description: 'ไม่มีสิทธิ์ (ต้องเป็น Admin)' })
  async findAll(@Query() query: PaginationDto) {
    return this.usersService.findAll(query);
  }

  // =============================================
  // GET /api/users/stats — สถิติผู้ใช้
  // =============================================
  /**
   * สถิติผู้ใช้สำหรับ Dashboard (Admin Only)
   * returns: { total, active, inactive, admins, users }
   */
  @Get('stats')
  @ApiOperation({ summary: 'สถิติผู้ใช้ (Admin Dashboard)' })
  @ApiResponse({ status: 200, description: 'จำนวนผู้ใช้แยกตาม role/status' })
  async getStats() {
    return this.usersService.getStats();
  }

  // =============================================
  // GET /api/users/:id — ดูรายละเอียดผู้ใช้
  // =============================================
  /**
   * ดูรายละเอียดผู้ใช้ตาม ID (Admin Only)
   */
  @Get(':id')
  @ApiOperation({ summary: 'ดูรายละเอียดผู้ใช้ตาม ID (Admin)' })
  @ApiParam({ name: 'id', description: 'User ID', example: 1 })
  @ApiResponse({ status: 200, description: 'ข้อมูลผู้ใช้' })
  @ApiResponse({ status: 404, description: 'ไม่พบผู้ใช้' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  // =============================================
  // PATCH /api/users/:id — แก้ไขข้อมูลผู้ใช้
  // =============================================
  /**
   * Admin แก้ไขข้อมูลผู้ใช้
   * แก้ได้: role, department, employeeId, isActive
   */
  @Patch(':id')
  @ApiOperation({ summary: 'แก้ไขข้อมูลผู้ใช้ (Admin)' })
  @ApiParam({ name: 'id', description: 'User ID', example: 1 })
  @ApiResponse({ status: 200, description: 'แก้ไขสำเร็จ' })
  @ApiResponse({ status: 404, description: 'ไม่พบผู้ใช้' })
  @ApiResponse({ status: 409, description: 'รหัสพนักงานซ้ำ' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(id, updateUserDto);
  }

  // =============================================
  // PATCH /api/users/:id/toggle-active — เปิด/ปิดสถานะ
  // =============================================
  /**
   * สลับสถานะ active ↔ inactive (Admin Only)
   */
  @Patch(':id/toggle-active')
  @ApiOperation({ summary: 'เปิด/ปิดสถานะผู้ใช้ (Admin)' })
  @ApiParam({ name: 'id', description: 'User ID', example: 1 })
  @ApiResponse({ status: 200, description: 'สลับสถานะสำเร็จ' })
  @ApiResponse({ status: 404, description: 'ไม่พบผู้ใช้' })
  async toggleActive(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.toggleActive(id);
  }
}
