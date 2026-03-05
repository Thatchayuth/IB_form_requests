import {
  Injectable,
  UnauthorizedException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { firstValueFrom } from 'rxjs';
import * as bcrypt from 'bcryptjs';
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

/**
 * Auth Service
 * จัดการ Login ผ่าน Active Directory (AD) และสร้าง JWT token
 *
 * ขั้นตอน Login:
 * 1. ส่ง username/password ไปยัง AD API ด้วย Basic Auth
 * 2. AD ตรวจสอบ → ส่งข้อมูลผู้ใช้กลับมา
 * 3. Upsert user ในตาราง Users + hash password เก็บไว้
 * 4. สร้าง JWT token
 * 5. ส่ง token + ข้อมูล user กลับ
 *
 * Fallback (dev mode):
 * - ถ้า AD ล่ม → ตรวจ local password (bcrypt compare)
 */
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
   * - AD พร้อม → ยืนยันตัวตนกับ AD → upsert user → สร้าง JWT
   * - AD ล่ม (dev mode) → ตรวจ local password (bcrypt) → สร้าง JWT
   */
  async login(
    adLoginDto: AdLoginDto,
    clientIp?: string,
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
          `[DEV FALLBACK] AD ไม่พร้อมใช้งาน — ลอง local login สำหรับ "${username}"`,
        );
        user = await this.localPasswordLogin(username, password);
      } else {
        // ─── Login ล้มเหลว → log แล้ว throw ─────────────
        this.logger.warn(
          `[LOGIN FAILED] username="${username}" ip=${clientIp || 'unknown'} reason=${
            error instanceof Error ? error.message : 'unknown'
          }`,
        );
        throw error;
      }
    }

    // ─── ขั้นตอนที่ 3: ตรวจสอบ active ──────────────────
    if (!user.isActive) {
      this.logger.warn(`[LOGIN BLOCKED] username="${username}" — บัญชีถูกปิดใช้งาน`);
      throw new UnauthorizedException(
        'บัญชีผู้ใช้ถูกปิดการใช้งาน กรุณาติดต่อผู้ดูแลระบบ',
      );
    }

    // ─── ขั้นตอนที่ 4: อัพเดท lastLoginAt ──────────────
    await this.userRepository.update(user.id, {
      lastLoginAt: new Date(),
    });

    // ─── ขั้นตอนที่ 5: สร้าง JWT token ─────────────────
    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);

    this.logger.log(
      `[LOGIN SUCCESS] username="${user.username}" fullName="${user.fullName}" role=${user.role} ip=${clientIp || 'unknown'}`,
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
  //  AD Authentication
  // ═══════════════════════════════════════════════════════

  /**
   * เรียก AD API ด้วย Basic Auth เพื่อตรวจสอบ username/password
   */
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
        `[AD RAW] displayName="${data.displayName}" email="${data.email}" role="${data.role}" groups=${JSON.stringify(data.groups)}`,
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
  //  Local Password Fallback (Dev mode — กรณี AD ล่ม)
  // ═══════════════════════════════════════════════════════

  /**
   * ตรวจสอบ password จาก DB (bcrypt compare)
   * ใช้กรณี AD ล่มเท่านั้น — ต้องเคย login ผ่าน AD สำเร็จมาก่อน (มี passwordHash)
   */
  private async localPasswordLogin(
    username: string,
    password: string,
  ): Promise<User> {
    const user = await this.userRepository.findOne({ where: { username } });

    if (!user) {
      throw new UnauthorizedException(
        'ไม่พบผู้ใช้ในระบบ (AD ไม่สามารถเชื่อมต่อได้ และไม่เคย login สำเร็จมาก่อน)',
      );
    }

    // ─── ตรวจ password hash ─────────────────────────────
    if (!user.passwordHash) {
      throw new UnauthorizedException(
        'ไม่สามารถใช้ local login ได้ — ไม่มี password ในระบบ (ต้อง login ผ่าน AD อย่างน้อย 1 ครั้ง)',
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('รหัสผ่านไม่ถูกต้อง (local fallback)');
    }

    this.logger.log(`[LOCAL LOGIN] username="${username}" — ใช้ local password สำเร็จ`);
    return user;
  }

  // ═══════════════════════════════════════════════════════
  //  Upsert User (จาก AD response)
  // ═══════════════════════════════════════════════════════

  /**
   * Insert หรือ Update user ในตาราง Users จากข้อมูล AD
   * - มีแล้ว → update displayName, email, groups, password
   * - ไม่มี → สร้างใหม่ (role กำหนดจาก AD groups)
   */
  private async upsertUser(
    adUser: AdAuthResponse,
    plainPassword?: string,
  ): Promise<User> {
    let user = await this.userRepository.findOne({
      where: { username: adUser.username },
    });

    const adGroupsJson = JSON.stringify(adUser.groups || []);

    // Hash password เพื่อเก็บไว้ใช้ fallback กรณี AD ล่ม
    let hashedPassword: string | undefined;
    if (plainPassword) {
      hashedPassword = await bcrypt.hash(plainPassword, 10);
    }

    // ─── ตรวจ role จาก AD groups ─────────────────────────
    const suggestedRole = this.resolveRoleFromAdGroups(adUser.groups);

    this.logger.debug(
      `[upsertUser] email="${adUser.email}" (${typeof adUser.email}) suggestedRole=${suggestedRole}`,
    );

    if (user) {
      // ─── User มีอยู่แล้ว → Update ─────────────────────
      user.fullName = adUser.displayName || user.fullName;
      user.email = adUser.email || user.email;
      user.adGroups = adGroupsJson;

      if (hashedPassword) {
        user.passwordHash = hashedPassword;
      }

      // ถ้า AD groups บอกว่าเป็น Admin แต่ในระบบยังเป็น User → อัพเกรด
      // (ไม่ downgrade จาก Admin → User เพราะอาจเป็นการตั้งค่าด้วยมือ)
      if (suggestedRole === UserRole.ADMIN && user.role === UserRole.USER) {
        this.logger.log(
          `[ROLE UPGRADE] ${user.username}: User → Admin (จาก AD groups: ${adUser.groups.join(', ')})`,
        );
        user.role = UserRole.ADMIN;
      }

      user = await this.userRepository.save(user);
      this.logger.log(`[UPSERT] อัพเดทผู้ใช้ "${user.username}"`);
    } else {
      // ─── User ใหม่ → Insert ────────────────────────────
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
      this.logger.log(
        `[UPSERT] สร้างผู้ใช้ใหม่ "${user.username}" role=${user.role}`,
      );
    }

    return user;
  }

  // ═══════════════════════════════════════════════════════
  //  Role Mapping จาก AD Groups
  // ═══════════════════════════════════════════════════════

  /**
   * ตรวจสอบ AD groups → กำหนด role
   * ถ้ามี group ใด group หนึ่งใน ADMIN_AD_GROUPS → เป็น Admin
   * ปรับ ADMIN_AD_GROUPS ด้านบนตาม AD จริงของโรงงาน
   */
  private resolveRoleFromAdGroups(groups: string[]): UserRole {
    if (!groups || groups.length === 0) {
      return UserRole.USER;
    }

    const lowerGroups = groups.map((g) => g.toLowerCase());
    const isAdmin = ADMIN_AD_GROUPS.some((adminGroup) =>
      lowerGroups.includes(adminGroup.toLowerCase()),
    );

    return isAdmin ? UserRole.ADMIN : UserRole.USER;
  }

  // ═══════════════════════════════════════════════════════
  //  Get Profile
  // ═══════════════════════════════════════════════════════

  /**
   * ดึงข้อมูลผู้ใช้ปัจจุบัน (จาก JWT token)
   * ไม่ส่ง passwordHash กลับ
   */
  async getProfile(userId: number): Promise<Partial<User>> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('ไม่พบผู้ใช้');
    }

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
