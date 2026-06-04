import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { VentasModule } from './ventas/ventas.module';
import { FacturasModule } from './facturas/facturas.module';
import { MetodosPagoModule } from './metodos-pago/metodos-pago.module';
import { PreciosModule } from './precios/precios.module';


@Module({
  imports: [
    ServeStaticModule.forRoot({
    
      rootPath: join(process.cwd(), 'facturas_locales'),
      
      serveRoot: '/facturas', 
      exclude: ['/api/(.*)'], 
    }),
    
    
    VentasModule,
    FacturasModule,
    MetodosPagoModule,
    PreciosModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}