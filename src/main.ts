import { existsSync, mkdirSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { join } from 'node:path';
import { ValidationPipe, Logger, RequestMethod } from '@nestjs/common';
import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { PrismaClientExceptionFilter } from './prisma/prisma-client-exception.filter';

async function bootstrap() {
  if (existsSync('.env')) loadEnvFile();

  const logger = new Logger('Bootstrap-MS-Ventas');

  const uploadsPath = join(process.cwd(), 'uploads', 'facturas');
  if (!existsSync(uploadsPath)) {
    mkdirSync(uploadsPath, { recursive: true });
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const httpAdapterHost = app.get(HttpAdapterHost);

  app.enableShutdownHooks();

  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });

  app.setGlobalPrefix('api/v1', {
    exclude: [
      { path: 'facturas/:filename', method: RequestMethod.GET },
    ],
  });

  app.useGlobalFilters(
    new HttpExceptionFilter(),
    new PrismaClientExceptionFilter(httpAdapterHost),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('CliniCore - Microservicio de Ventas y Facturación')
    .setDescription('Endpoints del módulo de Punto de Venta (POS), Control de Cajas, Promociones y Facturación')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('api/v1/ventas/docs', app, document, {
    swaggerOptions: {
      jsonEditor: true,
    },
  });

  const port = process.env.PORT ? Number(process.env.PORT) : 3008;
  await app.listen(port, '0.0.0.0');

  logger.log(`==================================================`);
  logger.log(`🚀 MS VENTAS - CliniCore inicializado con éxito`);
  logger.log(`📍 Corriendo internamente en el puerto: ${port}`);
  logger.log(`📝 Documentación Swagger: http://localhost:${port}/api/v1/ventas/docs`);
  logger.log(`==================================================`);
}

bootstrap().catch((err) => {
  console.error('Error al iniciar MS Ventas:', err);
});