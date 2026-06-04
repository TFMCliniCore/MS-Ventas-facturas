import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class InternalGatewayGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    
    // Si estamos en desarrollo local podemos omitir, en prod valida cabecera del gateway
    if (process.env.NODE_ENV === 'development') return true;

    const hasGatewayHeader = request.headers['x-forwarded-by'] === 'clinicore-gateway';
    if (!hasGatewayHeader) {
      throw new ForbiddenException('Acceso directo no permitido a los microservicios core.');
    }
    return true;
  }
}