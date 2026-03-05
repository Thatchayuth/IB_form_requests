import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../users/entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UserRole } from '../../common/enums';
import { JwtPayload } from './strategies/jwt.strategy';

/**
 * Auth Service
 * จัดการ Login, Register, สร้าง JWT token
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Login - ตรวจสอบอีเมลและรหัสผ่าน แล้วสร้าง JWT token
   */
  async login(loginDto: LoginDto): Promise<{ access_token: string; user: Partial<User> }> {
    const { email, password } = loginDto;

    // ค้นหา user จากอีเมล
    const user = await this.userRepository.findOne({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    }

    // ตรวจสอบว่า user ยัง active อยู่
    if (!user.isActive) {
      throw new UnauthorizedException('บัญชีผู้ใช้ถูกปิดการใช้งาน กรุณาติดต่อผู้ดูแลระบบ');
    }

    // ตรวจสอบรหัสผ่าน
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    }

    // สร้าง JWT token
    const payload: JwtPayload = {
      sub: user.id,
      employeeId: user.employeeId,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);

    this.logger.log(`ผู้ใช้ ${user.email} เข้าสู่ระบบสำเร็จ`);

    return {
      access_token: accessToken,
      user: {
        id: user.id,
        employeeId: user.employeeId,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        department: user.department,
      },
    };
  }

  /**
   * Register - สมัครสมาชิกใหม่ (บทบาทเริ่มต้นเป็น User)
   */
  async register(registerDto: RegisterDto): Promise<{ access_token: string; user: Partial<User> }> {
    const { employeeId, fullName, email, password, department } = registerDto;

    // ตรวจสอบว่ามี email ซ้ำหรือไม่
    const existingEmail = await this.userRepository.findOne({
      where: { email },
    });
    if (existingEmail) {
      throw new ConflictException('อีเมลนี้ถูกใช้งานแล้ว');
    }

    // ตรวจสอบว่ามี employeeId ซ้ำหรือไม่
    const existingEmployee = await this.userRepository.findOne({
      where: { employeeId },
    });
    if (existingEmployee) {
      throw new ConflictException('รหัสพนักงานนี้ถูกใช้งานแล้ว');
    }

    // Hash password ด้วย bcrypt (salt rounds = 12)
    const passwordHash = await bcrypt.hash(password, 12);

    // สร้าง user ใหม่
    const user = this.userRepository.create({
      employeeId,
      fullName,
      email,
      passwordHash,
      role: UserRole.USER, // บทบาทเริ่มต้นเป็น User
      department: department || undefined,
      isActive: true,
    });

    const savedUser = await this.userRepository.save(user) as User;

    // สร้าง JWT token
    const payload: JwtPayload = {
      sub: savedUser.id,
      employeeId: savedUser.employeeId,
      email: savedUser.email,
      role: savedUser.role,
    };

    const accessToken = this.jwtService.sign(payload);

    this.logger.log(`ผู้ใช้ใหม่สมัครสมาชิก: ${savedUser.email}`);

    return {
      access_token: accessToken,
      user: {
        id: savedUser.id,
        employeeId: savedUser.employeeId,
        fullName: savedUser.fullName,
        email: savedUser.email,
        role: savedUser.role,
        department: savedUser.department,
      },
    };
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
      employeeId: user.employeeId,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      department: user.department,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
