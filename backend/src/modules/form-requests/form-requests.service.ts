import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FormRequest } from './entities/form-request.entity';
import { CreateFormRequestDto } from './dto/create-form-request.dto';
import { UpdateFormRequestDto } from './dto/update-form-request.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { QueryFormRequestDto } from './dto/query-form-request.dto';
import { PaginatedResult } from '../../common/dto/pagination.dto';
import { FormRequestStatus, UserRole, NotificationType } from '../../common/enums';
import { User } from '../users/entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { UsersService } from '../users/users.service';

/**
 * Form Requests Service
 * จัดการคำร้อง — CRUD + เปลี่ยนสถานะ + แจ้งเตือนอัตโนมัติ
 *
 * Business Rules:
 * - User: สร้าง, แก้ไข (เฉพาะ Draft), ส่ง, ยกเลิก (เฉพาะของตัวเอง)
 * - Admin: ดูทั้งหมด, เปลี่ยนสถานะ (อนุมัติ/ปฏิเสธ/อื่นๆ)
 * - เลขที่คำร้อง: FR-YYYY-NNNN (Auto Generate)
 * - แจ้งเตือนอัตโนมัติเมื่อส่งคำร้อง / เปลี่ยนสถานะ
 */
@Injectable()
export class FormRequestsService {
  private readonly logger = new Logger(FormRequestsService.name);

  constructor(
    @InjectRepository(FormRequest)
    private readonly formRequestRepository: Repository<FormRequest>,
    private readonly notificationsService: NotificationsService,
    private readonly usersService: UsersService,
  ) {}

  // =============================================
  // สร้างคำร้องใหม่
  // =============================================
  /**
   * สร้างคำร้องใหม่ (สถานะเริ่มต้น = Draft)
   * @param dto - ข้อมูลคำร้อง (title, description, requestType, priority, dueDate)
   * @param user - ผู้สร้าง (จาก JWT token)
   */
  async create(dto: CreateFormRequestDto, user: User): Promise<FormRequest> {
    // สร้างเลขที่คำร้องอัตโนมัติ FR-YYYY-NNNN
    const requestNumber = await this.generateRequestNumber();

    const formRequest = this.formRequestRepository.create({
      requestNumber,
      title: dto.title,
      description: dto.description,
      requestType: dto.requestType,
      priority: dto.priority,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      status: FormRequestStatus.DRAFT,
      requesterId: user.id,
    });

    const saved = await this.formRequestRepository.save(formRequest) as FormRequest;
    this.logger.log(`สร้างคำร้อง ${requestNumber} โดย ${user.username} (ID: ${user.id})`);

    return saved;
  }

