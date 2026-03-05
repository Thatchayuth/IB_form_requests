import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';

/**
 * JWT Payload Interface
 * ข้อมูลที่เก็บใน JWT token (สร้างตอน login สำเร็จ)
 */
export interface JwtPayload {
  sub: number;        // user id
  username: string;   // AD username
  email: string;
  role: string;
}

/**
 * Passport JWT Strategy
 * ทำงานร่วมกับ JwtAuthGuard เพื่อตรวจสอบ JWT token
 *
 * การทำงาน:
 * 1. ดึง JWT จาก Authorization: Bearer <token>
 * 2. ตรวจสอบ token ด้วย secret key
 * 3. ดึง user จาก DB ด้วย id ที่อยู่ใน payload
 * 4. ถ้า user ไม่พบหรือไม่ active → ส่ง 401 Unauthorized
 * 5. ถ้าสำเร็จ → ใส่ข้อมูล user ลงใน req.user
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {
    super({
      // ดึง JWT จาก header Authorization: Bearer <token>
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // ไม่อนุญาต token หมดอายุ
      ignoreExpiration: false,
      // secret key สำหรับตรวจสอบ token
      secretOrKey: configService.get<string>('JWT_SECRET', 'default-secret'),
    });
  }

  /**
   * Validate JWT Payload
   * ถูกเรียกหลังจาก token ผ่านการตรวจสอบแล้ว
   * ค่าที่ return จะถูกใส่ลงใน req.user
   */
  async validate(payload: JwtPayload): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
    });

    // ตรวจสอบว่า user ยังมีอยู่และ active
    if (!user) {
      throw new UnauthorizedException('ไม่พบผู้ใช้ หรือ token ไม่ถูกต้อง');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('บัญชีผู้ใช้ถูกปิดการใช้งาน');
    }

    return user;
  }
}
