import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';

import { MessageEntity } from 'src/core/entity/message.entity';
import { CommentEntity } from 'src/core/entity/comment.entity';

import { SendCommentMessageDto } from './dto/send-comment-message.dto';
import { MessageStatus, MessageType, UserRole } from 'src/common/enum/index.enum';
import { config } from 'src/config';
import { IToken } from 'src/infrastructure/token/interface';

@Injectable()
export class CommentChatService {
    constructor(
        @InjectRepository(MessageEntity)
        private readonly msgRepo: Repository<MessageEntity>,

        @InjectRepository(CommentEntity)
        private readonly commentRepo: Repository<CommentEntity>,

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

    // ── Xabar saqlash (scope = comment) ───────────
    async saveMessage(
        dto: SendCommentMessageDto,
        senderId: string,
        senderRole: string,
    ): Promise<MessageEntity> {
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

        return this.msgRepo.save(msg);
    }

    // ── Xabarlar tarixi (pagination) ──────────────
    async getHistory(
        commentId: string,
        page: number = 1,
        limit: number = 30,
    ): Promise<{ data: MessageEntity[]; total: number; page: number; limit: number }> {
        const [data, total] = await this.msgRepo.findAndCount({
            where: { commentId, isDeleted: false },
            order: { createdAt: 'ASC' },
            skip: (page - 1) * limit,
            take: limit,
        });

        return { data, total, page, limit };
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