  // =============================================
  // ดูรายการคำร้อง (Pagination + Filter)
  // =============================================
  /**
   * ค้นหาคำร้อง — User เห็นเฉพาะของตัวเอง, Admin เห็นทั้งหมด
   * รองรับ: pagination, search, filter (status/requestType/priority)
   */
  async findAll(
    query: QueryFormRequestDto,
    user: User,
  ): Promise<PaginatedResult<FormRequest>> {
    const {
      page = 1,
      limit = 10,
      search,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      status,
      requestType,
      priority,
    } = query;
    const skip = (page - 1) * limit;

    const qb = this.formRequestRepository
      .createQueryBuilder('fr')
      .leftJoinAndSelect('fr.requester', 'requester')
      .leftJoinAndSelect('fr.approvedBy', 'approvedBy');

    // User เห็นเฉพาะของตัวเอง, Admin เห็นทั้งหมด
    if (user.role !== UserRole.ADMIN) {
      qb.andWhere('fr.requesterId = :userId', { userId: user.id });
    }

    // ตัวกรอง: สถานะ
    if (status) {
      qb.andWhere('fr.status = :status', { status });
    }

    // ตัวกรอง: ประเภทคำร้อง
    if (requestType) {
      qb.andWhere('fr.requestType = :requestType', { requestType });
    }

    // ตัวกรอง: ลำดับความสำคัญ
    if (priority) {
      qb.andWhere('fr.priority = :priority', { priority });
    }

    // ค้นหาจาก: เลขที่คำร้อง, หัวข้อ, รายละเอียด
    if (search) {
      qb.andWhere(
        '(fr.requestNumber LIKE :search OR fr.title LIKE :search OR fr.description LIKE :search)',
        { search: `%${search}%` },
      );
    }

    // ตรวจสอบ sortBy (ป้องกัน SQL Injection)
    const allowedSortColumns = [
      'id', 'requestNumber', 'title', 'requestType', 'priority',
      'status', 'dueDate', 'createdAt', 'updatedAt',
    ];
    const safeSortBy = allowedSortColumns.includes(sortBy) ? sortBy : 'createdAt';
    const safeSortOrder = sortOrder === 'ASC' ? 'ASC' : 'DESC';

    qb.orderBy(`fr.${safeSortBy}`, safeSortOrder)
      .skip(skip)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  // =============================================
  // ดูรายละเอียดคำร้อง
  // =============================================
  /**
   * ดูรายละเอียดคำร้องตาม ID
   * User เห็นเฉพาะของตัวเอง, Admin เห็นทั้งหมด
   * @throws NotFoundException ถ้าไม่พบคำร้อง
   * @throws ForbiddenException ถ้า User ไม่ใช่เจ้าของ
   */
  async findOne(id: number, user: User): Promise<FormRequest> {
    const formRequest = await this.formRequestRepository.findOne({
      where: { id },
      relations: ['requester', 'approvedBy', 'attachments'],
    });

    if (!formRequest) {
      throw new NotFoundException(`ไม่พบคำร้อง ID: ${id}`);
    }

    // User ดูได้เฉพาะของตัวเอง
    if (user.role !== UserRole.ADMIN && formRequest.requesterId !== user.id) {
      throw new ForbiddenException('ไม่มีสิทธิ์ดูคำร้องนี้');
    }

    return formRequest;
  }

  // =============================================
  // แก้ไขคำร้อง (เจ้าของ + Draft เท่านั้น)
  // =============================================
  /**
   * แก้ไขคำร้อง — ต้องเป็นเจ้าของ + สถานะ Draft เท่านั้น
   * @throws NotFoundException ถ้าไม่พบคำร้อง
   * @throws ForbiddenException ถ้าไม่ใช่เจ้าของ
   * @throws BadRequestException ถ้าสถานะไม่ใช่ Draft
   */
  async update(
    id: number,
    dto: UpdateFormRequestDto,
    user: User,
  ): Promise<FormRequest> {
    const formRequest = await this.findOne(id, user);

    // แก้ไขได้เฉพาะ Draft
    if (formRequest.status !== FormRequestStatus.DRAFT) {
      throw new BadRequestException(
        `ไม่สามารถแก้ไขคำร้องได้ สถานะปัจจุบัน: ${formRequest.status} (แก้ไขได้เฉพาะ Draft)`,
      );
    }

    // merge ข้อมูลใหม่
    if (dto.title !== undefined) formRequest.title = dto.title;
    if (dto.description !== undefined) formRequest.description = dto.description;
    if (dto.requestType !== undefined) formRequest.requestType = dto.requestType;
    if (dto.priority !== undefined) formRequest.priority = dto.priority;
    if (dto.dueDate !== undefined) formRequest.dueDate = new Date(dto.dueDate);

    const updated = await this.formRequestRepository.save(formRequest) as FormRequest;
    this.logger.log(`แก้ไขคำร้อง ${formRequest.requestNumber} โดย ${user.username}`);

    return updated;
  }

  // =============================================
  // ส่งคำร้อง (Draft → Submitted)
  // =============================================
  /**
   * ส่งคำร้อง (เปลี่ยนจาก Draft → Submitted)
   * ต้องเป็นเจ้าของ + สถานะ Draft
   */
  async submit(id: number, user: User): Promise<FormRequest> {
    const formRequest = await this.findOne(id, user);

    if (formRequest.status !== FormRequestStatus.DRAFT) {
      throw new BadRequestException(
        `ไม่สามารถส่งคำร้องได้ สถานะปัจจุบัน: ${formRequest.status} (ส่งได้เฉพาะ Draft)`,
      );
    }

    formRequest.status = FormRequestStatus.SUBMITTED;
    const updated = await this.formRequestRepository.save(formRequest) as FormRequest;
    this.logger.log(`ส่งคำร้อง ${formRequest.requestNumber} โดย ${user.username}`);

    // แจ้งเตือน Admin ทุกคน — มีคำร้องใหม่รอตรวจสอบ
    await this.notifyAdmins(
      formRequest,
      'คำร้องใหม่รอตรวจสอบ',
      `${user.fullName} ส่งคำร้อง ${formRequest.requestNumber}: ${formRequest.title}`,
      NotificationType.ASSIGNMENT,
    );

    return updated;
  }

  // =============================================
  // ยกเลิกคำร้อง (เจ้าของ — Draft/Submitted เท่านั้น)
  // =============================================
  /**
   * ยกเลิกคำร้อง
   * เจ้าของยกเลิกได้เฉพาะ: Draft, Submitted
   */
  async cancel(id: number, user: User): Promise<FormRequest> {
    const formRequest = await this.findOne(id, user);

    const cancellableStatuses = [FormRequestStatus.DRAFT, FormRequestStatus.SUBMITTED];
    if (!cancellableStatuses.includes(formRequest.status)) {
      throw new BadRequestException(
        `ไม่สามารถยกเลิกคำร้องได้ สถานะปัจจุบัน: ${formRequest.status} (ยกเลิกได้เฉพาะ Draft, Submitted)`,
      );
    }

    formRequest.status = FormRequestStatus.CANCELLED;
    const updated = await this.formRequestRepository.save(formRequest) as FormRequest;
    this.logger.log(`ยกเลิกคำร้อง ${formRequest.requestNumber} โดย ${user.username}`);

    return updated;
  }

  // =============================================
  // Admin เปลี่ยนสถานะ (อนุมัติ/ปฏิเสธ/อื่นๆ)
  // =============================================
  /**
   * Admin เปลี่ยนสถานะคำร้อง
   *
   * Transition rules:
   *   Submitted   → UnderReview
   *   UnderReview → Approved / Rejected
   *   Approved    → Completed
   *   ทุกสถานะ    → Cancelled
   *
   * @throws BadRequestException ถ้า transition ไม่ถูกต้อง
   */
  async updateStatus(
    id: number,
    dto: UpdateStatusDto,
    admin: User,
  ): Promise<FormRequest> {
    const formRequest = await this.formRequestRepository.findOne({
      where: { id },
      relations: ['requester'],
    });

    if (!formRequest) {
      throw new NotFoundException(`ไม่พบคำร้อง ID: ${id}`);
    }

    // ตรวจสอบ transition ที่อนุญาต
    this.validateStatusTransition(formRequest.status, dto.status);

    // ถ้าปฏิเสธ ต้องมี remarks
    if (dto.status === FormRequestStatus.REJECTED && !dto.remarks) {
      throw new BadRequestException('กรุณาระบุเหตุผลในการปฏิเสธ (remarks)');
    }

    // อัปเดตสถานะ
    formRequest.status = dto.status;
    formRequest.remarks = dto.remarks || formRequest.remarks;

    // ถ้าอนุมัติหรือปฏิเสธ → บันทึกผู้อนุมัติ + เวลา
    if (
      dto.status === FormRequestStatus.APPROVED ||
      dto.status === FormRequestStatus.REJECTED
    ) {
      formRequest.approvedById = admin.id;
      formRequest.approvedAt = new Date();
    }

    const oldStatus = formRequest.status;
    const updated = await this.formRequestRepository.save(formRequest) as FormRequest;
    this.logger.log(
      `Admin ${admin.username} เปลี่ยนสถานะคำร้อง ${formRequest.requestNumber}: ${oldStatus} → ${dto.status}`,
    );

    // แจ้งเตือนเจ้าของคำร้อง — สถานะเปลี่ยนแล้ว
    await this.notifyRequester(formRequest, dto.status, admin);

    return updated;
  }

  // =============================================
  // สถิติคำร้อง (Dashboard)
  // =============================================
  /**
   * นับจำนวนคำร้องแยกตามสถานะ
   * Admin เห็นทั้งหมด, User เห็นเฉพาะของตัวเอง
   */
  async getStats(user: User): Promise<Record<string, number>> {
    const qb = this.formRequestRepository.createQueryBuilder('fr');

    // User เห็นเฉพาะของตัวเอง
    if (user.role !== UserRole.ADMIN) {
      qb.andWhere('fr.requesterId = :userId', { userId: user.id });
    }

    const result = await qb
      .select('fr.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('fr.status')
      .getRawMany();

    // แปลงเป็น object: { Draft: 5, Submitted: 3, ... }
    const stats: Record<string, number> = { total: 0 };
    for (const row of result) {
      stats[row.status] = parseInt(row.count, 10);
      stats.total += parseInt(row.count, 10);
    }

    return stats;
  }

  // =============================================
  // Private: สร้างเลขที่คำร้อง
  // =============================================
  /**
   * สร้างเลขที่คำร้อง: FR-YYYY-NNNN
   * ดูเลขล่าสุดของปีนั้น แล้ว +1
   */
  private async generateRequestNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `FR-${year}-`;

    // หาเลขล่าสุดของปีนี้
    const lastRequest = await this.formRequestRepository
      .createQueryBuilder('fr')
      .where('fr.requestNumber LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('fr.requestNumber', 'DESC')
      .getOne();

    let nextNumber = 1;
    if (lastRequest) {
      // ดึงเลข 4 หลักสุดท้าย เช่น FR-2026-0005 → 5
      const lastNumber = parseInt(lastRequest.requestNumber.replace(prefix, ''), 10);
      nextNumber = lastNumber + 1;
    }

    // แปลงเป็น 4 หลัก เช่น 1 → 0001
    return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
  }

  // =============================================
  // Private: ตรวจสอบ Status Transition
  // =============================================
  /**
   * ตรวจสอบว่าการเปลี่ยนสถานะถูกต้องตาม workflow
   * @throws BadRequestException ถ้า transition ไม่อนุญาต
   */
  private validateStatusTransition(
    currentStatus: FormRequestStatus,
    newStatus: FormRequestStatus,
  ): void {
    // กำหนด transition ที่อนุญาต
    const allowedTransitions: Record<string, FormRequestStatus[]> = {
      [FormRequestStatus.SUBMITTED]: [
        FormRequestStatus.UNDER_REVIEW,
        FormRequestStatus.CANCELLED,
      ],
      [FormRequestStatus.UNDER_REVIEW]: [
        FormRequestStatus.APPROVED,
        FormRequestStatus.REJECTED,
        FormRequestStatus.CANCELLED,
      ],
      [FormRequestStatus.APPROVED]: [
        FormRequestStatus.COMPLETED,
        FormRequestStatus.CANCELLED,
      ],
      [FormRequestStatus.REJECTED]: [
        FormRequestStatus.CANCELLED,
      ],
    };

    const allowed = allowedTransitions[currentStatus];

    if (!allowed || !allowed.includes(newStatus)) {
      throw new BadRequestException(
        `ไม่สามารถเปลี่ยนสถานะจาก "${currentStatus}" เป็น "${newStatus}" ได้`,
      );
    }
  }

  // =============================================
  // Private: แจ้งเตือน Admin ทุกคน (เมื่อมีคำร้องใหม่)
  // =============================================
  /**
   * ส่งแจ้งเตือนให้ Admin ทุกคน
   * ใช้ตอน: User ส่งคำร้อง → Admin ทุกคนรับแจ้งเตือน
   */
  private async notifyAdmins(
    formRequest: FormRequest,
    title: string,
    message: string,
    type: NotificationType,
  ): Promise<void> {
    try {
      // ดึง Admin ทุกคนจาก PaginatedResult
      const adminResult = await this.usersService.findAll({
        page: 1,
        limit: 100,
        search: undefined,
        sortBy: 'createdAt',
        sortOrder: 'DESC',
      });

      // กรองเฉพาะ Admin ที่ active
      const admins = adminResult.data.filter(
        (u) => u.role === UserRole.ADMIN && u.isActive,
      );

      if (admins.length === 0) return;

      const payloads = admins.map((admin) => ({
        userId: admin.id,
        formRequestId: formRequest.id,
        title,
        message,
        type,
      }));

      await this.notificationsService.createMany(payloads);
    } catch (error) {
      // แจ้งเตือนล้มเหลว → log แต่ไม่ throw (ไม่ให้กระทบ main flow)
      this.logger.error('ส่งแจ้งเตือน Admin ล้มเหลว', error);
    }
  }

  // =============================================
  // Private: แจ้งเตือนเจ้าของคำร้อง (เมื่อ Admin เปลี่ยนสถานะ)
  // =============================================
  /**
   * ส่งแจ้งเตือนเจ้าของคำร้องเมื่อ Admin เปลี่ยนสถานะ
   */
  private async notifyRequester(
    formRequest: FormRequest,
    newStatus: FormRequestStatus,
    admin: User,
  ): Promise<void> {
    try {
      // แปลงสถานะเป็นข้อความภาษาไทย
      const statusText: Record<string, string> = {
        [FormRequestStatus.UNDER_REVIEW]: 'กำลังตรวจสอบ',
        [FormRequestStatus.APPROVED]: 'อนุมัติแล้ว',
        [FormRequestStatus.REJECTED]: 'ถูกปฏิเสธ',
        [FormRequestStatus.COMPLETED]: 'เสร็จสิ้น',
        [FormRequestStatus.CANCELLED]: 'ถูกยกเลิก',
      };

      // เลือกประเภทแจ้งเตือนตามสถานะ
      const typeMap: Record<string, NotificationType> = {
        [FormRequestStatus.APPROVED]: NotificationType.APPROVAL,
        [FormRequestStatus.REJECTED]: NotificationType.REJECTION,
      };

      const text = statusText[newStatus] || newStatus;
      const notifType = typeMap[newStatus] || NotificationType.STATUS_CHANGE;

      await this.notificationsService.create({
        userId: formRequest.requesterId,
        formRequestId: formRequest.id,
        title: `คำร้อง ${formRequest.requestNumber} ${text}`,
        message: `คำร้อง "${formRequest.title}" ได้เปลี่ยนสถานะเป็น "${text}" โดย ${admin.fullName}`,
        type: notifType,
      });
    } catch (error) {
      this.logger.error('ส่งแจ้งเตือนเจ้าของคำร้องล้มเหลว', error);
    }
  }
}
