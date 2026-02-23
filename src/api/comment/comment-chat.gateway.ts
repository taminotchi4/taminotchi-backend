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

import { CommentChatService } from './comment-chat.service';
import { SendCommentMessageDto } from './dto/send-comment-message.dto';

/**
 * COMMENT CHAT GATEWAY
 * Namespace: /comment-chat
 *
 * ─── Room strategiyasi ────────────────────────────
 *   "comment:{commentId}"
 *
 * ─── Client → Server eventlar ────────────────────
 *   join_comment   { commentId }
 *   leave_comment  { commentId }
 *   send_message   { commentId, type, text?, mediaPath?, replyToId? }
 *   typing         { commentId }
 *   stop_typing    { commentId }
 *   load_history   { commentId, page?, limit? }
 *
 * ─── Server → Client eventlar ────────────────────
 *   joined         { commentId }
 *   left           { commentId }
 *   new_message    { ...MessageEntity }
 *   history        { data[], total, page, limit }
 *   typing         { commentId, userId, senderType }
 *   stop_typing    { commentId, userId }
 *   error          { message }
 *
 * Kimlar ulanishi mumkin?
 *   Client (USER) va Market (MARKET) — hech qanday a'zolik tekshiruvi yo'q,
 *   comment ochiq bo'lsa istalgan autentifikatsiya qilingan foydalanuvchi
 *   yoza oladi.
 */
@WebSocketGateway({
    namespace: '/comment-chat',
    cors: { origin: '*', credentials: true },
    transports: ['websocket', 'polling'],
})
export class CommentChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    constructor(private readonly commentChatService: CommentChatService) { }

    // ─────────────────────────────────────────────────
    // Ulanish: JWT tekshiriladi
    // ─────────────────────────────────────────────────
    async handleConnection(client: Socket) {
        try {
            const token = this.extractToken(client);
            if (!token) {
                this.reject(client, 'Authorization token missing');
                return;
            }

            const user = await this.commentChatService.verifyToken(token);
            client.data.user = user;

            console.log(`[CommentChat] +connect  ${user.id} (${user.role})`);
        } catch {
            this.reject(client, 'Invalid or expired token');
        }
    }

    handleDisconnect(client: Socket) {
        const user = client.data?.user;
        console.log(`[CommentChat] -disconnect ${user?.id ?? client.id}`);
    }

    // ─────────────────────────────────────────────────
    // join_comment — comment room ga qo'shilish
    // ─────────────────────────────────────────────────
    @SubscribeMessage('join_comment')
    async handleJoinComment(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { commentId: string },
    ) {
        // Comment mavjudligini tekshiramiz
        await this.commentChatService.getComment(data.commentId);

        await client.join(`comment:${data.commentId}`);
        client.emit('joined', { commentId: data.commentId });
    }

    // ─────────────────────────────────────────────────
    // leave_comment
    // ─────────────────────────────────────────────────
    @SubscribeMessage('leave_comment')
    async handleLeaveComment(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { commentId: string },
    ) {
        await client.leave(`comment:${data.commentId}`);
        client.emit('left', { commentId: data.commentId });
    }

    // ─────────────────────────────────────────────────
    // send_message — xabar yuborish
    // ─────────────────────────────────────────────────
    @SubscribeMessage('send_message')
    async handleSendMessage(
        @ConnectedSocket() client: Socket,
        @MessageBody() dto: SendCommentMessageDto,
    ) {
        const user = this.getUser(client);

        const message = await this.commentChatService.saveMessage(dto, user.id, user.role);

        // Room dagi hamma ga broadcast (o'zi ham oladi)
        this.server.to(`comment:${dto.commentId}`).emit('new_message', message);
    }

    // ─────────────────────────────────────────────────
    // typing — "yozmoqda..." (faqat boshqalarga)
    // ─────────────────────────────────────────────────
    @SubscribeMessage('typing')
    handleTyping(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { commentId: string },
    ) {
        const user = this.getUser(client);
        client.to(`comment:${data.commentId}`).emit('typing', {
            commentId: data.commentId,
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
        @MessageBody() data: { commentId: string },
    ) {
        const user = this.getUser(client);
        client.to(`comment:${data.commentId}`).emit('stop_typing', {
            commentId: data.commentId,
            userId: user.id,
        });
    }

    // ─────────────────────────────────────────────────
    // load_history — pagination bilan tarix
    // ─────────────────────────────────────────────────
    @SubscribeMessage('load_history')
    async handleLoadHistory(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { commentId: string; page?: number; limit?: number },
    ) {
        // Comment mavjudligini tekshiramiz
        await this.commentChatService.getComment(data.commentId);

        const history = await this.commentChatService.getHistory(
            data.commentId,
            data.page ?? 1,
            data.limit ?? 30,
        );

        client.emit('history', history);
    }

    // ─────────────────────────────────────────────────
    // Private yordamchi metodlar
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
