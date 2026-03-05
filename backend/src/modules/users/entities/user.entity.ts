import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../../common/enums';
import { FormRequest } from '../../form-requests/entities/form-request.entity';
import { Notification } from '../../notifications/entities/notification.entity';

/**
 * Entity: Users
 * ตารางเก็บข้อมูลผู้ใช้งานระบบ (ข้อมูลจาก Active Directory + ข้อมูลในระบบ)
 *
 * ความสัมพันธ์:
 * - User 1 → N FormRequest (ผู้สร้างคำร้อง)
 * - User 1 → N FormRequest (ผู้อนุมัติ)
 * - User 1 → N Notification (ผู้รับแจ้งเตือน)
 */
@Entity('Users')
export class User {
  @ApiProperty({ description: 'รหัสผู้ใช้ (Auto Increment)' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'ชื่อผู้ใช้ AD (Active Directory username)', example: 'thatchayuth' })
  @Column({ type: 'nvarchar', length: 100, unique: true })
  username: string;

  @ApiProperty({ description: 'รหัสพนักงาน (กรอกเองภายหลัง)', example: 'EMP001', required: false })
  @Column({ type: 'nvarchar', length: 50, nullable: true })
  employeeId: string;

  @ApiProperty({ description: 'ชื่อ-นามสกุล (จาก AD displayName)', example: 'Thatchayuth Tochay' })
  @Column({ type: 'nvarchar', length: 200 })
  fullName: string;

  @ApiProperty({ description: 'อีเมล (จาก AD)', example: 'thatchayuth@ncr-rubber.com' })
  @Column({ type: 'nvarchar', length: 200, nullable: true })
  email: string;

  @Exclude() // ซ่อน password hash จาก response (ไม่ใช้สำหรับ AD Login)
  @Column({ type: 'nvarchar', length: 500, nullable: true })
  passwordHash: string;

  @ApiProperty({ description: 'บทบาท', enum: UserRole, example: UserRole.USER })
  @Column({
    type: 'nvarchar',
    length: 50,
    default: UserRole.USER,
  })
  role: UserRole;

  @ApiProperty({ description: 'แผนก/ฝ่าย', example: 'ฝ่ายบัญชี' })
  @Column({ type: 'nvarchar', length: 200, nullable: true })
  department: string;

  @ApiProperty({ description: 'กลุ่ม AD (เก็บเป็น JSON)', example: '["ICT","BKK-VPN"]' })
  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  adGroups: string;

  @ApiProperty({ description: 'สถานะใช้งาน', example: true })
  @Column({ type: 'bit', default: true })
  isActive: boolean;

  @ApiProperty({ description: 'เวลาเข้าสู่ระบบล่าสุด', required: false })
  @Column({ type: 'datetime2', nullable: true })
  lastLoginAt: Date;

  @ApiProperty({ description: 'วันที่สร้าง' })
  @CreateDateColumn({ type: 'datetime2' })
  createdAt: Date;

  @ApiProperty({ description: 'วันที่แก้ไขล่าสุด' })
  @UpdateDateColumn({ type: 'datetime2' })
  updatedAt: Date;

  // =============================================
  // ความสัมพันธ์ (Relations)
  // =============================================

  /** คำร้องที่ผู้ใช้เป็นคนสร้าง */
  @OneToMany(() => FormRequest, (formRequest) => formRequest.requester)
  formRequests: FormRequest[];

  /** คำร้องที่ผู้ใช้เป็นคนอนุมัติ */
  @OneToMany(() => FormRequest, (formRequest) => formRequest.approvedBy)
  approvedFormRequests: FormRequest[];

  /** แจ้งเตือนของผู้ใช้ */
  @OneToMany(() => Notification, (notification) => notification.user)
  notifications: Notification[];
}
