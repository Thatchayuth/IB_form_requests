import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { Attachment } from './entities/attachment.entity';
import { FormRequest } from '../form-requests/entities/form-request.entity';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../../common/enums';

/**
 * Attachments Service
 * จัดการไฟล์แนบของคำร้อง — อัปโหลด, ดาวน์โหลด, ลบ
 *
 * Business Rules:
 * - อัปโหลดได้เฉพาะเจ้าของคำร้องเท่านั้น
 * - ดาวน์โหลดได้: เจ้าของคำร้อง + Admin
 * - ลบได้: เจ้าของไฟล์ + Admin (เฉพาะสถานะ Draft)
 * - Multer config อยู่ที่ src/config/multer.config.ts
 */
@Injectable()
export class AttachmentsService {
  private readonly logger = new Logger(AttachmentsService.name);

  constructor(
    @InjectRepository(Attachment)
    private readonly attachmentRepository: Repository<Attachment>,

    @InjectRepository(FormRequest)
    private readonly formRequestRepository: Repository<FormRequest>,
  ) {}

  // =============================================
  // อัปโหลดไฟล์แนบ (หลายไฟล์)
  // =============================================
  /**
   * บันทึกข้อมูลไฟล์แนบลง DB หลังจาก Multer เก็บไฟล์แล้ว
   * @param formRequestId - รหัสคำร้องที่ต้องการแนบไฟล์
   * @param files - ไฟล์จาก Multer (Express.Multer.File[])
   * @param user - ผู้อัปโหลด (จาก JWT)
   * @throws NotFoundException ถ้าไม่พบคำร้อง
   * @throws ForbiddenException ถ้าไม่ใช่เจ้าของคำร้อง
   */
  async upload(
    formRequestId: number,
    files: Express.Multer.File[],
    user: User,
  ): Promise<Attachment[]> {
    // ตรวจสอบว่าคำร้องมีอยู่จริง
    const formRequest = await this.formRequestRepository.findOne({
      where: { id: formRequestId },
    });

    if (!formRequest) {
      // ลบไฟล์ที่ Multer เก็บไว้แล้ว (เพราะคำร้องไม่มี)
      this.removePhysicalFiles(files);
      throw new NotFoundException(`ไม่พบคำร้อง ID: ${formRequestId}`);
    }

    // ตรวจสอบสิทธิ์: ต้องเป็นเจ้าของคำร้อง หรือ Admin
    if (user.role !== UserRole.ADMIN && formRequest.requesterId !== user.id) {
      this.removePhysicalFiles(files);
      throw new ForbiddenException('ไม่มีสิทธิ์อัปโหลดไฟล์ในคำร้องนี้');
    }

    // สร้าง Attachment records
    const attachments = files.map((file) =>
      this.attachmentRepository.create({
        formRequestId,
        fileName: file.originalname,
        storedFileName: file.filename,
        filePath: file.path,
        fileSize: file.size,
        mimeType: file.mimetype,
        uploadedById: user.id,
      }),
    );

    const saved = await this.attachmentRepository.save(attachments);
    this.logger.log(
      `อัปโหลด ${files.length} ไฟล์ในคำร้อง ID: ${formRequestId} โดย ${user.username}`,
    );

    return saved as Attachment[];
  }

  // =============================================
  // ดูรายการไฟล์แนบของคำร้อง
  // =============================================
  /**
   * ดึงรายการไฟล์แนบทั้งหมดของคำร้อง
   * @param formRequestId - รหัสคำร้อง
   * @param user - ผู้เรียก (ตรวจสอบสิทธิ์)
   */
  async findByFormRequest(
    formRequestId: number,
    user: User,
  ): Promise<Attachment[]> {
    // ตรวจสอบสิทธิ์ก่อน
    await this.checkFormRequestAccess(formRequestId, user);

    return this.attachmentRepository.find({
      where: { formRequestId },
      relations: ['uploadedBy'],
      order: { createdAt: 'DESC' },
    });
  }

