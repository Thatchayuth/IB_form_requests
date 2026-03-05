import {
  Injectable,
  UnauthorizedException,
  Logger,
  InternalServerErrorException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { firstValueFrom } from 'rxjs';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { User } from '../users/entities/user.entity';
import { AdLoginDto } from './dto/ad-login.dto';
import { UserRole } from '../../common/enums';
import { JwtPayload } from './strategies/jwt.strategy';

/**
 * Interface สำหรับ response จาก AD API
 */
interface AdAuthResponse {
  username: string;
  displayName: string;
  email: string;
  groups: string[];
  role: string;
}

// ─── AD Groups ที่ให้สิทธิ์ Admin (ปรับตาม AD จริงของโรงงาน) ───
const ADMIN_AD_GROUPS = ['ICT', 'ICT_Bkk', 'WSS_Sup', 'AD-Internet'];

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  // ═══════════════════════════════════════════════════════
  //  Login
  // ═══════════════════════════════════════════════════════

  /**
   * Login ผ่าน Active Directory
   * - AD พร้อม → ยืนยันกับ AD → upsert user → สร้าง JWT
   * - AD ล่ม (dev mode) → ตรวจ local password (bcrypt) → สร้าง JWT
   * - ตรวจ active session: ถ้ามี session อยู่และไม่ force → 409 Conflict
   */
  async login(
    adLoginDto: AdLoginDto,
    clientIp?: string,
    userAgent?: string,
    forceLogin?: boolean,
  ): Promise<{ access_token: string; user: Partial<User> }> {
    const { username, password } = adLoginDto;
    const isDev = this.configService.get<string>('APP_ENV', 'development') === 'development';

    let user: User;

    try {
      // ─── ขั้นตอนที่ 1: เรียก AD API ────────────────────
      const adUser = await this.authenticateWithAD(username, password);

      // ─── ขั้นตอนที่ 2: Upsert user ในระบบ ──────────────
      user = await this.upsertUser(adUser, password);
    } catch (error) {
      // ─── Fallback: AD ล่ม → ใช้ local password ─────────
      if (isDev && error instanceof InternalServerErrorException) {
        this.logger.warn(
          `[DEV FALLBACK] AD ไม่พร้อม — ลอง local login "${username}"`,
        );
        user = await this.localPasswordLogin(username, password);
      } else {
        this.logger.warn(
          `[LOGIN FAILED] username="${username}" ip=${clientIp || 'unknown'} reason=${
            error instanceof Error ? error.message : 'unknown'
          }`,
        );
        throw error;
      }
    }

    // ─── ตรวจสอบ active ──────────────────────────────
    if (!user.isActive) {
      this.logger.warn(`[LOGIN BLOCKED] username="${username}" — บัญชีถูกปิด`);
      throw new UnauthorizedException(
        'บัญชีผู้ใช้ถูกปิดการใช้งาน กรุณาติดต่อผู้ดูแลระบบ',
      );
    }

    // ═══ ตรวจ Active Session (ข้ามเครื่อง / ข้าม browser) ═══
    if (user.sessionToken && !forceLogin) {
      this.logger.warn(
        `[ACTIVE SESSION] username="${username}" มี session อยู่ device="${user.lastLoginDevice}" ip="${user.lastLoginIp}"`,
      );
      throw new ConflictException({
        message: 'มีการเข้าสู่ระบบอยู่แล้วจากอุปกรณ์อื่น',
        active_session_exists: true,
        active_session_device: this.parseDeviceName(user.lastLoginDevice),
        active_session_ip: user.lastLoginIp,
        active_session_time: user.lastLoginAt,
      });
    }

    // ─── สร้าง session ใหม่ ─────────────────────────────
    const sessionToken = randomUUID();

    await this.userRepository.update(user.id, {
      lastLoginAt: new Date(),
      lastLoginIp: clientIp || null,
      lastLoginDevice: userAgent || null,
      sessionToken,
    } as any);

    // ─── สร้าง JWT + ใส่ sessionToken ───────────────────
    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      sessionToken,
    };

    const accessToken = this.jwtService.sign(payload);

    this.logger.log(
      `[LOGIN SUCCESS] username="${user.username}" role=${user.role} ip=${clientIp || 'unknown'} forced=${!!forceLogin}`,
    );

    return {
      access_token: accessToken,
      user: {
        id: user.id,
        username: user.username,
        employeeId: user.employeeId,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        department: user.department,
        adGroups: user.adGroups,
      },
    };
  }

  // ═══════════════════════════════════════════════════════
  //  Logout — ลบ session token
  // ═══════════════════════════════════════════════════════

  async logout(userId: number): Promise<void> {
    await this.userRepository.update(userId, {
      sessionToken: null,
    } as any);
    this.logger.log(`[LOGOUT] userId=${userId} — session cleared`);
  }

  // ═══════════════════════════════════════════════════════
  //  Validate Session — เรียกทุก request จาก JwtStrategy
  // ═══════════════════════════════════════════════════════

  async validateSession(userId: number, sessionToken: string): Promise<User | null> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user || !user.isActive) return null;

    // ถ้า sessionToken ไม่ตรง = มีคนอื่น force login แล้ว → session นี้ถูก invalidate
    if (user.sessionToken !== sessionToken) {
      this.logger.warn(
        `[SESSION INVALID] userId=${userId} — ถูก invalidate (มีการ login จากที่อื่น)`,
      );
      return null;
    }

    return user;
  }

  // ═══════════════════════════════════════════════════════
  //  AD Authentication
  // ═══════════════════════════════════════════════════════

  private async authenticateWithAD(
    username: string,
    password: string,
  ): Promise<AdAuthResponse> {
    const adUrl = this.configService.get<string>('AD_AUTH_URL');

    if (!adUrl) {
      this.logger.error('ไม่พบ AD_AUTH_URL ใน .env');
      throw new InternalServerErrorException(
        'ไม่สามารถเชื่อมต่อระบบ AD ได้ กรุณาติดต่อผู้ดูแลระบบ',
      );
    }

    const basicToken = Buffer.from(`${username}:${password}`).toString('base64');

    try {
      const response = await firstValueFrom(
        this.httpService.get<AdAuthResponse>(adUrl, {
          headers: { Authorization: `Basic ${basicToken}` },
          timeout: 10000,
        }),
      );

      const data = response.data;
      this.logger.log(`[AD OK] username=${data.username}`);
      this.logger.debug(
        `[AD RAW] displayName="${data.displayName}" email="${data.email}" groups=${JSON.stringify(data.groups)}`,
      );
      return data;
    } catch (error: any) {
      if (error?.response?.status === 401) {
        throw new UnauthorizedException('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
      }
      if (error?.response?.status === 403) {
        throw new UnauthorizedException('ไม่มีสิทธิ์เข้าใช้งานระบบ');
      }
      this.logger.error(`ไม่สามารถเชื่อมต่อ AD API: ${error.message}`);
      throw new InternalServerErrorException(
        'ไม่สามารถเชื่อมต่อระบบ AD ได้ กรุณาลองใหม่อีกครั้ง',
      );
    }
  }

  // ═══════════════════════════════════════════════════════
  //  Local Password Fallback
  // ═══════════════════════════════════════════════════════

  private async localPasswordLogin(username: string, password: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { username } });

    if (!user) {
      throw new UnauthorizedException('ไม่พบผู้ใช้ในระบบ (AD ไม่สามารถเชื่อมต่อได้)');
    }

    if (!user.passwordHash) {
      throw new UnauthorizedException(
        'ไม่สามารถใช้ local login ได้ — ต้อง login ผ่าน AD อย่างน้อย 1 ครั้ง',
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('รหัสผ่านไม่ถูกต้อง');
    }

    this.logger.log(`[LOCAL LOGIN] username="${username}" สำเร็จ`);
    return user;
  }

  // ═══════════════════════════════════════════════════════
  //  Upsert User
  // ═══════════════════════════════════════════════════════

  private async upsertUser(adUser: AdAuthResponse, plainPassword?: string): Promise<User> {
    let user = await this.userRepository.findOne({
      where: { username: adUser.username },
    });

    const adGroupsJson = JSON.stringify(adUser.groups || []);
    let hashedPassword: string | undefined;
    if (plainPassword) {
      hashedPassword = await bcrypt.hash(plainPassword, 10);
    }

    const suggestedRole = this.resolveRoleFromAdGroups(adUser.groups);

    this.logger.debug(
      `[upsertUser] email="${adUser.email}" suggestedRole=${suggestedRole}`,
    );

    if (user) {
      user.fullName = adUser.displayName || user.fullName;
      user.email = adUser.email || user.email;
      user.adGroups = adGroupsJson;
      if (hashedPassword) user.passwordHash = hashedPassword;

      if (suggestedRole === UserRole.ADMIN && user.role === UserRole.USER) {
        this.logger.log(`[ROLE UPGRADE] ${user.username}: User → Admin`);
        user.role = UserRole.ADMIN;
      }

      user = await this.userRepository.save(user);
      this.logger.log(`[UPSERT] อัพเดท "${user.username}"`);
    } else {
      user = this.userRepository.create({
        username: adUser.username,
        fullName: adUser.displayName || adUser.username,
        email: adUser.email || undefined,
        passwordHash: hashedPassword || undefined,
        role: suggestedRole,
        adGroups: adGroupsJson,
        isActive: true,
      });
      user = (await this.userRepository.save(user)) as User;
      this.logger.log(`[UPSERT] สร้างใหม่ "${user.username}" role=${user.role}`);
    }

    return user;
  }

  // ═══════════════════════════════════════════════════════
  //  Role Mapping จาก AD Groups
  // ═══════════════════════════════════════════════════════

  private resolveRoleFromAdGroups(groups: string[]): UserRole {
    if (!groups || groups.length === 0) return UserRole.USER;
    const lowerGroups = groups.map((g) => g.toLowerCase());
    const isAdmin = ADMIN_AD_GROUPS.some((ag) =>
      lowerGroups.includes(ag.toLowerCase()),
    );
    return isAdmin ? UserRole.ADMIN : UserRole.USER;
  }

  // ═══════════════════════════════════════════════════════
  //  Parse User-Agent → ชื่อ Device อ่านง่าย
  // ═══════════════════════════════════════════════════════

  private parseDeviceName(userAgent: string | null): string {
    if (!userAgent) return 'ไม่ทราบอุปกรณ์';

    let os = 'Unknown OS';
    if (userAgent.includes('Windows NT 10')) os = 'Windows 10/11';
    else if (userAgent.includes('Windows')) os = 'Windows';
    else if (userAgent.includes('Mac OS X')) os = 'macOS';
    else if (userAgent.includes('Android')) os = 'Android';
    else if (userAgent.includes('iPhone')) os = 'iPhone';
    else if (userAgent.includes('iPad')) os = 'iPad';
    else if (userAgent.includes('Linux')) os = 'Linux';

    let browser = 'Unknown Browser';
    if (userAgent.includes('Edg/')) browser = 'Edge';
    else if (userAgent.includes('Chrome/')) browser = 'Chrome';
    else if (userAgent.includes('Firefox/')) browser = 'Firefox';
    else if (userAgent.includes('Safari/')) browser = 'Safari';

    return `${browser} บน ${os}`;
  }

  // ═══════════════════════════════════════════════════════
  //  Get Profile
  // ═══════════════════════════════════════════════════════

  async getProfile(userId: number): Promise<Partial<User>> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('ไม่พบผู้ใช้');

    return {
      id: user.id,
      username: user.username,
      employeeId: user.employeeId,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      department: user.department,
      adGroups: user.adGroups,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
