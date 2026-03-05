import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

/**
 * จุดเริ่มต้นของแอปพลิเคชัน
 * - ตั้งค่า CORS สำหรับ Frontend
 * - ตั้งค่า Helmet สำหรับ Security Headers
 * - ตั้งค่า Global Validation Pipe สำหรับตรวจสอบ DTO
 * - ตั้งค่า Swagger สำหรับ API Documentation
 * - กำหนด Global Prefix เป็น /api
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ตั้งค่า Security Headers
  app.use(helmet());

  // ตั้งค่า CORS - อนุญาตให้ Frontend เรียก API ได้
  // อ่านค่าจาก CORS_ORIGIN ใน .env รองรับหลาย origin คั่นด้วย ,
  // เช่น "http://localhost:4200,http://192.168.1.100:4200,https://myapp.example.com"
  const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:4200')
    .split(',')
    .map((origin) => origin.trim());

  app.enableCors({
    origin: corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  // กำหนด prefix /api สำหรับ endpoint ทั้งหมด
  app.setGlobalPrefix('api');

  // ตั้งค่า Global Exception Filter - จัดการ error response ให้เป็นรูปแบบเดียวกัน
  app.useGlobalFilters(new HttpExceptionFilter());

  // ตั้งค่า Global Interceptor - ครอบ response สำเร็จเป็น { success, data, timestamp }
  app.useGlobalInterceptors(new TransformInterceptor());

  // ตั้งค่า Global Validation Pipe
  // - whitelist: ตัด property ที่ไม่ได้ประกาศใน DTO ออก
  // - forbidNonWhitelisted: ส่ง error ถ้ามี property แปลกปลอม
  // - transform: แปลง plain object เป็น DTO class อัตโนมัติ
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // ตั้งค่า Swagger API Documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('ระบบจัดการคำร้อง API')
    .setDescription('API สำหรับระบบจัดการคำร้อง/ฟอร์ม (IB Form Request Management)')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'ใส่ JWT token ที่ได้จากการ Login',
        in: 'header',
      },
      'JWT-auth', // ชื่ออ้างอิงสำหรับ @ApiBearerAuth('JWT-auth')
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  // เริ่ม server
  const port = process.env.APP_PORT || 3000;
  await app.listen(port);
  console.log(`🚀 แอปพลิเคชันทำงานที่: http://localhost:${port}`);
  console.log(`📄 Swagger API Docs: http://localhost:${port}/api/docs`);
}

bootstrap();
