import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';

/**
 * Users Module
 * จัดการผู้ใช้งานระบบ (CRUD สำหรับ Admin)
 *
 * Dependencies:
 * - TypeOrmModule: ใช้ User repository
 *
 * Exports:
 * - UsersService: ให้ module อื่น (เช่น AuthModule) ใช้ค้นหาผู้ใช้ได้
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService], // export ให้ module อื่นใช้ได้
})
export class UsersModule {}
