import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';

import { MessageEntity } from 'src/core/entity/message.entity';
import { PrivateChatEntity } from 'src/core/entity/private-chat.entity';

import { SendPrivateMessageDto } from './dto/send-private-message.dto';
import { MessageType, UserRole } from 'src/common/enum/index.enum';
import { config } from 'src/config';
import { IToken } from 'src/infrastructure/token/interface';

@Injectable()
export class PrivateChatWsService {
    constructor(
        @InjectRepository(MessageEntity)
        private readonly msgRepo: Repository<MessageEntity>,

        @InjectRepository(PrivateChatEntity)
        readonly chatRepo: Repository<PrivateChatEntity>,

        private readonly jwt: JwtService,
    ) { }

    // ── JWT tekshirish ─────────────────────────────
    async verifyToken(token: string): Promise<IToken> {
        return this.jwt.verifyAsync<IToken>(token, {
            secret: config.TOKEN.ACCESS_TOKEN_KEY,
        });
    }

    // ── Foydalanuvchi chatlarini olish ─────────────
    async getUserChatIds(userId: string, role: string): Promise<string[]> {
        if (role === UserRole.ADMIN || role === UserRole.SUPERADMIN) {
            const rows = await this.chatRepo
                .createQueryBuilder('c')
                .select('c.id', 'id')
                .andWhere('c.isDeleted = false')
                .getRawMany<{ id: string }>();
            return rows.map((r) => r.id);
        }

        const rows = await this.chatRepo
            .createQueryBuilder('c')
            .select('c.id', 'id')
            .where('c.clientId = :userId OR c.marketId = :userId', { userId })
            .andWhere('c.isDeleted = false')
            .getRawMany<{ id: string }>();

        return rows.map((r) => r.id);
    }

    // ── Chat mavjudligini va foydalanuvchi ishtirokini tekshirish
    async verifyParticipant(privateChatId: string, userId: string, role: string): Promise<void> {
        const chat = await this.chatRepo.findOne({ where: { id: privateChatId, isDeleted: false } });
        if (!chat) throw new BadRequestException('Private chat not found');

        const isAdmin = role === UserRole.ADMIN || role === UserRole.SUPERADMIN;
        const isParticipant = chat.clientId === userId || chat.marketId === userId;

        if (!isAdmin && !isParticipant) {
            throw new ForbiddenException('You are not a participant of this chat');
        }
    }

    // ── Xabar saqlash ─────────────────────────────
    async saveMessage(
        dto: SendPrivateMessageDto,
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

        await this.verifyParticipant(dto.privateChatId, senderId, senderRole);

        const msg = this.msgRepo.create({
            privateChatId: dto.privateChatId,
            commentId: null,
            groupId: null,

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
        privateChatId: string,
        userId: string,
        role: string,
        page: number = 1,
        limit: number = 30,
    ): Promise<{ data: MessageEntity[]; total: number; page: number; limit: number }> {
        await this.verifyParticipant(privateChatId, userId, role);

        const [data, total] = await this.msgRepo.findAndCount({
            where: { privateChatId },
            order: { createdAt: 'ASC' },
            skip: (page - 1) * limit,
            take: limit,
        });

        return { data, total, page, limit };
    }
}
