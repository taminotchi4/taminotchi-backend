import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';

import { MessageEntity } from 'src/core/entity/message.entity';
import { CommentEntity } from 'src/core/entity/comment.entity';
import { ClientEntity } from 'src/core/entity/client.entity';
import { MarketEntity } from 'src/core/entity/market.entity';
import { AdminEntity } from 'src/core/entity/admin.entity';

import { SendCommentMessageDto } from './dto/send-comment-message.dto';
import { MessageStatus, MessageType, UserRole } from 'src/common/enum/index.enum';
import { config } from 'src/config';
import { IToken } from 'src/infrastructure/token/interface';

export type MessageWithSender = MessageEntity & { sender: object | null };

@Injectable()
export class CommentChatService {
    constructor(
        @InjectRepository(MessageEntity)
        private readonly msgRepo: Repository<MessageEntity>,

        @InjectRepository(CommentEntity)
        private readonly commentRepo: Repository<CommentEntity>,

        @InjectRepository(ClientEntity)
        private readonly clientRepo: Repository<ClientEntity>,

        @InjectRepository(MarketEntity)
        private readonly marketRepo: Repository<MarketEntity>,

        @InjectRepository(AdminEntity)
        private readonly adminRepo: Repository<AdminEntity>,

        private readonly jwt: JwtService,
    ) { }

    // ── JWT tekshirish ─────────────────────────────
    async verifyToken(token: string): Promise<IToken> {
        return this.jwt.verifyAsync<IToken>(token, {
            secret: config.TOKEN.ACCESS_TOKEN_KEY,
        });
    }

    // ── Comment mavjudligini tekshirish ────────────
    async getComment(commentId: string): Promise<CommentEntity> {
        const comment = await this.commentRepo.findOne({ where: { id: commentId, isDeleted: false } });
        if (!comment) throw new NotFoundException('Comment not found');
        return comment;
    }

    // ── Sender ma'lumotlarini olish (polymorphic) ──
    private async getSender(senderId: string | null, senderType: UserRole | null): Promise<object | null> {
        if (!senderId || !senderType) return null;

        if (senderType === UserRole.CLIENT) {
            const client = await this.clientRepo.findOne({ where: { id: senderId } });
            if (!client) return null;
            return {
                id: client.id,
                fullName: client.fullName,
                username: client.username,
                phoneNumber: client.phoneNumber,
                photoPath: client.photoPath,
                role: client.role,
            };
        }

        if (senderType === UserRole.MARKET) {
            const market = await this.marketRepo.findOne({ where: { id: senderId } });
            if (!market) return null;
            return {
                id: market.id,
                name: market.name,
                username: market.username,
                phoneNumber: market.phoneNumber,
                photoPath: market.photoPath,
                role: market.role,
            };
        }

        if (senderType === UserRole.ADMIN || senderType === UserRole.SUPERADMIN) {
            const admin = await this.adminRepo.findOne({ where: { id: senderId } });
            if (!admin) return null;
            return {
                id: admin.id,
                username: admin.username,
                phoneNumber: admin.phoneNumber,
                role: admin.role,
            };
        }

        return null;
    }

    // ── Message ga sender qo'shish ─────────────────
    private async enrichWithSender(message: MessageEntity): Promise<MessageWithSender> {
        const sender = await this.getSender(message.senderId, message.senderType);
        return Object.assign(message, { sender });
    }

    // ── Batch enrichment (getHistory uchun) ───────
    private async enrichMany(messages: MessageEntity[]): Promise<MessageWithSender[]> {
        return Promise.all(messages.map((m) => this.enrichWithSender(m)));
    }

    // ── Xabar saqlash (scope = comment) ───────────
    async saveMessage(
        dto: SendCommentMessageDto,
        senderId: string,
        senderRole: string,
    ): Promise<MessageWithSender> {
        if (dto.type === MessageType.TEXT && !dto.text?.trim()) {
            throw new BadRequestException('Text message cannot be empty');
        }
        if (
            (dto.type === MessageType.IMAGE || dto.type === MessageType.AUDIO) &&
            !dto.mediaPath
        ) {
            throw new BadRequestException('mediaPath required for image/audio');
        }

        // Comment mavjudligini tekshiramiz
        await this.getComment(dto.commentId);

        const msg = this.msgRepo.create({
            // scope = comment
            commentId: dto.commentId,
            groupId: null,
            privateChatId: null,

            senderType: senderRole as UserRole,
            senderId,
            type: dto.type,
            text: dto.text?.trim() ?? null,
            mediaPath: dto.mediaPath ?? null,
            replyToId: dto.replyToId ?? null,
        });

        const saved = await this.msgRepo.save(msg);
        return this.enrichWithSender(saved);
    }

    // ── Xabarlar tarixi (pagination) ──────────────
    async getHistory(
        commentId: string,
        page: number = 1,
        limit: number = 30,
    ): Promise<{ data: MessageWithSender[]; total: number; page: number; limit: number }> {
        const [data, total] = await this.msgRepo.findAndCount({
            where: { commentId, isDeleted: false },
            order: { createdAt: 'ASC' },
            skip: (page - 1) * limit,
            take: limit,
        });

        return { data: await this.enrichMany(data), total, page, limit };
    }

    // ── Comment xabarlarini o'qilgan deb belgilash ───
    async markMessagesAsSeen(commentId: string, readerId: string): Promise<void> {
        await this.msgRepo
            .createQueryBuilder()
            .update(MessageEntity)
            .set({ status: MessageStatus.SEEN })
            .where('commentId = :commentId', { commentId })
            .andWhere('senderId != :readerId', { readerId })
            .andWhere('status != :status', { status: MessageStatus.SEEN })
            .execute();
    }

    // ── Comment xabarlarini yetkazildi deb belgilash ───
    async markMessagesAsDelivered(userId: string): Promise<void> {
        await this.msgRepo
            .createQueryBuilder()
            .update(MessageEntity)
            .set({ status: MessageStatus.DELIVERED })
            .where('commentId IS NOT NULL')
            .andWhere('senderId != :userId', { userId })
            .andWhere('status = :status', { status: MessageStatus.SENT })
            .execute();
    }
}
