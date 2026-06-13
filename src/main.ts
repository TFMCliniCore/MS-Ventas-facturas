import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger, RequestMethod } from '@nestjs/common'; // 👈 Asegúrate de importar RequestMethod aquí
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap-MS-Ventas');
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: 'http://localhost:3000', // Tu frontend de Next.js
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // 👇 🔥 UNIFICADO EN UNA SOLA LLAMADA CONTROLADA 🔥 👇
  app.setGlobalPrefix('api/v1', {
    exclude: [
      { path: 'facturas/:filename', method: RequestMethod.GET }, // Excluye solo la descarga de PDFs
    ],
  });

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

  // 🗑️ SE ELIMINÓ LA SEGUNDA LLAMADA DUPLICADA QUE ROMPÍA LOS PREFIJOS

  const port = process.env.PORT ? Number(process.env.PORT) : 3008;
  await app.listen(port);

  logger.log(`==================================================`);
  logger.log(`🚀 MS VENTAS - CliniCore inicializado con éxito`);
  logger.log(`📍 Corriendo en el puerto: ${port}`);
  logger.log(`==================================================`);
}
void bootstrap();