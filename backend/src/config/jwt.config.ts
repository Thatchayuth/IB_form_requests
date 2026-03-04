import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModuleAsyncOptions } from '@nestjs/jwt';

/**
 * ตั้งค่า JWT Module
 * อ่านค่า secret และ expiresIn จาก .env
 *
 * ใช้ใน auth.module.ts:
 *   JwtModule.registerAsync(jwtConfig)
 */
export const jwtConfig: JwtModuleAsyncOptions = {
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => ({
    secret: configService.get<string>('JWT_SECRET', 'default-secret-change-me'),
    signOptions: {
      expiresIn: configService.get<string>('JWT_EXPIRES_IN', '1d'), // อายุ token (1 วัน)
    },
  }),
};
