import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../users/entities/user.entity';
import { FormRequest } from '../../form-requests/entities/form-request.entity';

/**
 * Entity: Attachments
 * ตารางเก็บข้อมูลไฟล์แนบของคำร้อง
 *
 * ความสัมพันธ์:
 * - Attachment N → 1 FormRequest (ไฟล์แนบของคำร้อง)
 * - Attachment N → 1 User (ผู้อัปโหลด)
 */
@Entity('Attachments')
export class Attachment {
  @ApiProperty({ description: 'รหัสไฟล์แนบ (Auto Increment)' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'รหัสคำร้อง' })
  @Column()
  formRequestId: number;

  @ApiProperty({ description: 'ชื่อไฟล์ต้นฉบับ', example: 'ใบเสนอราคา.pdf' })
  @Column({ type: 'nvarchar', length: 500 })
  fileName: string;

  @ApiProperty({ description: 'ชื่อไฟล์ที่เก็บในระบบ (UUID)', example: 'a1b2c3d4-e5f6.pdf' })
  @Column({ type: 'nvarchar', length: 500 })
  storedFileName: string;

  @ApiProperty({ description: 'ที่อยู่ไฟล์บน server', example: './uploads/a1b2c3d4-e5f6.pdf' })
  @Column({ type: 'nvarchar', length: 1000 })
  filePath: string;

  @ApiProperty({ description: 'ขนาดไฟล์ (bytes)', example: 102400 })
  @Column({ type: 'bigint' })
  fileSize: number;

  @ApiProperty({ description: 'ประเภทไฟล์ (MIME type)', example: 'application/pdf' })
  @Column({ type: 'nvarchar', length: 100 })
  mimeType: string;

  @ApiProperty({ description: 'รหัสผู้อัปโหลด' })
  @Column()
  uploadedById: number;

  @ApiProperty({ description: 'วันที่อัปโหลด' })
  @CreateDateColumn({ type: 'datetime2' })
  createdAt: Date;

  // =============================================
  // ความสัมพันธ์ (Relations)
  // =============================================

  /** คำร้องที่ไฟล์แนบนี้สังกัด */
  @ManyToOne(() => FormRequest, (formRequest) => formRequest.attachments, {
    onDelete: 'CASCADE', // ลบคำร้อง → ลบไฟล์แนบด้วย
  })
  @JoinColumn({ name: 'formRequestId' })
  formRequest: FormRequest;

  /** ผู้อัปโหลดไฟล์ */
  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'uploadedById' })
  uploadedBy: User;
}
