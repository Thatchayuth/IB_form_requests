import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  ParseIntPipe,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { AttachmentsService } from './attachments.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { multerConfig } from '../../config/multer.config';

/**
 * Attachments Controller
 * จัดการไฟล์แนบของคำร้อง — อัปโหลด, ดาวน์โหลด, ลบ
 *
 * Endpoints (ทุก endpoint ต้อง Login):
 *   POST   /api/attachments/upload/:formRequestId   - อัปโหลดไฟล์แนบ (หลายไฟล์)
 *   GET    /api/attachments/form-request/:formRequestId - ดูรายการไฟล์แนบของคำร้อง
 *   GET    /api/attachments/:id/download             - ดาวน์โหลดไฟล์
 *   DELETE /api/attachments/:id                      - ลบไฟล์แนบ
 */
@ApiTags('Attachments')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('attachments')
export class AttachmentsController {
  constructor(private readonly attachmentsService: AttachmentsService) {}

  // =============================================
  // POST /api/attachments/upload/:formRequestId — อัปโหลดไฟล์
  // =============================================
  /**
   * อัปโหลดไฟล์แนบ (รองรับหลายไฟล์พร้อมกัน สูงสุด 5 ไฟล์)
   * รองรับ: รูปภาพ, PDF, Word, Excel, Text, ZIP (ขนาดไม่เกิน 10MB ต่อไฟล์)
   */
  @Post('upload/:formRequestId')
  @UseInterceptors(FilesInterceptor('files', 5, multerConfig)) // สูงสุด 5 ไฟล์
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'อัปโหลดไฟล์แนบ (สูงสุด 5 ไฟล์, 10MB/ไฟล์)' })
  @ApiParam({ name: 'formRequestId', description: 'Form Request ID', example: 1 })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'ไฟล์ที่ต้องการอัปโหลด (สูงสุด 5 ไฟล์)',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'อัปโหลดสำเร็จ' })
  @ApiResponse({ status: 400, description: 'ไฟล์ไม่ถูกต้อง / เกินจำนวน' })
  @ApiResponse({ status: 403, description: 'ไม่ใช่เจ้าของคำร้อง' })
  @ApiResponse({ status: 404, description: 'ไม่พบคำร้อง' })
  async upload(
    @Param('formRequestId', ParseIntPipe) formRequestId: number,
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser() user: User,
  ) {
    return this.attachmentsService.upload(formRequestId, files, user);
  }

  // =============================================
  // GET /api/attachments/form-request/:formRequestId — รายการไฟล์
  // =============================================
  @Get('form-request/:formRequestId')
  @ApiOperation({ summary: 'ดูรายการไฟล์แนบของคำร้อง' })
  @ApiParam({ name: 'formRequestId', description: 'Form Request ID', example: 1 })
  @ApiResponse({ status: 200, description: 'รายการไฟล์แนบ' })
  @ApiResponse({ status: 403, description: 'ไม่มีสิทธิ์เข้าถึงคำร้องนี้' })
  async findByFormRequest(
    @Param('formRequestId', ParseIntPipe) formRequestId: number,
    @CurrentUser() user: User,
  ) {
    return this.attachmentsService.findByFormRequest(formRequestId, user);
  }

  // =============================================
  // GET /api/attachments/:id/download — ดาวน์โหลดไฟล์
  // =============================================
  /**
   * ดาวน์โหลดไฟล์แนบ — stream ไฟล์จาก disk
   * ตั้ง Content-Disposition เพื่อให้บราวเซอร์ดาวน์โหลดด้วยชื่อไฟล์ต้นฉบับ
   */
  @Get(':id/download')
  @ApiOperation({ summary: 'ดาวน์โหลดไฟล์แนบ' })
  @ApiParam({ name: 'id', description: 'Attachment ID', example: 1 })
  @ApiResponse({ status: 200, description: 'ไฟล์ stream' })
  @ApiResponse({ status: 404, description: 'ไม่พบไฟล์' })
  async download(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const attachment = await this.attachmentsService.findOne(id, user);

    // ตรวจสอบว่าไฟล์มีอยู่จริงบน disk
    const absolutePath = path.resolve(attachment.filePath);
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`ไม่พบไฟล์บน disk: ${absolutePath}`);
    }

    // ตั้ง header สำหรับดาวน์โหลด
    // encodeURIComponent รองรับชื่อไฟล์ภาษาไทย
    const encodedFileName = encodeURIComponent(attachment.fileName);
    res.set({
      'Content-Type': attachment.mimeType,
      'Content-Disposition': `attachment; filename*=UTF-8''${encodedFileName}`,
      'Content-Length': attachment.fileSize.toString(),
    });

    // Stream ไฟล์
    const fileStream = fs.createReadStream(absolutePath);
    return new StreamableFile(fileStream);
  }

  // =============================================
  // DELETE /api/attachments/:id — ลบไฟล์
  // =============================================
  @Delete(':id')
  @ApiOperation({ summary: 'ลบไฟล์แนบ (เจ้าของไฟล์ หรือ Admin)' })
  @ApiParam({ name: 'id', description: 'Attachment ID', example: 1 })
  @ApiResponse({ status: 200, description: 'ลบสำเร็จ' })
  @ApiResponse({ status: 403, description: 'ไม่มีสิทธิ์ลบ' })
  @ApiResponse({ status: 404, description: 'ไม่พบไฟล์' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    return this.attachmentsService.remove(id, user);
  }
}