  // =============================================
  // ดูรายละเอียดไฟล์แนบ (สำหรับดาวน์โหลด)
  // =============================================
  /**
   * ดึงข้อมูลไฟล์แนบตาม ID (ใช้สำหรับ stream/download)
   * @param id - Attachment ID
   * @param user - ผู้เรียก (ตรวจสอบสิทธิ์)
   * @throws NotFoundException ถ้าไม่พบไฟล์
   */
  async findOne(id: number, user: User): Promise<Attachment> {
    const attachment = await this.attachmentRepository.findOne({
      where: { id },
      relations: ['formRequest'],
    });

    if (!attachment) {
      throw new NotFoundException(`ไม่พบไฟล์แนบ ID: ${id}`);
    }

    // ตรวจสอบสิทธิ์: เจ้าของคำร้อง หรือ Admin
    await this.checkFormRequestAccess(attachment.formRequestId, user);

    return attachment;
  }

  // =============================================
  // ลบไฟล์แนบ
  // =============================================
  /**
   * ลบไฟล์แนบ (DB + ไฟล์จริง)
   * ลบได้: เจ้าของไฟล์ หรือ Admin
   * @param id - Attachment ID
   * @param user - ผู้ลบ (ตรวจสอบสิทธิ์)
   */
  async remove(id: number, user: User): Promise<{ message: string }> {
    const attachment = await this.attachmentRepository.findOne({
      where: { id },
    });

    if (!attachment) {
      throw new NotFoundException(`ไม่พบไฟล์แนบ ID: ${id}`);
    }

    // ตรวจสอบสิทธิ์: เจ้าของไฟล์ หรือ Admin
    if (user.role !== UserRole.ADMIN && attachment.uploadedById !== user.id) {
      throw new ForbiddenException('ไม่มีสิทธิ์ลบไฟล์นี้');
    }

    // ลบไฟล์จริงบน disk
    this.removePhysicalFile(attachment.filePath);

    // ลบ record จาก DB
    await this.attachmentRepository.remove(attachment);
    this.logger.log(
      `ลบไฟล์ "${attachment.fileName}" (ID: ${id}) โดย ${user.username}`,
    );

    return { message: `ลบไฟล์ "${attachment.fileName}" สำเร็จ` };
  }

  // =============================================
  // Private: ตรวจสอบสิทธิ์เข้าถึงคำร้อง
  // =============================================
  /**
   * ตรวจสอบว่าผู้ใช้มีสิทธิ์เข้าถึงคำร้องหรือไม่
   */
  private async checkFormRequestAccess(
    formRequestId: number,
    user: User,
  ): Promise<void> {
    const formRequest = await this.formRequestRepository.findOne({
      where: { id: formRequestId },
    });

    if (!formRequest) {
      throw new NotFoundException(`ไม่พบคำร้อง ID: ${formRequestId}`);
    }

    if (user.role !== UserRole.ADMIN && formRequest.requesterId !== user.id) {
      throw new ForbiddenException('ไม่มีสิทธิ์เข้าถึงคำร้องนี้');
    }
  }

  // =============================================
  // Private: ลบไฟล์จริงบน disk
  // =============================================
  /**
   * ลบไฟล์จริง — ถ้าไม่พบไฟล์จะ log warning แต่ไม่ throw error
   */
  private removePhysicalFile(filePath: string): void {
    try {
      const absolutePath = path.resolve(filePath);
      if (fs.existsSync(absolutePath)) {
        fs.unlinkSync(absolutePath);
        this.logger.log(`ลบไฟล์: ${absolutePath}`);
      } else {
        this.logger.warn(`ไม่พบไฟล์บน disk: ${absolutePath}`);
      }
    } catch (error) {
      this.logger.error(`ลบไฟล์ล้มเหลว: ${filePath}`, error);
    }
  }

  /**
   * ลบไฟล์หลายไฟล์ (เมื่อ upload ล้มเหลว → cleanup)
   */
  private removePhysicalFiles(files: Express.Multer.File[]): void {
    for (const file of files) {
      this.removePhysicalFile(file.path);
    }
  }
}
