import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { databaseConfig } from './config/database.config';

/**
 * Root Module ของแอปพลิเคชัน
 * - ConfigModule: โหลด .env ให้ใช้งานได้ทั่วทั้งแอป
 * - TypeOrmModule: เชื่อมต่อฐานข้อมูล MSSQL ผ่าน TypeORM
 * - จะเพิ่ม AuthModule, UsersModule, FormRequestsModule ฯลฯ ในขั้นตอนถัดไป
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
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
