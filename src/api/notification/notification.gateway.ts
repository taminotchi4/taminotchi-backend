import {
    WebSocketGateway,
    WebSocketServer,
    OnGatewayConnection,
    OnGatewayDisconnect,
    WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';

import { NotificationEntity } from 'src/core/entity/notification.entity';
import { config } from 'src/config';
import { IToken } from 'src/infrastructure/token/interface';

/**
 * NOTIFICATION GATEWAY
 * Namespace: /notification
 *
 * ─── Room strategiyasi ────────────────────────────
 *   "user:{userId}"   ← har bir foydalanuvchi o'z room ida
 *
 * ─── Server → Client eventlar ────────────────────
 *   notification      { ...NotificationEntity }
 *   unread_count      { count: number }
 *
 * ─── Client tomonidan event yuborilmaydi ─────────
 *   (faqat server push qiladi)
 */
@WebSocketGateway({
    namespace: '/notification',
    cors: { origin: '*', credentials: true },
    transports: ['websocket', 'polling'],
})
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    constructor(private readonly jwt: JwtService) { }

    // ── Ulanish: JWT → user:{id} room ─────────────
    async handleConnection(client: Socket) {
        try {
            const token = this.extractToken(client);
            if (!token) {
                this.reject(client, 'Authorization token missing');
                return;
            }

            const user = await this.jwt.verifyAsync<IToken>(token, {
                secret: config.TOKEN.ACCESS_TOKEN_KEY,
            });

            client.data.user = user;
            await client.join(`user:${user.id}`);

            console.log(`[Notification] +connect  ${user.id} (${user.role})`);
        } catch {
            this.reject(client, 'Invalid or expired token');
        }
    }

    handleDisconnect(client: Socket) {
        const user = client.data?.user;
        console.log(`[Notification] -disconnect ${user?.id ?? client.id}`);
    }

    // ── Public metod: NotificationService tomonidan chaqiriladi ──
    pushToUser(userId: string, notification: NotificationEntity): void {
        this.server.to(`user:${userId}`).emit('notification', notification);
    }

    pushUnreadCount(userId: string, count: number): void {
        this.server.to(`user:${userId}`).emit('unread_count', { count });
    }

    // ── Private helpers ───────────────────────────
    private extractToken(client: Socket): string | null {
        const authToken = client.handshake.auth?.token as string | undefined;
        if (authToken) return authToken;
        const header = client.handshake.headers?.authorization as string | undefined;
        if (header?.startsWith('Bearer ')) return header.slice(7);
        return null;
    }

    private reject(client: Socket, message: string) {
        client.emit('error', { message });
        client.disconnect();
    }
}
