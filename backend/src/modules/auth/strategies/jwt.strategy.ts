import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from '../auth.service';

/**
 * JWT Payload Interface
 * ข้อมูลที่เก็บใน JWT token (สร้างตอน login สำเร็จ)
 */
export interface JwtPayload {
  sub: number;
  username: string;
  email: string;
  role: string;
  sessionToken?: string;
}

/**
 * Passport JWT Strategy
 * ทำงานร่วมกับ JwtAuthGuard เพื่อตรวจสอบ JWT token
 * + ตรวจ session token ว่ายังตรงกับ DB (ป้องกัน force logout ข้ามเครื่อง)
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET', 'default-secret'),
    });
  }

  /**
   * Validate JWT Payload
   * - ตรวจว่า user ยังอยู่ + active
   * - ตรวจว่า sessionToken ยังตรงกัน (ไม่ถูก force logout)
   */
  async validate(payload: JwtPayload): Promise<JwtPayload> {
    if (!payload.sub) {
      throw new UnauthorizedException('Token ไม่ถูกต้อง');
    }

    // ─── ตรวจ session token ───────────────────────────────
    if (payload.sessionToken) {
      const user = await this.authService.validateSession(
        payload.sub,
        payload.sessionToken,
      );

      if (!user) {
        throw new UnauthorizedException(
          'Session หมดอายุ — มีการเข้าสู่ระบบจากอุปกรณ์อื่น กรุณาเข้าสู่ระบบใหม่',
        );
      }
    }

    return payload;
  }
}
