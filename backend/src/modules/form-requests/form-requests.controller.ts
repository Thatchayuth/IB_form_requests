import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { FormRequestsService } from './form-requests.service';
import { CreateFormRequestDto } from './dto/create-form-request.dto';
import { UpdateFormRequestDto } from './dto/update-form-request.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { QueryFormRequestDto } from './dto/query-form-request.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums';
import { User } from '../users/entities/user.entity';

/**
 * Form Requests Controller
 * จัดการคำร้อง — สร้าง, ดู, แก้ไข, ส่ง, ยกเลิก, เปลี่ยนสถานะ
 *
 * Endpoints (ทุก endpoint ต้อง Login):
 *   POST   /api/form-requests                  - สร้างคำร้องใหม่ (User/Admin)
 *   GET    /api/form-requests                  - รายการคำร้อง (User=ของตัวเอง, Admin=ทั้งหมด)
 *   GET    /api/form-requests/stats            - สถิติคำร้อง
 *   GET    /api/form-requests/:id              - รายละเอียดคำร้อง
 *   PATCH  /api/form-requests/:id              - แก้ไขคำร้อง (เจ้าของ + Draft)
 *   PATCH  /api/form-requests/:id/submit       - ส่งคำร้อง (Draft → Submitted)
 *   PATCH  /api/form-requests/:id/cancel       - ยกเลิกคำร้อง
 *   PATCH  /api/form-requests/:id/status       - Admin เปลี่ยนสถานะ (อนุมัติ/ปฏิเสธ)
 */
@ApiTags('Form Requests')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('form-requests')
export class FormRequestsController {
  constructor(private readonly formRequestsService: FormRequestsService) {}

  // =============================================
  // POST /api/form-requests — สร้างคำร้องใหม่
  // =============================================
  @Post()
  @ApiOperation({ summary: 'สร้างคำร้องใหม่ (Draft)' })
  @ApiResponse({ status: 201, description: 'สร้างคำร้องสำเร็จ' })
  @ApiResponse({ status: 400, description: 'ข้อมูลไม่ถูกต้อง' })
  async create(
    @Body() dto: CreateFormRequestDto,
    @CurrentUser() user: User,
  ) {
    return this.formRequestsService.create(dto, user);
  }

  // =============================================
  // GET /api/form-requests — รายการคำร้อง
  // =============================================
  /**
   * รายการคำร้อง:
   * - User: เห็นเฉพาะของตัวเอง
   * - Admin: เห็นทั้งหมด
   * รองรับ: pagination, search, filter (status, requestType, priority)
   */
  @Get()
  @ApiOperation({ summary: 'รายการคำร้อง (User=ของตัวเอง, Admin=ทั้งหมด)' })
  @ApiResponse({ status: 200, description: 'รายการคำร้องพร้อม pagination' })
  async findAll(
    @Query() query: QueryFormRequestDto,
    @CurrentUser() user: User,
  ) {
    return this.formRequestsService.findAll(query, user);
  }

  // =============================================
  // GET /api/form-requests/stats — สถิติ
  // =============================================
  @Get('stats')
  @ApiOperation({ summary: 'สถิติคำร้องแยกตามสถานะ' })
  @ApiResponse({ status: 200, description: 'จำนวนคำร้องแต่ละสถานะ' })
  async getStats(@CurrentUser() user: User) {
    return this.formRequestsService.getStats(user);
  }

  // =============================================
  // GET /api/form-requests/:id — รายละเอียด
  // =============================================
  @Get(':id')
  @ApiOperation({ summary: 'ดูรายละเอียดคำร้อง' })
  @ApiParam({ name: 'id', description: 'Form Request ID', example: 1 })
  @ApiResponse({ status: 200, description: 'ข้อมูลคำร้องพร้อมไฟล์แนบ' })
  @ApiResponse({ status: 404, description: 'ไม่พบคำร้อง' })
  @ApiResponse({ status: 403, description: 'ไม่มีสิทธิ์ดูคำร้องนี้' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    return this.formRequestsService.findOne(id, user);
  }

  // =============================================
  // PATCH /api/form-requests/:id — แก้ไข
  // =============================================
  /**
   * แก้ไขคำร้อง — เจ้าของ + สถานะ Draft เท่านั้น
   */
  @Patch(':id')
  @ApiOperation({ summary: 'แก้ไขคำร้อง (เจ้าของ + Draft เท่านั้น)' })
  @ApiParam({ name: 'id', description: 'Form Request ID', example: 1 })
  @ApiResponse({ status: 200, description: 'แก้ไขสำเร็จ' })
  @ApiResponse({ status: 400, description: 'สถานะไม่ใช่ Draft' })
  @ApiResponse({ status: 403, description: 'ไม่ใช่เจ้าของคำร้อง' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFormRequestDto,
    @CurrentUser() user: User,
  ) {
    return this.formRequestsService.update(id, dto, user);
  }

  // =============================================
  // PATCH /api/form-requests/:id/submit — ส่งคำร้อง
  // =============================================
  @Patch(':id/submit')
  @ApiOperation({ summary: 'ส่งคำร้อง (Draft → Submitted)' })
  @ApiParam({ name: 'id', description: 'Form Request ID', example: 1 })
  @ApiResponse({ status: 200, description: 'ส่งคำร้องสำเร็จ' })
  @ApiResponse({ status: 400, description: 'สถานะไม่ใช่ Draft' })
  async submit(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    return this.formRequestsService.submit(id, user);
  }

  // =============================================
  // PATCH /api/form-requests/:id/cancel — ยกเลิก
  // =============================================
  @Patch(':id/cancel')
  @ApiOperation({ summary: 'ยกเลิกคำร้อง (Draft/Submitted)' })
  @ApiParam({ name: 'id', description: 'Form Request ID', example: 1 })
  @ApiResponse({ status: 200, description: 'ยกเลิกสำเร็จ' })
  @ApiResponse({ status: 400, description: 'สถานะไม่อนุญาต' })
  async cancel(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    return this.formRequestsService.cancel(id, user);
  }

  // =============================================
  // PATCH /api/form-requests/:id/status — Admin เปลี่ยนสถานะ
  // =============================================
  /**
   * Admin เปลี่ยนสถานะ: อนุมัติ, ปฏิเสธ, รับเรื่อง, เสร็จสิ้น, ยกเลิก
   */
  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Admin เปลี่ยนสถานะคำร้อง (อนุมัติ/ปฏิเสธ)' })
  @ApiParam({ name: 'id', description: 'Form Request ID', example: 1 })
  @ApiResponse({ status: 200, description: 'เปลี่ยนสถานะสำเร็จ' })
  @ApiResponse({ status: 400, description: 'Transition ไม่ถูกต้อง / ปฏิเสธต้องมี remarks' })
  @ApiResponse({ status: 403, description: 'ไม่ใช่ Admin' })
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStatusDto,
    @CurrentUser() admin: User,
  ) {
    return this.formRequestsService.updateStatus(id, dto, admin);
  }
}
