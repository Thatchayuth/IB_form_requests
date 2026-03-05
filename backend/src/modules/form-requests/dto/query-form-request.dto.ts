import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsString } from 'class-validator';
import { FormRequestStatus, Priority, RequestType } from '../../../common/enums';
import { PaginationDto } from '../../../common/dto/pagination.dto';

/**
 * DTO สำหรับ Query Parameters ของ Form Requests
 * สืบทอดจาก PaginationDto (page, limit, search, sortBy, sortOrder)
 * เพิ่มตัวกรอง: status, requestType, priority
 *
 * @example
 * GET /api/form-requests?page=1&limit=10&status=Submitted&requestType=Purchase&priority=High&search=อุปกรณ์
 */
export class QueryFormRequestDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'กรองตามสถานะ',
    enum: FormRequestStatus,
    example: FormRequestStatus.SUBMITTED,
  })
  @IsOptional()
  @IsEnum(FormRequestStatus, { message: 'status ต้องเป็นค่าที่กำหนด' })
  status?: FormRequestStatus;

  @ApiPropertyOptional({
    description: 'กรองตามประเภทคำร้อง',
    enum: RequestType,
    example: RequestType.PURCHASE,
  })
  @IsOptional()
  @IsEnum(RequestType, { message: 'requestType ต้องเป็นค่าที่กำหนด' })
  requestType?: RequestType;

  @ApiPropertyOptional({
    description: 'กรองตามลำดับความสำคัญ',
    enum: Priority,
    example: Priority.HIGH,
  })
  @IsOptional()
  @IsEnum(Priority, { message: 'priority ต้องเป็นค่าที่กำหนด' })
  priority?: Priority;
}
