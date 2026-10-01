import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger, RequestMethod } from '@nestjs/common';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { NestExpressApplication } from '@nestjs/platform-express'; 
import { join } from 'path'; 
import { existsSync, mkdirSync } from 'fs';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const logger = new Logger('Bootstrap-MS-Ventas');

  // Crear directorio uploads si no existe para evitar que Express colapse
  const uploadsPath = join(process.cwd(), 'uploads');
  if (!existsSync(uploadsPath)) {
    mkdirSync(uploadsPath, { recursive: true });
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  app.useStaticAssets(uploadsPath, {
    prefix: '/uploads/',
  });

  app.setGlobalPrefix('api/v1', {
    exclude: [
      { path: 'facturas/:filename', method: RequestMethod.GET },
    ],
  });

  app.useGlobalFilters(new HttpExceptionFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    })
  );

  app.enableShutdownHooks();

  const config = new DocumentBuilder()
    .setTitle('CliniCore - Microservicio de Ventas')
    .setDescription('Endpoints exclusivos del módulo de Ventas y Cajas')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/v1/ventas/docs', app, document);

  const port = process.env.PORT ? Number(process.env.PORT) : 3008;

  // Escuchar explícitamente en 0.0.0.0 para peticiones externas/Docker/Apache
  await app.listen(port, '0.0.0.0');

  logger.log(`==================================================`);
  logger.log(`🚀 MS VENTAS - CliniCore inicializado con éxito`);
  logger.log(`📍 Corriendo internamente en el puerto: ${port}`);
  logger.log(`==================================================`);
}

bootstrap().catch((err) => {
  console.error('Error al iniciar MS Ventas:', err);
});