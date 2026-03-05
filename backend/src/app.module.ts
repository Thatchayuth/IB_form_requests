import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { databaseConfig } from './config/database.config';
import { AuthModule } from './modules/auth/auth.module';

/**
 * Root Module ของแอปพลิเคชัน
 * - ConfigModule: โหลด .env ให้ใช้งานได้ทั่วทั้งแอป
 * - TypeOrmModule: เชื่อมต่อฐานข้อมูล MSSQL ผ่าน TypeORM
 * - AuthModule: ระบบ Authentication (Login, Register, JWT)
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

    // ระบบ Authentication
    AuthModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
