import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayConnection,
    OnGatewayDisconnect,
    MessageBody,
    ConnectedSocket,
    WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

import { PrivateChatWsService } from './private-chat-ws.service';
import { SendPrivateMessageDto } from './dto/send-private-message.dto';
import { NotificationService } from '../notification/notification.service';
import { NotificationGateway } from '../notification/notification.gateway';
import { NotificationRefType, NotificationType } from 'src/common/enum/index.enum';

/**
 * PRIVATE CHAT GATEWAY
 * Namespace: /private-chat
 *
 * ─── Room strategiyasi ────────────────────────────
 *   "private:{privateChatId}"
 *
 * ─── Client → Server eventlar ────────────────────
 *   join_chat    { privateChatId }
 *   leave_chat   { privateChatId }
 *   send_message { privateChatId, type, text?, mediaPath?, replyToId? }
 *   typing       { privateChatId }
 *   stop_typing  { privateChatId }
 *   load_history { privateChatId, page?, limit? }
 *
 * ─── Server → Client eventlar ────────────────────
 *   joined       { privateChatId }
 *   left         { privateChatId }
 *   new_message  { ...MessageEntity }
 *   history      { data[], total, page, limit }
 *   typing       { privateChatId, userId, senderType }
 *   stop_typing  { privateChatId, userId }
 *   error        { message }
 */
@WebSocketGateway({
    namespace: '/private-chat',
    cors: { origin: '*', credentials: true },
    transports: ['websocket', 'polling'],
})
export class PrivateChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    constructor(
        private readonly privateChatWsService: PrivateChatWsService,
        private readonly notifService: NotificationService,
        private readonly notifGateway: NotificationGateway,
    ) { }

    // ─────────────────────────────────────────────────
    // Ulanish: JWT tekshiriladi, barcha chatlarga join
    // ─────────────────────────────────────────────────
    async handleConnection(client: Socket) {
        try {
            const token = this.extractToken(client);
            if (!token) {
                this.reject(client, 'Authorization token missing');
                return;
            }

            const user = await this.privateChatWsService.verifyToken(token);
            client.data.user = user;

            // Foydalanuvchining barcha chatlarini room'larga qo'shamiz
            const chatIds = await this.privateChatWsService.getUserChatIds(user.id, user.role);
            for (const chatId of chatIds) {
                await client.join(`private:${chatId}`);
            }

            console.log(`[PrivateChat] +connect  ${user.id} (${user.role}) | chats: ${chatIds.length}`);
        } catch {
            this.reject(client, 'Invalid or expired token');
        }
    }

    handleDisconnect(client: Socket) {
        const user = client.data?.user;
        console.log(`[PrivateChat] -disconnect ${user?.id ?? client.id}`);
    }

    // ─────────────────────────────────────────────────
    // join_chat — chatga qo'shilish (yoki qayta join)
    // ─────────────────────────────────────────────────
    @SubscribeMessage('join_chat')
    async handleJoinChat(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { privateChatId: string },
    ) {
        const user = this.getUser(client);

        await this.privateChatWsService.verifyParticipant(
            data.privateChatId,
            user.id,
            user.role,
        );

        await client.join(`private:${data.privateChatId}`);
        client.emit('joined', { privateChatId: data.privateChatId });
    }

    // ─────────────────────────────────────────────────
    // leave_chat
    // ─────────────────────────────────────────────────
    @SubscribeMessage('leave_chat')
    async handleLeaveChat(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { privateChatId: string },
    ) {
        await client.leave(`private:${data.privateChatId}`);
        client.emit('left', { privateChatId: data.privateChatId });
    }

    // ─────────────────────────────────────────────────
    // send_message
    // ─────────────────────────────────────────────────
    @SubscribeMessage('send_message')
    async handleSendMessage(
        @ConnectedSocket() client: Socket,
        @MessageBody() dto: SendPrivateMessageDto,
    ) {
        const user = this.getUser(client);

        const message = await this.privateChatWsService.saveMessage(
            dto,
            user.id,
            user.role,
        );

        // Faqat shu chat room iga broadcast
        this.server.to(`private:${dto.privateChatId}`).emit('new_message', message);

        // ── Notification: qabul qiluvchiga ──────────
        // Chat dan kim ikkinchi tomonni topamiz
        const chat = await this.privateChatWsService['chatRepo']
            .findOne({ where: { id: dto.privateChatId } })
            .catch(() => null);

        if (chat) {
            const receiverId = chat.clientId === user.id ? chat.marketId : chat.clientId;
            const notif = await this.notifService.create({
                userId: receiverId,
                type: NotificationType.NEW_MESSAGE,
                senderId: user.id,
                senderType: user.role as any,
                referenceId: dto.privateChatId,
                referenceType: NotificationRefType.PRIVATE_CHAT,
                preview: message.text ?? (message.type === 'image' ? '📷 Rasm' : '🎵 Audio'),
            });
            this.notifGateway.pushToUser(receiverId, notif);
        }
    }

    // ─────────────────────────────────────────────────
    // typing
    // ─────────────────────────────────────────────────
    @SubscribeMessage('typing')
    handleTyping(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { privateChatId: string },
    ) {
        const user = this.getUser(client);
        client.to(`private:${data.privateChatId}`).emit('typing', {
            privateChatId: data.privateChatId,
            userId: user.id,
            senderType: user.role,
        });
    }

    // ─────────────────────────────────────────────────
    // stop_typing
    // ─────────────────────────────────────────────────
    @SubscribeMessage('stop_typing')
    handleStopTyping(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { privateChatId: string },
    ) {
        const user = this.getUser(client);
        client.to(`private:${data.privateChatId}`).emit('stop_typing', {
            privateChatId: data.privateChatId,
            userId: user.id,
        });
    }

    // ─────────────────────────────────────────────────
    // load_history
    // ─────────────────────────────────────────────────
    @SubscribeMessage('load_history')
    async handleLoadHistory(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { privateChatId: string; page?: number; limit?: number },
    ) {
        const user = this.getUser(client);

        const history = await this.privateChatWsService.getHistory(
            data.privateChatId,
            user.id,
            user.role,
            data.page ?? 1,
            data.limit ?? 30,
        );

        client.emit('history', history);
    }

    // ─────────────────────────────────────────────────
    // Private helpers
    // ─────────────────────────────────────────────────
    private getUser(client: Socket) {
        const user = client.data?.user;
        if (!user) throw new WsException('Unauthorized');
        return user as { id: string; role: string };
    }

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
