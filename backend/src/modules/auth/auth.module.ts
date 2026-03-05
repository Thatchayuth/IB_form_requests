import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { User } from '../users/entities/user.entity';
import { jwtConfig } from '../../config/jwt.config';

/**
 * Auth Module
 * รวม Authentication ทั้งหมด: AD Login, JWT Strategy
 *
 * Dependencies:
 * - HttpModule: ใช้เรียก AD API (Basic Auth)
 * - TypeOrmModule: ใช้ User repository สำหรับค้นหา/สร้างผู้ใช้
 * - PassportModule: ใช้ Passport strategies (JWT)
 * - JwtModule: ใช้สร้างและตรวจสอบ JWT token
 *
 * Exports:
 * - JwtStrategy: ให้ module อื่นใช้ JwtAuthGuard ได้
 * - JwtModule: ให้ module อื่นใช้ JwtService ได้
 */
@Module({
  imports: [
    // HttpModule สำหรับเรียก AD API (timeout 10 วินาที)
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 3,
    }),

    // ลงทะเบียน User entity สำหรับ repository
    TypeOrmModule.forFeature([User]),

    // ตั้งค่า Passport ใช้ JWT เป็น strategy หลัก
    PassportModule.register({ defaultStrategy: 'jwt' }),

    // ตั้งค่า JWT Module (secret, expiresIn จาก .env)
    JwtModule.registerAsync(jwtConfig),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [JwtStrategy, JwtModule], // export ให้ module อื่นใช้ได้
})
export class AuthModule {}
