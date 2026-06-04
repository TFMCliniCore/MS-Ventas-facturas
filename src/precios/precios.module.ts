// src/precios/precios.module.ts
import { Module } from '@nestjs/common';
import { PreciosController } from './precios.controller';
import { PreciosService } from './precios.service';
import { PrismaService } from '../prisma/prisma.service'; // 👈 1. Importa directamente el PrismaService

@Module({
  controllers: [PreciosController],
  providers: [
    PreciosService, 
    PrismaService // 👈 2. Regístralo aquí como provider del módulo
  ],
  exports: [PreciosService]
})
export class PreciosModule {}