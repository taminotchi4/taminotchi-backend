import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';

/**
 * MessageBroadcastService
 *
 * Routes WS broadcast events (message_updated, message_deleted) to the correct
 * room based on the scope of the message:
 *   - commentId     → "comment:{commentId}"
 *   - privateChatId → "private:{privateChatId}"
 *   - groupId       → "group:{groupId}"
 *
 * Each gateway registers its server instance here on init.
 */
@Injectable()
export class MessageBroadcastService {
    private commentServer: Server | null = null;
    private privateServer: Server | null = null;
    private groupServer: Server | null = null;

    registerCommentServer(server: Server) { this.commentServer = server; }
    registerPrivateServer(server: Server) { this.privateServer = server; }
    registerGroupServer(server: Server) { this.groupServer = server; }

    /**
     * Route a message_updated broadcast to the correct room.
     * @param message - must have at least one of commentId | privateChatId | groupId
     */
    broadcastUpdated(message: {
        id: string;
        text: string | null;
        updatedAt: Date;
        commentId?: string | null;
        privateChatId?: string | null;
        groupId?: string | null;
    }) {
        const payload = { messageId: message.id, text: message.text, updatedAt: message.updatedAt };

        if (message.commentId && this.commentServer) {
            this.commentServer.to(`comment:${message.commentId}`).emit('message_updated', payload);
        } else if (message.privateChatId && this.privateServer) {
            this.privateServer.to(`private:${message.privateChatId}`).emit('message_updated', payload);
        } else if (message.groupId && this.groupServer) {
            this.groupServer.to(`group:${message.groupId}`).emit('message_updated', payload);
        }
    }

    /**
     * Route a message_deleted broadcast to the correct room.
     * @param message - must have at least one of commentId | privateChatId | groupId
     */
    broadcastDeleted(message: {
        id: string;
        commentId?: string | null;
        privateChatId?: string | null;
        groupId?: string | null;
    }) {
        const payload = { messageId: message.id };

        if (message.commentId && this.commentServer) {
            this.commentServer.to(`comment:${message.commentId}`).emit('message_deleted', payload);
        } else if (message.privateChatId && this.privateServer) {
            this.privateServer.to(`private:${message.privateChatId}`).emit('message_deleted', payload);
        } else if (message.groupId && this.groupServer) {
            this.groupServer.to(`group:${message.groupId}`).emit('message_deleted', payload);
        }
    }
}
