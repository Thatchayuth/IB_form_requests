import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModuleAsyncOptions } from '@nestjs/typeorm';

/**
 * ตั้งค่า TypeORM เชื่อมต่อ MSSQL
 * อ่านค่าจาก .env ผ่าน ConfigService
 *
 * ใช้ใน app.module.ts:
 *   TypeOrmModule.forRootAsync(databaseConfig)
 */
export const databaseConfig: TypeOrmModuleAsyncOptions = {
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => ({
    type: 'mssql' as const,

    // ข้อมูลเชื่อมต่อ MSSQL
    host: configService.get<string>('DB_HOST', 'localhost'),
    port: parseInt(configService.get<string>('DB_PORT', '1433'), 10),
    username: configService.get<string>('DB_USERNAME', 'sa'),
    password: configService.get<string>('DB_PASSWORD', ''),
    database: configService.get<string>('DB_DATABASE', 'IB_FormRequests'),

    // ตั้งค่าเฉพาะ MSSQL
    options: {
      encrypt: false, // ตั้งเป็น true สำหรับ Azure SQL
      trustServerCertificate: true, // สำหรับ dev ที่ใช้ self-signed cert
    },

    // TypeORM settings
    entities: [__dirname + '/../**/*.entity{.ts,.js}'], // โหลด entity ทั้งหมดอัตโนมัติ
    synchronize: configService.get<string>('DB_SYNCHRONIZE', 'false') === 'true', // สร้างตารางอัตโนมัติ (ใช้เฉพาะ dev)
    logging: configService.get<string>('DB_LOGGING', 'false') === 'true', // แสดง SQL query ใน console
    autoLoadEntities: true, // โหลด entity จาก module ที่ register ไว้

    // Connection pool
    extra: {
      connectionTimeout: 30000, // timeout เชื่อมต่อ 30 วินาที
      requestTimeout: 30000, // timeout query 30 วินาที
      pool: {
        max: 10, // จำนวน connection สูงสุด
        min: 2, // จำนวน connection ต่ำสุด
        idleTimeoutMillis: 30000, // ปิด connection ที่ไม่ได้ใช้หลัง 30 วินาที
      },
    },
  }),
};
