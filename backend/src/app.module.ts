import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';

/**
 * Root Module ของแอปพลิเคชัน
 * - ConfigModule: โหลด .env ให้ใช้งานได้ทั่วทั้งแอป
 * - จะเพิ่ม TypeOrmModule, AuthModule, UsersModule ฯลฯ ในขั้นตอนถัดไป
 */
@Module({
  imports: [
    // โหลดไฟล์ .env ให้ใช้งานได้ทั่วทั้งแอป (isGlobal: true)
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
