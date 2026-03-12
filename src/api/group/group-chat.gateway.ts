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

import { GroupChatService } from './group-chat.service';
import { SendGroupMessageDto } from './dto/send-group-message.dto';
import { NotificationService } from '../notification/notification.service';
import { NotificationGateway } from '../notification/notification.gateway';
import { MessageStatus, NotificationRefType, NotificationType } from 'src/common/enum/index.enum';

/**
 * GROUP CHAT GATEWAY
 * Namespace: /group-chat
 *
 * ─── Room strategiyasi ────────────────────────────
 *   "group:{groupId}"
 *
 * ─── Client → Server eventlar ────────────────────
 *   join_group    { groupId }
 *   leave_group   { groupId }
 *   send_message  { groupId, type, text?, mediaPath?, replyToId? }
 *   typing        { groupId }
 *   stop_typing   { groupId }
 *   load_history  { groupId, page?, limit? }
 *
 * ─── Server → Client eventlar ────────────────────
 *   joined        { groupId }
 *   left          { groupId }
 *   new_message   { ...MessageEntity }
 *   history       { data[], total, page, limit }
 *   typing        { groupId, userId, senderType }
 *   stop_typing   { groupId, userId }
 *   error         { message }
 */
@WebSocketGateway({
    namespace: '/group-chat',
    cors: { origin: '*', credentials: true },
    transports: ['websocket', 'polling'],
})
export class GroupChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    constructor(
        private readonly groupChatService: GroupChatService,
        private readonly notifService: NotificationService,
        private readonly notifGateway: NotificationGateway,
    ) { }

    // ─────────────────────────────────────────────────
    // Ulanish: JWT tekshiriladi, barcha guruhlarga join
    // ─────────────────────────────────────────────────
    async handleConnection(client: Socket) {
        try {
            const token = this.extractToken(client);
            if (!token) {
                this.reject(client, 'Authorization token missing');
                return;
            }

            const user = await this.groupChatService.verifyToken(token);
            client.data.user = user;  // barcha handlerlarda client.data.user ishlatiladi

            // A'zo guruhlarni avtomatik room'larga qo'shamiz
            const groupIds = await this.groupChatService.getUserGroupIds(user.id, user.role);
            for (const gid of groupIds) {
                await client.join(`group:${gid}`);
            }

            // Avtomatik DELIVERED statusi
            await this.groupChatService.markMessagesAsDelivered(user.id, user.role);

            console.log(`[GroupChat] +connect  ${user.id} (${user.role}) | rooms: ${groupIds.length}`);
        } catch {
            this.reject(client, 'Invalid or expired token');
        }
    }

    handleDisconnect(client: Socket) {
        const user = client.data?.user;
        console.log(`[GroupChat] -disconnect ${user?.id ?? client.id}`);
    }

    // ─────────────────────────────────────────────────
    // join_group — qo'shimcha guruhga qo'shilish
    // (connect da avtomatik qo'shiladi, bu yangi guruh
    //  qo'shilganda yoki qayta kirish kerak bo'lganda)
    // ─────────────────────────────────────────────────
    @SubscribeMessage('join_group')
    async handleJoinGroup(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { groupId: string },
    ) {
        const user = this.getUser(client);
        const { groupId } = data;

        const isMember = await this.groupChatService.isMember(groupId, user.id, user.role);
        if (!isMember) throw new WsException('You are not a member of this group');

        await client.join(`group:${groupId}`);

        // Avtomatik o'qilgan deb belgilash
        await this.groupChatService.markMessagesAsSeen(groupId, user.id);

        // Boshqalarga xabar berish
        client.to(`group:${groupId}`).emit('messages_seen', {
            groupId,
            readerId: user.id
        });

        client.emit('joined', { groupId });
    }

    // ─────────────────────────────────────────────────
    // leave_group — room'dan chiqish
    // ─────────────────────────────────────────────────
    @SubscribeMessage('leave_group')
    async handleLeaveGroup(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { groupId: string },
    ) {
        await client.leave(`group:${data.groupId}`);
        client.emit('left', { groupId: data.groupId });
    }

    // ─────────────────────────────────────────────────
    // send_message — xabar yuborish
    // ─────────────────────────────────────────────────
    @SubscribeMessage('send_message')
    async handleSendMessage(
        @ConnectedSocket() client: Socket,
        @MessageBody() dto: SendGroupMessageDto,
    ) {
        const user = this.getUser(client);

        const isMember = await this.groupChatService.isMember(dto.groupId, user.id, user.role);
        if (!isMember) throw new WsException('You are not a member of this group');

        const message = await this.groupChatService.saveMessage(dto, user.id, user.role);

        // Room dagi HAMMA ga broadcast (o'zi ham oladi)
        this.server.to(`group:${dto.groupId}`).emit('new_message', message);

        // ── Notification: yuboruvchidan boshqa barcha a'zolarga ──
        const memberIds = await this.groupChatService.getGroupMemberIds(dto.groupId);
        const preview = message.text ?? (message.type === 'image' ? '📷 Rasm' : '🎵 Audio');

        await Promise.all(
            memberIds
                .filter((id) => id !== user.id)  // o'ziga yubormaymiz
                .map(async (memberId) => {
                    const notif = await this.notifService.create({
                        userId: memberId,
                        type: NotificationType.NEW_MESSAGE,
                        senderId: user.id,
                        senderType: user.role as any,
                        referenceId: dto.groupId,
                        referenceType: NotificationRefType.GROUP,
                        preview,
                    });
                    this.notifGateway.pushToUser(memberId, notif);
                }),
        );
    }

    // ─────────────────────────────────────────────────
    // typing — "yozmoqda..." (faqat boshqalarga)
    // ─────────────────────────────────────────────────
    @SubscribeMessage('typing')
    handleTyping(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { groupId: string },
    ) {
        const user = this.getUser(client);
        // client.to() — o'zidan boshqa hamma
        client.to(`group:${data.groupId}`).emit('typing', {
            groupId: data.groupId,
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
        @MessageBody() data: { groupId: string },
    ) {
        const user = this.getUser(client);
        client.to(`group:${data.groupId}`).emit('stop_typing', {
            groupId: data.groupId,
            userId: user.id,
        });
    }

    // ─────────────────────────────────────────────────
    // load_history — pagination bilan tarix
    // ─────────────────────────────────────────────────
    @SubscribeMessage('load_history')
    async handleLoadHistory(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { groupId: string; page?: number; limit?: number },
    ) {
        const user = this.getUser(client);

        const isMember = await this.groupChatService.isMember(data.groupId, user.id, user.role);
        if (!isMember) throw new WsException('You are not a member of this group');

        const history = await this.groupChatService.getHistory(
            data.groupId,
            data.page ?? 1,
            data.limit ?? 30,
        );

        // Faqat so'ragan clientga qaytaramiz
        client.emit('history', history);
    }

    // ─────────────────────────────────────────────────
    // Private yordamchi metodlar
    // ─────────────────────────────────────────────────

    /** Har bir handlerda autentifikatsiya qilingan userni olish */
    private getUser(client: Socket) {
        const user = client.data?.user;
        if (!user) throw new WsException('Unauthorized');
        return user as { id: string; role: string };
    }

    /** Token yechib olish: handshake.auth.token | Authorization header */
    private extractToken(client: Socket): string | null {
        const authToken = client.handshake.auth?.token as string | undefined;
        if (authToken) return authToken;

        const header = client.handshake.headers?.authorization as string | undefined;
        if (header?.startsWith('Bearer ')) return header.slice(7);

        const queryToken = client.handshake.query?.token;
        if (queryToken) return queryToken as string;

        return null;
    }

    /** Xato bilan disconnect */
    private reject(client: Socket, message: string) {
        client.emit('error', { message });
        client.disconnect();
    }
}
