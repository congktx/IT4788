import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from './common/validation.pipe';
import { LoggingInterceptor } from './common/logging.interceptor';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AllExceptionsFilter } from './all-exceptions.filter';
import { initializeApp, cert } from 'firebase-admin/app';
import * as fs from 'fs';
import * as path from 'path';

async function bootstrap() {
  try {
    const serviceAccountPath = path.join(process.cwd(), 'private-key-fcm.json');
    if (fs.existsSync(serviceAccountPath)) {
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
      initializeApp({
        credential: cert(serviceAccount),
      });
      console.log('Firebase Admin initialized successfully.');
    } else {
      console.warn('Firebase Admin private-key-fcm.json not found, skipping initialization.');
    }
  } catch (error) {
    console.error('Failed to initialize Firebase Admin:', error);
  }

  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe());
  app.useGlobalInterceptors(new LoggingInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());

  const config = new DocumentBuilder()
    .setTitle('IT 4788 API')
    .setDescription('Tài liệu hướng dẫn sử dụng API hệ thống e-commerce')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Nhập JWT token vào đây',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  await app.listen(process.env.PORT ?? 8000);
}
bootstrap();