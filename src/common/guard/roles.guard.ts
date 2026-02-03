import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorator/access-roles.decorator';
import { Request } from 'express';

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private readonly reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        // 1) Route/class uchun kerakli rollarni olamiz
        const requiredRoles =
            this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
                context.getHandler(),
                context.getClass(),
            ]);

        // Agar role talab qilinmasa — hamma o‘tsin
        if (!requiredRoles || requiredRoles.length === 0) return true;

        // 2) User AuthGuard tomonidan qo‘yilgan bo‘lishi kerak
        const req = context.switchToHttp().getRequest<Request>();
        const user = (req as any).user;

        if (!user) {
            throw new UnauthorizedException('Unauthorized');
        }

        const userRole = user.role;

        if (!userRole) {
            throw new ForbiddenException('Role not found in token');
        }

        // 3) Role tekshirish
        const allowed = requiredRoles.includes(userRole);

        if (!allowed) {
            throw new ForbiddenException('Access denied');
        }

        return true;
    }
}
