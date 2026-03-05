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
 * ข้อมูลที่ AD ส่งกลับมาหลังยืนยันตัวตนสำเร็จ
 */
interface AdAuthResponse {
  username: string;
  displayName: string;
  email: string;
  groups: string[];
  role: string;
}

/**
 * Auth Service
 * จัดการ Login ผ่าน Active Directory (AD) และสร้าง JWT token
 *
 * ขั้นตอน Login:
 * 1. ส่ง username/password ไปยัง AD API ด้วย Basic Auth
 * 2. AD ตรวจสอบ → ส่งข้อมูลผู้ใช้กลับมา (username, displayName, email, groups)
 * 3. ตรวจสอบว่ามี user ในตาราง Users หรือยัง
 *    - ถ้ามี → อัพเดทข้อมูล (displayName, email, groups)
 *    - ถ้าไม่มี → สร้าง user ใหม่ (role = User)
 * 4. สร้าง JWT token จากข้อมูลใน DB ของเรา
 * 5. ส่ง token + ข้อมูล user กลับ
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

  /**
   * Login ผ่าน Active Directory
   * เรียก AD API ด้วย Basic Auth แล้ว upsert user ในระบบ
   *
   * สำหรับ development: ถ้าเชื่อมต่อ AD ไม่ได้ จะ fallback ใช้ local user (ถ้ามีในระบบ)
   */
  async login(adLoginDto: AdLoginDto): Promise<{ access_token: string; user: Partial<User> }> {
    const { username, password } = adLoginDto;
    const isDev = this.configService.get<string>('APP_ENV', 'development') === 'development';

    let user: User;

    try {
      // ขั้นตอนที่ 1: เรียก AD API ตรวจสอบ username/password
      const adUser = await this.authenticateWithAD(username, password);

      // ขั้นตอนที่ 2: Insert หรือ Update user ในตาราง Users
      user = await this.upsertUser(adUser, password);
    } catch (error) {
      // Fallback สำหรับ dev: ถ้า AD ไม่พร้อมใช้ → ใช้ local user
      if (isDev && error instanceof InternalServerErrorException) {
        this.logger.warn(`[DEV MODE] AD ไม่พร้อมใช้งาน — ใช้ local login สำหรับ ${username}`);

        const localUser = await this.userRepository.findOne({ where: { username } });
        if (!localUser) {
          throw new UnauthorizedException('ไม่พบผู้ใช้ในระบบ (dev mode: AD ไม่สามารถเชื่อมต่อได้)');
        }
        user = localUser;
      } else {
        throw error; // re-throw ถ้าไม่ใช่ dev หรือเป็น UnauthorizedException
      }
    }

    // ขั้นตอนที่ 3: ตรวจสอบว่า user ยัง active อยู่
    if (!user.isActive) {
      throw new UnauthorizedException('บัญชีผู้ใช้ถูกปิดการใช้งาน กรุณาติดต่อผู้ดูแลระบบ');
    }

    // ขั้นตอนที่ 4: สร้าง JWT token
    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);

    this.logger.log(`ผู้ใช้ ${user.username} (${user.fullName}) เข้าสู่ระบบสำเร็จผ่าน AD`);

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

  /**
   * เรียก AD API ด้วย Basic Auth เพื่อตรวจสอบ username/password
   * AD API: GET {AD_AUTH_URL} + Authorization: Basic base64(username:password)
   */
  private async authenticateWithAD(username: string, password: string): Promise<AdAuthResponse> {
    const adUrl = this.configService.get<string>('AD_AUTH_URL');

    if (!adUrl) {
      this.logger.error('ไม่พบ AD_AUTH_URL ใน .env');
      throw new InternalServerErrorException('ไม่สามารถเชื่อมต่อระบบ AD ได้ กรุณาติดต่อผู้ดูแลระบบ');
    }

    // สร้าง Basic Auth token: base64(username:password)
    const basicToken = Buffer.from(`${username}:${password}`).toString('base64');

    try {
      const response = await firstValueFrom(
        this.httpService.get<AdAuthResponse>(adUrl, {
          headers: {
            Authorization: `Basic ${basicToken}`,
          },
          timeout: 10000, // timeout 10 วินาที
        }),
      );

      this.logger.log(`AD ยืนยันตัวตน ${username} สำเร็จ`);
      this.logger.log(`[AD RAW Response] username=${response.data.username}, displayName=${response.data.displayName}, email=${response.data.email}, role=${response.data.role}, groups=${JSON.stringify(response.data.groups)}`);
      return response.data;
    } catch (error: any) {
      // กรณี AD ส่ง 401 (username/password ไม่ถูกต้อง)
      if (error?.response?.status === 401) {
        throw new UnauthorizedException('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
      }

      // กรณี AD ส่ง 403 (ไม่มีสิทธิ์)
      if (error?.response?.status === 403) {
        throw new UnauthorizedException('ไม่มีสิทธิ์เข้าใช้งานระบบ');
      }

      // กรณีเชื่อมต่อ AD ไม่ได้ (network error, timeout)
      this.logger.error(`ไม่สามารถเชื่อมต่อ AD API: ${error.message}`);
      throw new InternalServerErrorException(
        'ไม่สามารถเชื่อมต่อระบบ AD ได้ กรุณาลองใหม่อีกครั้ง',
      );
    }
  }

  /**
   * Insert หรือ Update user ในตาราง Users
   * - ถ้ามี username ในระบบแล้ว → Update ข้อมูลจาก AD (displayName, email, groups)
   * - ถ้าไม่มี → สร้าง user ใหม่ (role = User)
   */
  private async upsertUser(adUser: AdAuthResponse, plainPassword?: string): Promise<User> {
    // ค้นหา user จาก username (AD username)
    let user = await this.userRepository.findOne({
      where: { username: adUser.username },
    });

    const adGroupsJson = JSON.stringify(adUser.groups || []);

    // Hash password ที่ผู้ใช้กรอก เพื่อเก็บไว้ใช้กรณี AD ล่ม
    let hashedPassword: string | undefined;
    if (plainPassword) {
      hashedPassword = await bcrypt.hash(plainPassword, 10);
    }

    this.logger.log(`[upsertUser] adUser.email = "${adUser.email}" (type: ${typeof adUser.email})`);

    if (user) {
      // มีอยู่แล้ว → อัพเดทข้อมูลจาก AD (ไม่เปลี่ยน role เพราะ Admin กำหนดเอง)
      user.fullName = adUser.displayName || user.fullName;
      user.email = adUser.email || user.email;
      user.adGroups = adGroupsJson;
      if (hashedPassword) {
        user.passwordHash = hashedPassword;
      }
      // ไม่เปลี่ยน role, department, isActive, employeeId (จัดการในระบบเอง)

      user = await this.userRepository.save(user);
      this.logger.log(`อัพเดทข้อมูลผู้ใช้ ${user.username} จาก AD`);
    } else {
      // ไม่มี → สร้างใหม่
      user = this.userRepository.create({
        username: adUser.username,
        fullName: adUser.displayName || adUser.username,
        email: adUser.email || undefined,
        passwordHash: hashedPassword || undefined,
        role: UserRole.USER, // ทุกคนเป็น User เริ่มต้น (Admin กำหนดทีหลัง)
        adGroups: adGroupsJson,
        isActive: true,
      });

      user = await this.userRepository.save(user) as User;
      this.logger.log(`สร้างผู้ใช้ใหม่จาก AD: ${user.username}`);
    }

    return user;
  }

  /**
   * Get Profile - ดึงข้อมูลผู้ใช้ปัจจุบัน (จาก JWT token)
   */
  async getProfile(userId: number): Promise<Partial<User>> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('ไม่พบผู้ใช้');
    }

    // ส่งกลับเฉพาะข้อมูลที่ต้องการ (ไม่รวม passwordHash)
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
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
