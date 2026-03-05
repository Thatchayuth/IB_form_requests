import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { NotificationType } from '../../../common/enums';
import { User } from '../../users/entities/user.entity';
import { FormRequest } from '../../form-requests/entities/form-request.entity';

/**
 * Entity: Notifications
 * ตารางเก็บข้อมูลแจ้งเตือนในระบบ (In-App)
 *
 * ความสัมพันธ์:
 * - Notification N → 1 User (ผู้รับแจ้งเตือน)
 * - Notification N → 1 FormRequest (คำร้องที่เกี่ยวข้อง) [nullable]
 */
@Entity('Notifications')
export class Notification {
  @ApiProperty({ description: 'รหัสแจ้งเตือน (Auto Increment)' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'รหัสผู้รับแจ้งเตือน' })
  @Column()
  userId: number;

  @ApiProperty({ description: 'รหัสคำร้องที่เกี่ยวข้อง', required: false })
  @Column({ nullable: true })
  formRequestId: number;

  @ApiProperty({ description: 'หัวข้อแจ้งเตือน', example: 'คำร้องได้รับการอนุมัติ' })
  @Column({ type: 'nvarchar', length: 300 })
  title: string;

  @ApiProperty({ description: 'ข้อความแจ้งเตือน', example: 'คำร้อง FR-2026-0001 ได้รับการอนุมัติแล้ว' })
  @Column({ type: 'nvarchar', length: 'MAX' })
  message: string;

  @ApiProperty({
    description: 'ประเภทแจ้งเตือน',
    enum: NotificationType,
    example: NotificationType.STATUS_CHANGE,
  })
  @Column({
    type: 'nvarchar',
    length: 50,
    default: NotificationType.SYSTEM,
  })
  type: NotificationType;

  @ApiProperty({ description: 'อ่านแล้วหรือยัง', example: false })
  @Column({ type: 'bit', default: false })
  isRead: boolean;

  @ApiProperty({ description: 'วันที่อ่าน', required: false })
  @Column({ type: 'datetime2', nullable: true })
  readAt: Date;

  @ApiProperty({ description: 'วันที่สร้าง' })
  @CreateDateColumn({ type: 'datetime2' })
  createdAt: Date;

  // =============================================
  // ความสัมพันธ์ (Relations)
  // =============================================

  /** ผู้รับแจ้งเตือน */
  @ManyToOne(() => User, (user) => user.notifications, {
    onDelete: 'CASCADE', // ลบผู้ใช้ → ลบแจ้งเตือนด้วย
  })
  @JoinColumn({ name: 'userId' })
  user: User;

  /** คำร้องที่เกี่ยวข้อง */
  @ManyToOne(() => FormRequest, (formRequest) => formRequest.notifications, {
    nullable: true,
    onDelete: 'SET NULL', // ลบคำร้อง → ตั้ง FK เป็น null
  })
  @JoinColumn({ name: 'formRequestId' })
  formRequest: FormRequest;
}
