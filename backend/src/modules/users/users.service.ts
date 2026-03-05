import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, Not, IsNull } from 'typeorm';
import { User } from './entities/user.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import { PaginationDto, PaginatedResult } from '../../common/dto/pagination.dto';

/**
 * Users Service
 * จัดการข้อมูลผู้ใช้ — ใช้โดย Admin เป็นหลัก
 *
 * Methods:
 *   findAll()       - ค้นหาผู้ใช้ทั้งหมด (pagination + search)
 *   findOne()       - ดูรายละเอียดผู้ใช้ตาม id
 *   update()        - Admin แก้ไข role, department, employeeId, isActive
 *   toggleActive()  - เปิด/ปิดสถานะใช้งาน
 */
@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  // =============================================
  // ดึงรายชื่อผู้ใช้ทั้งหมด (Pagination + Search)
  // =============================================
  /**
   * ค้นหาผู้ใช้ทั้งหมดพร้อม pagination
   * รองรับ search ตาม: username, fullName, email, employeeId, department
   * @param query - PaginationDto (page, limit, search, sortBy, sortOrder)
   * @returns PaginatedResult<User>
   */
  async findAll(query: PaginationDto): Promise<PaginatedResult<User>> {
    const { page = 1, limit = 10, search, sortBy = 'createdAt', sortOrder = 'DESC' } = query;
    const skip = (page - 1) * limit;

    // สร้าง query builder เพื่อรองรับ search หลาย column
    const qb = this.userRepository.createQueryBuilder('user');

    // ถ้ามีคำค้นหา → ค้นหาจากหลาย column
    if (search) {
      qb.where(
        '(user.username LIKE :search OR user.fullName LIKE :search OR user.email LIKE :search OR user.employeeId LIKE :search OR user.department LIKE :search)',
        { search: `%${search}%` },
      );
    }

    // ตรวจสอบ sortBy ให้ใช้ได้เฉพาะ column ที่อนุญาต (ป้องกัน SQL Injection)
    const allowedSortColumns = [
      'id', 'username', 'fullName', 'email', 'employeeId',
      'role', 'department', 'isActive', 'createdAt', 'updatedAt',
    ];
    const safeSortBy = allowedSortColumns.includes(sortBy) ? sortBy : 'createdAt';
    const safeSortOrder = sortOrder === 'ASC' ? 'ASC' : 'DESC';

    qb.orderBy(`user.${safeSortBy}`, safeSortOrder)
      .skip(skip)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    this.logger.log(`ค้นหาผู้ใช้: พบ ${total} คน (หน้า ${page}/${totalPages})`);

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
  // ดูรายละเอียดผู้ใช้ตาม ID
  // =============================================
  /**
   * ค้นหาผู้ใช้ตาม id พร้อม relation (formRequests count)
   * @param id - User ID
   * @throws NotFoundException ถ้าไม่พบผู้ใช้
   */
  async findOne(id: number): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`ไม่พบผู้ใช้ ID: ${id}`);
    }

    return user;
  }

  // =============================================
  // Admin แก้ไขข้อมูลผู้ใช้
  // =============================================
  /**
   * แก้ไขข้อมูลผู้ใช้ (เฉพาะ Admin)
   * ฟิลด์ที่แก้ได้: role, department, employeeId, isActive
   * @param id - User ID
   * @param updateUserDto - ข้อมูลที่ต้องการแก้ไข
   * @throws NotFoundException ถ้าไม่พบผู้ใช้
   * @throws ConflictException ถ้า employeeId ซ้ำ
   */
  async update(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);

    // ถ้าเปลี่ยน employeeId → ตรวจสอบว่าไม่ซ้ำกับคนอื่น
    if (updateUserDto.employeeId && updateUserDto.employeeId !== user.employeeId) {
      const existingUser = await this.userRepository.findOne({
        where: { employeeId: updateUserDto.employeeId },
      });
      if (existingUser && existingUser.id !== id) {
        throw new ConflictException(
          `รหัสพนักงาน ${updateUserDto.employeeId} ถูกใช้แล้วโดยผู้ใช้อื่น`,
        );
      }
    }

    // merge ข้อมูลใหม่เข้ากับ user เดิม
    Object.assign(user, updateUserDto);

    const updatedUser = await this.userRepository.save(user);
    this.logger.log(`อัปเดตผู้ใช้ ID: ${id} สำเร็จ (role: ${updatedUser.role}, isActive: ${updatedUser.isActive})`);

    return updatedUser;
  }

  // =============================================
  // เปิด/ปิดสถานะใช้งาน (Toggle Active)
  // =============================================
  /**
   * สลับสถานะ isActive (true ↔ false)
   * @param id - User ID
   * @throws NotFoundException ถ้าไม่พบผู้ใช้
   */
  async toggleActive(id: number): Promise<User> {
    const user = await this.findOne(id);
    user.isActive = !user.isActive;

    const updatedUser = await this.userRepository.save(user);
    this.logger.log(
      `สลับสถานะผู้ใช้ ID: ${id} → ${updatedUser.isActive ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}`,
    );

    return updatedUser;
  }

  // =============================================
  // นับจำนวนผู้ใช้ (สำหรับ Dashboard)
  // =============================================
  /**
   * นับจำนวนผู้ใช้แยกตาม role และ active status
   */
  async getStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    admins: number;
    users: number;
  }> {
    const [total, active, inactive, admins, users] = await Promise.all([
      this.userRepository.count(),
      this.userRepository.count({ where: { isActive: true } }),
      this.userRepository.count({ where: { isActive: false } }),
      this.userRepository.count({ where: { role: 'Admin' as any } }),
      this.userRepository.count({ where: { role: 'User' as any } }),
    ]);

    return { total, active, inactive, admins, users };
  }
}
