import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { NotificationType } from '../../common/enums';
import { PaginatedResult } from '../../common/dto/pagination.dto';

/**
 * DTO สำหรับสร้าง Notification (ใช้ภายใน Service เท่านั้น ไม่ต้องทำ validation)
 */
export interface CreateNotificationPayload {
  userId: number;
  formRequestId?: number;
  title: string;
  message: string;
  type: NotificationType;
}

/**
 * Notifications Service
 * จัดการแจ้งเตือนในระบบ (In-App Notifications)
 *
 * Methods:
 *   create()          - สร้างแจ้งเตือนใหม่ (เรียกจาก Service อื่น)
 *   createMany()      - สร้างหลายแจ้งเตือนพร้อมกัน
 *   findByUser()      - ดูแจ้งเตือนของผู้ใช้ (pagination)
 *   getUnreadCount()  - นับแจ้งเตือนที่ยังไม่อ่าน
 *   markAsRead()      - อ่านแจ้งเตือน 1 รายการ
 *   markAllAsRead()   - อ่านทั้งหมด
 *   remove()          - ลบแจ้งเตือน
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
  ) {}

  // =============================================
  // สร้างแจ้งเตือนใหม่ (เรียกจาก Service อื่น)
  // =============================================
  /**
   * สร้างแจ้งเตือน 1 รายการ
   * ใช้ตอน: เปลี่ยนสถานะคำร้อง, อนุมัติ/ปฏิเสธ, ฯลฯ
   */
  async create(payload: CreateNotificationPayload): Promise<Notification> {
    const notification = this.notificationRepository.create({
      userId: payload.userId,
      formRequestId: payload.formRequestId,
      title: payload.title,
      message: payload.message,
      type: payload.type,
    });

    const saved = await this.notificationRepository.save(notification) as Notification;
    this.logger.log(`สร้างแจ้งเตือนให้ User ID: ${payload.userId} — "${payload.title}"`);

    return saved;
  }

  // =============================================
  // สร้างแจ้งเตือนหลายรายการ (เช่น แจ้ง Admin ทุกคน)
  // =============================================
  /**
   * สร้างแจ้งเตือนหลายรายการพร้อมกัน
   * ใช้ตอน: ส่งคำร้อง → แจ้ง Admin ทุกคน
   */
  async createMany(payloads: CreateNotificationPayload[]): Promise<Notification[]> {
    const notifications = payloads.map((p) =>
      this.notificationRepository.create({
        userId: p.userId,
        formRequestId: p.formRequestId,
        title: p.title,
        message: p.message,
        type: p.type,
      }),
    );

    const saved = await this.notificationRepository.save(notifications);
    this.logger.log(`สร้างแจ้งเตือน ${saved.length} รายการ`);

    return saved as Notification[];
  }

  // =============================================
  // ดูแจ้งเตือนของผู้ใช้ (Pagination)
  // =============================================
  /**
   * ดึงแจ้งเตือนของผู้ใช้พร้อม pagination
   * เรียงจากใหม่ → เก่า, แจ้งเตือนที่ยังไม่อ่านขึ้นก่อน
   */
  async findByUser(
    userId: number,
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedResult<Notification>> {
    const skip = (page - 1) * limit;

    const [data, total] = await this.notificationRepository.findAndCount({
      where: { userId },
      relations: ['formRequest'],
      order: {
        isRead: 'ASC',       // ยังไม่อ่านขึ้นก่อน
        createdAt: 'DESC',   // ใหม่ก่อน
      },
      skip,
      take: limit,
    });

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
  // นับแจ้งเตือนที่ยังไม่อ่าน
  // =============================================
  /**
   * นับจำนวนแจ้งเตือนที่ยังไม่อ่านของผู้ใช้
   * ใช้แสดง badge บน notification icon
   */
  async getUnreadCount(userId: number): Promise<{ unreadCount: number }> {
    const unreadCount = await this.notificationRepository.count({
      where: { userId, isRead: false },
    });

    return { unreadCount };
  }

  // =============================================
  // อ่านแจ้งเตือน 1 รายการ
  // =============================================
  /**
   * ทำเครื่องหมายว่าอ่านแล้ว
   * @param id - Notification ID
   * @param userId - ผู้อ่าน (ป้องกันอ่านของคนอื่น)
   */
  async markAsRead(id: number, userId: number): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({
      where: { id, userId },
    });

    if (!notification) {
      throw new NotFoundException(`ไม่พบแจ้งเตือน ID: ${id}`);
    }

    // ถ้าอ่านแล้วก็ return เลย
    if (notification.isRead) {
      return notification;
    }

    notification.isRead = true;
    notification.readAt = new Date();

    return await this.notificationRepository.save(notification) as Notification;
  }

  // =============================================
  // อ่านทั้งหมด (Mark All as Read)
  // =============================================
  /**
   * ทำเครื่องหมายว่าอ่านทั้งหมดของผู้ใช้
   * @param userId - User ID
   * @returns จำนวนที่ถูก update
   */
  async markAllAsRead(userId: number): Promise<{ affected: number }> {
    const result = await this.notificationRepository
      .createQueryBuilder()
      .update(Notification)
      .set({ isRead: true, readAt: new Date() })
      .where('userId = :userId AND isRead = :isRead', {
        userId,
        isRead: false,
      })
      .execute();

    const affected = result.affected || 0;
    this.logger.log(`User ID: ${userId} อ่านแจ้งเตือนทั้งหมด ${affected} รายการ`);

    return { affected };
  }

  // =============================================
  // ลบแจ้งเตือน
  // =============================================
  /**
   * ลบแจ้งเตือน 1 รายการ (เจ้าของแจ้งเตือนเท่านั้น)
   */
  async remove(id: number, userId: number): Promise<{ message: string }> {
    const notification = await this.notificationRepository.findOne({
      where: { id, userId },
    });

    if (!notification) {
      throw new NotFoundException(`ไม่พบแจ้งเตือน ID: ${id}`);
    }

    await this.notificationRepository.remove(notification);

    return { message: `ลบแจ้งเตือน ID: ${id} สำเร็จ` };
  }

  // =============================================
  // ลบแจ้งเตือนที่อ่านแล้วทั้งหมด (Cleanup)
  // =============================================
  /**
   * ลบแจ้งเตือนที่อ่านแล้วทั้งหมดของผู้ใช้
   * @param userId - User ID
   */
  async removeAllRead(userId: number): Promise<{ affected: number }> {
    const result = await this.notificationRepository
      .createQueryBuilder()
      .delete()
      .from(Notification)
      .where('userId = :userId AND isRead = :isRead', {
        userId,
        isRead: true,
      })
      .execute();

    const affected = result.affected || 0;
    this.logger.log(`User ID: ${userId} ลบแจ้งเตือนที่อ่านแล้ว ${affected} รายการ`);

    return { affected };
  }
}
