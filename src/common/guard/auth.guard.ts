import {
    Injectable,
    CanActivate,
    ExecutionContext,
    UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { config } from 'src/config';
import { Request } from 'express';
import { IToken } from 'src/infrastructure/token/interface';

@Injectable()
export class AuthGuard implements CanActivate {
    constructor(private readonly jwt: JwtService) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const req = context.switchToHttp().getRequest<Request>();
        const authHeader =
            (req.headers['authorization'] as string | undefined) ||
            (req.headers['Authorization'] as unknown as string | undefined);

        if (!authHeader) {
            throw new UnauthorizedException('Authorization header missing');
        }

        const parts = authHeader.trim().split(/\s+/);
        if (parts.length !== 2) {
            throw new UnauthorizedException('Invalid authorization format');
        }

        const [scheme, token] = parts;
        if (scheme !== 'Bearer' || !token) {
            throw new UnauthorizedException('Invalid authorization format');
        }

        try {
            const payload = await this.jwt.verifyAsync<IToken>(token, {
                secret: config.TOKEN.ACCESS_TOKEN_KEY,
            });

            // ixtiyoriy: access token ekanini tekshirish (agar payload.type qo'shsang)
            if ((payload as any).type && (payload as any).type !== 'access') {
                throw new UnauthorizedException('Wrong token type');
            }

            // ixtiyoriy: bloklangan userlar
            if ((payload as any).isActive === false) {
                throw new UnauthorizedException('User is not active');
            }

            // req.user ga yozamiz
            (req as any).user = payload;

            return true;
        } catch {
            throw new UnauthorizedException('Invalid or expired token');
        }
    }
}
