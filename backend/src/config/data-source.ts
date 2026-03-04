import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

/**
 * TypeORM DataSource สำหรับ CLI
 * ใช้กับคำสั่ง migration:
 *   npm run migration:generate -- src/database/migrations/InitialMigration
 *   npm run migration:run
 *   npm run migration:revert
 *
 * หมายเหตุ: ไฟล์นี้ใช้กับ TypeORM CLI เท่านั้น ไม่ได้ใช้ใน runtime ของ NestJS
 */

// โหลด .env
dotenv.config();

const dataSource = new DataSource({
  type: 'mssql',

  // ข้อมูลเชื่อมต่อ MSSQL
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '1433', 10),
  username: process.env.DB_USERNAME || 'sa',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'IB_FormRequests',

  // ตั้งค่าเฉพาะ MSSQL
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },

  // Entity และ Migration paths
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../database/migrations/*{.ts,.js}'],

  // ปิด synchronize เสมอ (ใช้ migration แทน)
  synchronize: false,
  logging: true,
});

export default dataSource;
