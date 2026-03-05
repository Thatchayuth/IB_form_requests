import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { User } from '../../modules/users/entities/user.entity';
import { UserRole } from '../../common/enums';

/**
 * Database Seed Script
 * สร้างข้อมูลเริ่มต้นสำหรับระบบจัดการคำร้อง
 *
 * วิธีใช้: npm run seed
 *
 * ข้อมูลที่สร้าง:
 * 1. Admin user (สำหรับทดสอบระบบ)
 * 2. User ตัวอย่าง
 *
 * หมายเหตุ:
 * - จะตรวจสอบก่อนว่ามี user อยู่แล้วหรือไม่ (ไม่สร้างซ้ำ)
 * - ใช้ synchronize: true เพื่อสร้างตารางอัตโนมัติ (dev only)
 */

// โหลด .env
dotenv.config();

// สร้าง DataSource สำหรับ seed (synchronize: true เพื่อสร้างตาราง)
const dataSource = new DataSource({
  type: 'mssql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '1433', 10),
  username: process.env.DB_USERNAME || 'sa',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'IB_FormRequests',
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
  entities: [__dirname + '/../../**/*.entity{.ts,.js}'],
  synchronize: true, // สร้างตารางอัตโนมัติ
  logging: false,
});

/**
 * ข้อมูล user เริ่มต้น
 */
const seedUsers: Partial<User>[] = [
  {
    username: 'admin',
    fullName: 'System Administrator',
    email: 'admin@company.com',
    role: UserRole.ADMIN,
    department: 'IT',
    isActive: true,
  },
  {
    username: 'testuser',
    fullName: 'Test User',
    email: 'testuser@company.com',
    role: UserRole.USER,
    department: 'บัญชี',
    isActive: true,
  },
];

async function seed(): Promise<void> {
  console.log('==========================================');
  console.log(' Database Seed — ระบบจัดการคำร้อง');
  console.log('==========================================');
  console.log(`DB Host: ${process.env.DB_HOST}`);
  console.log(`DB Name: ${process.env.DB_DATABASE}`);
  console.log('');

  try {
    // เชื่อมต่อ DB
    console.log('🔌 กำลังเชื่อมต่อฐานข้อมูล...');
    await dataSource.initialize();
    console.log('✅ เชื่อมต่อสำเร็จ');
    console.log('✅ Synchronize tables สำเร็จ (สร้าง/อัปเดตตารางอัตโนมัติ)');
    console.log('');

    // Seed Users
    const userRepo = dataSource.getRepository(User);

    console.log('👤 สร้าง Users เริ่มต้น...');
    for (const userData of seedUsers) {
      // ตรวจสอบว่ามีอยู่แล้วหรือไม่ (by username)
      const existing = await userRepo.findOne({
        where: { username: userData.username },
      });

      if (existing) {
        console.log(`   ⏭️  ${userData.username} — มีอยู่แล้ว (ID: ${existing.id}, role: ${existing.role})`);
      } else {
        const user = userRepo.create(userData);
        const saved = await userRepo.save(user);
        console.log(`   ✅ ${saved.username} — สร้างสำเร็จ (ID: ${(saved as User).id}, role: ${saved.role})`);
      }
    }

    // แสดงสรุป
    console.log('');
    console.log('==========================================');
    console.log(' สรุปข้อมูลในระบบ');
    console.log('==========================================');

    const totalUsers = await userRepo.count();
    const adminCount = await userRepo.count({ where: { role: UserRole.ADMIN as any } });
    const userCount = await userRepo.count({ where: { role: UserRole.USER as any } });

    console.log(`   ผู้ใช้ทั้งหมด : ${totalUsers} คน`);
    console.log(`   Admin       : ${adminCount} คน`);
    console.log(`   User        : ${userCount} คน`);
    console.log('');

    // แสดงรายชื่อตาราง
    const queryRunner = dataSource.createQueryRunner();
    const tables = await queryRunner.query(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME`,
    );
    console.log(`   ตาราง (${tables.length}):`);
    for (const table of tables) {
      console.log(`     - ${table.TABLE_NAME}`);
    }
    await queryRunner.release();

    console.log('');
    console.log('✅ Seed เสร็จสมบูรณ์!');
    console.log('');
    console.log('📌 ขั้นตอนถัดไป:');
    console.log('   1. npm run start:dev    — เริ่ม server');
    console.log('   2. เปิด http://localhost:3000/api/docs — Swagger UI');
    console.log('   3. POST /api/auth/login — Login ด้วย AD credentials');
    console.log('');

  } catch (error) {
    console.error('❌ Seed ล้มเหลว:', error.message);

    // แนะนำการแก้ไข
    if (error.message?.includes('Failed to connect') || error.message?.includes('ECONNREFUSED')) {
      console.error('');
      console.error('🔧 แก้ไข: ตรวจสอบว่า SQL Server ทำงานอยู่');
      console.error('   - ตรวจสอบ DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD ใน .env');
      console.error('   - ตรวจสอบว่า SQL Server รองรับ TCP/IP connections');
    }

    if (error.message?.includes('Login failed')) {
      console.error('');
      console.error('🔧 แก้ไข: username หรือ password ไม่ถูกต้อง');
      console.error('   - ตรวจสอบ DB_USERNAME, DB_PASSWORD ใน .env');
    }

    if (error.message?.includes('database') && error.message?.includes('does not exist')) {
      console.error('');
      console.error('🔧 แก้ไข: ฐานข้อมูลไม่มี — สร้างก่อน:');
      console.error(`   CREATE DATABASE ${process.env.DB_DATABASE || 'IB_FormRequests'};`);
    }

    process.exit(1);
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

// เรียกใช้
seed();
