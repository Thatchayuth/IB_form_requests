import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { BadRequestException } from '@nestjs/common';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';

/**
 * ประเภทไฟล์ที่อนุญาตให้อัปโหลด
 * รองรับ: รูปภาพ, PDF, Word, Excel, Text, ZIP
 */
const ALLOWED_MIME_TYPES = [
  // รูปภาพ
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  // เอกสาร
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'text/plain',
  'text/csv',
  // บีบอัด
  'application/zip',
  'application/x-rar-compressed',
];

/**
 * ตั้งค่า Multer สำหรับอัปโหลดไฟล์
 * - เก็บไฟล์ใน ./uploads (หรือค่าจาก UPLOAD_DEST)
 * - เปลี่ยนชื่อไฟล์เป็น UUID เพื่อป้องกันชื่อซ้ำ
 * - จำกัดขนาดสูงสุด 10MB (หรือค่าจาก UPLOAD_MAX_FILE_SIZE)
 * - กรองเฉพาะประเภทไฟล์ที่อนุญาต
 */
export const multerConfig: MulterOptions = {
  // กำหนดที่เก็บไฟล์
  storage: diskStorage({
    // โฟลเดอร์ปลายทาง
    destination: (req, file, callback) => {
      const uploadPath = process.env.UPLOAD_DEST || './uploads';
      callback(null, uploadPath);
    },
    // เปลี่ยนชื่อไฟล์เป็น UUID + นามสกุลเดิม เช่น a1b2c3d4.pdf
    filename: (req, file, callback) => {
      const uniqueName = `${uuidv4()}${extname(file.originalname)}`;
      callback(null, uniqueName);
    },
  }),

  // จำกัดขนาดไฟล์ (ค่าเริ่มต้น 10MB)
  limits: {
    fileSize: parseInt(process.env.UPLOAD_MAX_FILE_SIZE || '10485760', 10),
  },

  // กรองประเภทไฟล์ที่อนุญาต
  fileFilter: (req, file, callback) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      callback(null, true);
    } else {
      callback(
        new BadRequestException(
          `ไม่รองรับไฟล์ประเภท ${file.mimetype} กรุณาอัปโหลดเฉพาะ: รูปภาพ, PDF, Word, Excel, Text, ZIP`,
        ),
        false,
      );
    }
  },
};
