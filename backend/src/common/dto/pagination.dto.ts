import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt, Min, Max, IsString } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO สำหรับ Pagination, Search, Sort
 * ใช้เป็น base สำหรับ query parameters ใน GET list endpoints
 *
 * วิธีใช้ใน Controller:
 *   @Get()
 *   findAll(@Query() query: PaginationDto) {
 *     // query.page = 1, query.limit = 10, query.search = '', ...
 *   }
 *
 * Query Parameters ที่รองรับ:
 *   GET /api/form-requests?page=1&limit=10&search=ขอซื้อ&sortBy=createdAt&sortOrder=DESC
 */
export class PaginationDto {
  @ApiPropertyOptional({
    description: 'หน้าที่ (เริ่มจาก 1)',
    default: 1,
    minimum: 1,
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page ต้องเป็นจำนวนเต็ม' })
  @Min(1, { message: 'page ต้องมากกว่าหรือเท่ากับ 1' })
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'จำนวนรายการต่อหน้า',
    default: 10,
    minimum: 1,
    maximum: 100,
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit ต้องเป็นจำนวนเต็ม' })
  @Min(1, { message: 'limit ต้องมากกว่าหรือเท่ากับ 1' })
  @Max(100, { message: 'limit ต้องไม่เกิน 100' })
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'คำค้นหา',
    example: 'ขอซื้อ',
  })
  @IsOptional()
  @IsString({ message: 'search ต้องเป็นข้อความ' })
  search?: string;

  @ApiPropertyOptional({
    description: 'ชื่อ column ที่ต้องการเรียงลำดับ',
    default: 'createdAt',
    example: 'createdAt',
  })
  @IsOptional()
  @IsString({ message: 'sortBy ต้องเป็นข้อความ' })
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({
    description: 'ทิศทางการเรียงลำดับ',
    enum: ['ASC', 'DESC'],
    default: 'DESC',
    example: 'DESC',
  })
  @IsOptional()
  @IsString({ message: 'sortOrder ต้องเป็น ASC หรือ DESC' })
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}

/**
 * Interface สำหรับ Paginated Response
 * ส่งกลับพร้อมข้อมูล pagination metadata
 */
export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;       // จำนวนรายการทั้งหมด
    page: number;        // หน้าปัจจุบัน
    limit: number;       // จำนวนต่อหน้า
    totalPages: number;  // จำนวนหน้าทั้งหมด
    hasNextPage: boolean;     // มีหน้าถัดไปหรือไม่
    hasPreviousPage: boolean; // มีหน้าก่อนหน้าหรือไม่
  };
}
