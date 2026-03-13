import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';

import { MessageEntity } from 'src/core/entity/message.entity';
import { PrivateChatEntity } from 'src/core/entity/private-chat.entity';
import { ClientEntity } from 'src/core/entity/client.entity';
import { MarketEntity } from 'src/core/entity/market.entity';
import { AdminEntity } from 'src/core/entity/admin.entity';

import { SendPrivateMessageDto } from './dto/send-private-message.dto';
import { MessageStatus, MessageType, UserRole } from 'src/common/enum/index.enum';
import { config } from 'src/config';
import { IToken } from 'src/infrastructure/token/interface';

export type MessageWithSender = MessageEntity & { sender: object | null };

@Injectable()
export class PrivateChatWsService {
    constructor(
        @InjectRepository(MessageEntity)
        private readonly msgRepo: Repository<MessageEntity>,

        @InjectRepository(PrivateChatEntity)
        readonly chatRepo: Repository<PrivateChatEntity>,

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

    // ── Xabar saqlash ─────────────────────────────
    async saveMessage(
        dto: SendPrivateMessageDto,
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

        const saved = await this.msgRepo.save(msg);
        return this.enrichWithSender(saved);
    }

    // ── Xabarlar tarixi (pagination) ──────────────
    async getHistory(
        privateChatId: string,
        userId: string,
        role: string,
        page: number = 1,
        limit: number = 30,
    ): Promise<{ data: MessageWithSender[]; total: number; page: number; limit: number }> {
        await this.verifyParticipant(privateChatId, userId, role);

        const [data, total] = await this.msgRepo.findAndCount({
            where: { privateChatId },
            order: { createdAt: 'ASC' },
            skip: (page - 1) * limit,
            take: limit,
        });

        return { data: await this.enrichMany(data), total, page, limit };
    }

    // ── Chat xabarlarini o'qilgan deb belgilash ───
    async markMessagesAsSeen(privateChatId: string, readerId: string): Promise<void> {
        await this.msgRepo
            .createQueryBuilder()
            .update(MessageEntity)
            .set({ status: MessageStatus.SEEN })
            .where('privateChatId = :privateChatId', { privateChatId })
            .andWhere('senderId != :readerId', { readerId })
            .andWhere('status != :status', { status: MessageStatus.SEEN })
            .execute();
    }

    // ── Xabarlarni yetkazildi deb belgilash (ulangan paytda) ──
    async markMessagesAsDelivered(userId: string): Promise<void> {
        await this.msgRepo
            .createQueryBuilder()
            .update(MessageEntity)
            .set({ status: MessageStatus.DELIVERED })
            .where('privateChatId IS NOT NULL')
            .andWhere('senderId != :userId', { userId })
            .andWhere('status = :status', { status: MessageStatus.SENT })
            .execute();
    }
}
