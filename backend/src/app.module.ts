import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { databaseConfig } from './config/database.config';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { FormRequestsModule } from './modules/form-requests/form-requests.module';
import { AttachmentsModule } from './modules/attachments/attachments.module';
import { NotificationsModule } from './modules/notifications/notifications.module';

/**
 * Root Module ของแอปพลิเคชัน
 * - ConfigModule: โหลด .env ให้ใช้งานได้ทั่วทั้งแอป
 * - TypeOrmModule: เชื่อมต่อฐานข้อมูล MSSQL ผ่าน TypeORM
 * - AuthModule: ระบบ Authentication (AD Login + JWT)
 * - UsersModule: จัดการผู้ใช้ (Admin CRUD)
 * - FormRequestsModule: จัดการคำร้อง (CRUD + Workflow)
 * - AttachmentsModule: จัดการไฟล์แนบ (Upload/Download/Delete)
 * - NotificationsModule: แจ้งเตือนในระบบ (In-App)
 */
@Module({
  imports: [
    // โหลดไฟล์ .env ให้ใช้งานได้ทั่วทั้งแอป (isGlobal: true)
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // เชื่อมต่อฐานข้อมูล MSSQL ผ่าน TypeORM
    TypeOrmModule.forRootAsync(databaseConfig),

    // ระบบ Authentication (AD Login + JWT)
    AuthModule,

    // จัดการผู้ใช้ (Admin CRUD)
    UsersModule,

    // จัดการคำร้อง (CRUD + Workflow)
    FormRequestsModule,

    // จัดการไฟล์แนบ (Upload/Download/Delete)
    AttachmentsModule,

    // แจ้งเตือนในระบบ (In-App)
    NotificationsModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
