import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { IUsuarioCcontext } from '../interfaces/user-request.interface';

export const CurrentUsuario = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): IUsuarioCcontext => {
    const request = ctx.switchToHttp().getRequest();
    
    // Extracción segura de los encabezados inyectados por el API Gateway
    const id = request.headers['x-user-id'] ? Number(request.headers['x-user-id']) : null;
    const sucursalId = request.headers['x-sucursal-id'] ? Number(request.headers['x-sucursal-id']) : null;
    const role = request.headers['x-user-role'] || 'GUEST';

    return {
      id,
      role,
      sucursalId,
    };
  },
);