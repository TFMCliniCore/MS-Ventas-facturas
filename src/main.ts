import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger, RequestMethod } from '@nestjs/common';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { NestExpressApplication } from '@nestjs/platform-express'; 
import { join } from 'path'; 
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'; // 👈 ¡1. Importación agregada!

async function bootstrap() {
  const logger = new Logger('Bootstrap-MS-Ventas');
  
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.enableCors({
    origin: 'http://localhost:3000',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Servir la carpeta de imágenes
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
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

  // 🎯 ¡2. Configuración de Swagger movida ANTES del app.listen!
  const config = new DocumentBuilder()
    .setTitle('CliniCore - Microservicio de Ventas')
    .setDescription('Endpoints exclusivos del módulo de Ventas y Cajas')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  
  // Se monta usando la ruta que el Gateway interceptará de manera transparente
  SwaggerModule.setup('api/v1/ventas/docs', app, document);

  // 🚀 3. Arranque del servidor
  const port = process.env.PORT ? Number(process.env.PORT) : 3008;
  await app.listen(port);

  logger.log(`==================================================`);
  logger.log(`🚀 MS VENTAS - CliniCore inicializado con éxito`);
  logger.log(`📍 Corriendo internamente en el puerto: ${port}`);
  logger.log(`📝 Docs JSON listo en: http://localhost:${port}/api/v1/ventas/docs-json`);
  logger.log(`==================================================`);
}
void bootstrap();