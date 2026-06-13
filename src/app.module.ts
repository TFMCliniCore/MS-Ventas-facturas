import { Module } from '@nestjs/common';
import { VentasModule } from './ventas/ventas.module';
import { FacturasModule } from './facturas/facturas.module';
import { MetodosPagoModule } from './metodos-pago/metodos-pago.module';
import { PreciosModule } from './precios/precios.module';
import { PromocionesModule } from './promociones/promociones.module';
import { CierresCajaModule } from './cierres-caja/cierres-caja.module';
import { PagosModule } from './pagos/pagos.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    VentasModule,
    FacturasModule,
    MetodosPagoModule,
    PreciosModule,
    PrismaModule,
    PromocionesModule,
    CierresCajaModule,
    PagosModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}