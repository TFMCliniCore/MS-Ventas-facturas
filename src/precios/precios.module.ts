// src/precios/precios.module.ts
import { Module } from '@nestjs/common';
import { PreciosController } from './precios.controller';
import { PreciosService } from './precios.service';
import { PrismaService } from '../prisma/prisma.service'; 

@Module({
  controllers: [PreciosController],
  providers: [
    PreciosService, 
    PrismaService 
  ],
  exports: [PreciosService]
})
export class PreciosModule {}