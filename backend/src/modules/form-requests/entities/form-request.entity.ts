import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import {
  FormRequestStatus,
  Priority,
  RequestType,
} from '../../../common/enums';
import { User } from '../../users/entities/user.entity';
import { Attachment } from '../../attachments/entities/attachment.entity';
import { Notification } from '../../notifications/entities/notification.entity';

/**
 * Entity: FormRequests
 * ตารางเก็บข้อมูลคำร้อง/ฟอร์ม
 *
 * ความสัมพันธ์:
 * - FormRequest N → 1 User (ผู้สร้างคำร้อง - requester)
 * - FormRequest N → 1 User (ผู้อนุมัติ - approvedBy) [nullable]
 * - FormRequest 1 → N Attachment (ไฟล์แนบ)
 * - FormRequest 1 → N Notification (แจ้งเตือนที่เกี่ยวข้อง)
 */
@Entity('FormRequests')
export class FormRequest {
  @ApiProperty({ description: 'รหัสคำร้อง (Auto Increment)' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'เลขที่คำร้อง', example: 'FR-2026-0001' })
  @Column({ type: 'nvarchar', length: 50, unique: true })
  requestNumber: string;

  @ApiProperty({ description: 'หัวข้อคำร้อง', example: 'ขอซื้ออุปกรณ์สำนักงาน' })
  @Column({ type: 'nvarchar', length: 300 })
  title: string;

  @ApiProperty({ description: 'รายละเอียดคำร้อง' })
  @Column({ type: 'nvarchar', length: 'MAX' })
  description: string;

  @ApiProperty({ description: 'ประเภทคำร้อง', enum: RequestType, example: RequestType.PURCHASE })
  @Column({
    type: 'nvarchar',
    length: 100,
    default: RequestType.GENERAL,
  })
  requestType: RequestType;

  @ApiProperty({ description: 'ลำดับความสำคัญ', enum: Priority, example: Priority.MEDIUM })
  @Column({
    type: 'nvarchar',
    length: 20,
    default: Priority.MEDIUM,
  })
  priority: Priority;

  @ApiProperty({ description: 'สถานะคำร้อง', enum: FormRequestStatus, example: FormRequestStatus.DRAFT })
  @Column({
    type: 'nvarchar',
    length: 50,
    default: FormRequestStatus.DRAFT,
  })
  status: FormRequestStatus;

  // =============================================
  // Foreign Keys
  // =============================================

  @ApiProperty({ description: 'รหัสผู้สร้างคำร้อง' })
  @Column()
  requesterId: number;

  @ApiProperty({ description: 'รหัสผู้อนุมัติ', required: false })
  @Column({ nullable: true })
  approvedById: number;

  // =============================================
  // ข้อมูลเพิ่มเติม
  // =============================================

  @ApiProperty({ description: 'วันที่อนุมัติ', required: false })
  @Column({ type: 'datetime2', nullable: true })
  approvedAt: Date;

  @ApiProperty({ description: 'วันครบกำหนด', required: false })
  @Column({ type: 'date', nullable: true })
  dueDate: Date;

  @ApiProperty({ description: 'หมายเหตุจากผู้อนุมัติ', required: false })
  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  remarks: string;

  @ApiProperty({ description: 'วันที่สร้าง' })
  @CreateDateColumn({ type: 'datetime2' })
  createdAt: Date;

  @ApiProperty({ description: 'วันที่แก้ไขล่าสุด' })
  @UpdateDateColumn({ type: 'datetime2' })
  updatedAt: Date;

  // =============================================
  // ความสัมพันธ์ (Relations)
  // =============================================

  /** ผู้สร้างคำร้อง */
  @ManyToOne(() => User, (user) => user.formRequests, { eager: false })
  @JoinColumn({ name: 'requesterId' })
  requester: User;

  /** ผู้อนุมัติ */
  @ManyToOne(() => User, (user) => user.approvedFormRequests, {
    eager: false,
    nullable: true,
  })
  @JoinColumn({ name: 'approvedById' })
  approvedBy: User;

  /** ไฟล์แนบของคำร้อง */
  @OneToMany(() => Attachment, (attachment) => attachment.formRequest, {
    cascade: true, // เมื่อบันทึกคำร้อง จะบันทึกไฟล์แนบด้วย
  })
  attachments: Attachment[];

  /** แจ้งเตือนที่เกี่ยวข้องกับคำร้อง */
  @OneToMany(() => Notification, (notification) => notification.formRequest)
  notifications: Notification[];
}
