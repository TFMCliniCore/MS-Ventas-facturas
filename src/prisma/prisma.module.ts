import { Module, Global } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global() // <-- Hace que Prisma esté disponible en toda la app sin volver a importarlo
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}