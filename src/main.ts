import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap-MS-Ventas');
  const app = await NestFactory.create(AppModule);

  // Prefijo global de la API unificado con el ecosistema CliniCore
  app.setGlobalPrefix('api/v1');

  // Filtro de excepciones global para estandarizar respuestas de error
  app.useGlobalFilters(new HttpExceptionFilter());

  // Configuración de validación automática para los DTOs de entrada
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    })
  );

  // Habilitar el apagado controlado del contenedor Docker
  app.enableShutdownHooks();

  const port = process.env.PORT ? Number(process.env.PORT) : 3008;
  await app.listen(port);

  logger.log(`==================================================`);
  logger.log(`🚀 MS VENTAS - CliniCore inicializado con éxito`);
  logger.log(`📍 Corriendo en el puerto: ${port}`);
  logger.log(`==================================================`);
}
void bootstrap();