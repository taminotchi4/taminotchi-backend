import {
    CanActivate,
    ExecutionContext,
    Injectable,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { config } from 'src/config';
import { IToken } from 'src/infrastructure/token/interface';

/**
 * WebSocket JWT Guard
 *
 * Foydalanish:
 *   1) Handshake vaqtida token tekshiriladi (connect event)
 *   2) Token handshake.auth.token yoki
 *      handshake.headers.authorization dan olinadi
 *
 * Token to'g'ri bo'lsa socket.data.user ga yoziladi va
 * barcha eventlarda req.user kabi ishlatilishi mumkin.
 */
@Injectable()
export class WsAuthGuard implements CanActivate {
    constructor(private readonly jwt: JwtService) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const client: Socket = context.switchToWs().getClient();

        const token = this.extractToken(client);
        if (!token) {
            throw new WsException('Authorization token missing');
        }

        try {
            const payload = await this.jwt.verifyAsync<IToken>(token, {
                secret: config.TOKEN.ACCESS_TOKEN_KEY,
            });

            if ((payload as any).type && (payload as any).type !== 'access') {
                throw new WsException('Wrong token type');
            }

            if (payload.isActive === false) {
                throw new WsException('User is not active');
            }

            // socket.data.user ga saqlaymiz — barcha handlerda mavjud
            client.data.user = payload;
            return true;
        } catch (e) {
            throw new WsException('Invalid or expired token');
        }
    }

    private extractToken(client: Socket): string | null {
        // 1) handshake.auth.token  (tavsiya etilgan yo'l)
        const authToken = client.handshake.auth?.token as string | undefined;
        if (authToken) return authToken;

        // 2) handshake.headers.authorization: "Bearer <token>"
        const header = client.handshake.headers?.authorization as string | undefined;
        if (header?.startsWith('Bearer ')) {
            return header.slice(7);
        }

        return null;
    }
}
