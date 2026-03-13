import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';

import { MessageEntity } from 'src/core/entity/message.entity';
import { GroupEntity } from 'src/core/entity/group.entity';
import { ClientEntity } from 'src/core/entity/client.entity';
import { MarketEntity } from 'src/core/entity/market.entity';
import { AdminEntity } from 'src/core/entity/admin.entity';

import { SendGroupMessageDto } from './dto/send-group-message.dto';
import { MessageStatus, MessageType, UserRole } from 'src/common/enum/index.enum';
import { config } from 'src/config';
import { IToken } from 'src/infrastructure/token/interface';

export type MessageWithSender = MessageEntity & { sender: object | null };

@Injectable()
export class GroupChatService {
    constructor(
        @InjectRepository(MessageEntity)
        private readonly msgRepo: Repository<MessageEntity>,

        @InjectRepository(GroupEntity)
        private readonly groupRepo: Repository<GroupEntity>,

        @InjectRepository(ClientEntity)
        private readonly clientRepo: Repository<ClientEntity>,

        @InjectRepository(MarketEntity)
        private readonly marketRepo: Repository<MarketEntity>,

        @InjectRepository(AdminEntity)
        private readonly adminRepo: Repository<AdminEntity>,

        private readonly jwt: JwtService,
    ) { }

    // ─────────────────────────────────────────────────
    // JWT tekshirish (handleConnection da ishlatiladi)
    // ─────────────────────────────────────────────────
    async verifyToken(token: string): Promise<IToken> {
        return this.jwt.verifyAsync<IToken>(token, {
            secret: config.TOKEN.ACCESS_TOKEN_KEY,
        });
    }

    // ─────────────────────────────────────────────────
    // Foydalanuvchi a'zo bo'lgan guruh IDlarini olish
    // ─────────────────────────────────────────────────
    async getUserGroupIds(userId: string, role: string): Promise<string[]> {
        if (role === UserRole.MARKET) {
            const rows = await this.groupRepo
                .createQueryBuilder('g')
                .innerJoin('g.markets', 'm', 'm.id = :userId', { userId })
                .select('g.id', 'id')
                .getRawMany<{ id: string }>();

            return rows.map((r) => r.id);
        }

        // ADMIN / SUPERADMIN → barcha guruhlar
        const rows = await this.groupRepo
            .createQueryBuilder('g')
            .select('g.id', 'id')
            .getRawMany<{ id: string }>();

        return rows.map((r) => r.id);
    }

    // ─────────────────────────────────────────────────
    // A'zolikni tekshirish
    // ─────────────────────────────────────────────────
    async isMember(groupId: string, userId: string, role: string): Promise<boolean> {
        if (role === UserRole.ADMIN || role === UserRole.SUPERADMIN) return true;

        const count = await this.groupRepo
            .createQueryBuilder('g')
            .innerJoin('g.markets', 'm', 'm.id = :userId', { userId })
            .where('g.id = :groupId', { groupId })
            .getCount();

        return count > 0;
    }

    // ─────────────────────────────────────────────────
    // Guruh a'zolari IDlari (notification uchun)
    // ─────────────────────────────────────────────────
    async getGroupMemberIds(groupId: string): Promise<string[]> {
        const rows = await this.groupRepo
            .createQueryBuilder('g')
            .innerJoin('g.markets', 'm')
            .select('m.id', 'id')
            .where('g.id = :groupId', { groupId })
            .getRawMany<{ id: string }>();
        return rows.map((r) => r.id);
    }

    // ─────────────────────────────────────────────────
    // Sender ma'lumotlarini olish (polymorphic)
    // ─────────────────────────────────────────────────
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

    // ─────────────────────────────────────────────────
    // Xabarni DB ga saqlash (MessageEntity, scope: group)
    // ─────────────────────────────────────────────────
    async saveMessage(
        dto: SendGroupMessageDto,
        senderId: string,
        senderRole: string,
    ): Promise<MessageWithSender> {
        const group = await this.groupRepo.findOne({
            where: { id: dto.groupId, isDeleted: false },
        });

        if (!group) throw new NotFoundException('Group not found');

        const member = await this.isMember(dto.groupId, senderId, senderRole);
        if (!member) throw new ForbiddenException('You are not a member of this group');

        if (dto.type === MessageType.TEXT && !dto.text?.trim()) {
            throw new BadRequestException('Text message cannot be empty');
        }
        if (
            (dto.type === MessageType.IMAGE || dto.type === MessageType.AUDIO) &&
            !dto.mediaPath
        ) {
            throw new BadRequestException('mediaPath required for image/audio');
        }

        const msg = this.msgRepo.create({
            // scope = group
            groupId: dto.groupId,
            commentId: null,
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

    // ─────────────────────────────────────────────────
    // Xabarlar tarixi (pagination)
    // ─────────────────────────────────────────────────
    async getHistory(
        groupId: string,
        page: number = 1,
        limit: number = 30,
    ): Promise<{ data: MessageWithSender[]; total: number; page: number; limit: number }> {
        const [data, total] = await this.msgRepo.findAndCount({
            where: { groupId },
            order: { createdAt: 'DESC' },
            skip: (page - 1) * limit,
            take: limit,
        });

        return { data: await this.enrichMany(data.reverse()), total, page, limit };
    }

    // ── Guruh xabarlarini o'qilgan deb belgilash ───
    async markMessagesAsSeen(groupId: string, readerId: string): Promise<void> {
        await this.msgRepo
            .createQueryBuilder()
            .update(MessageEntity)
            .set({ status: MessageStatus.SEEN })
            .where('groupId = :groupId', { groupId })
            .andWhere('senderId != :readerId', { readerId })
            .andWhere('status != :status', { status: MessageStatus.SEEN })
            .execute();
    }

    // ── Guruh xabarlarini yetkazildi deb belgilash ───
    async markMessagesAsDelivered(userId: string, role: string): Promise<void> {
        const groupIds = await this.getUserGroupIds(userId, role);
        if (groupIds.length === 0) return;

        await this.msgRepo
            .createQueryBuilder()
            .update(MessageEntity)
            .set({ status: MessageStatus.DELIVERED })
            .where('groupId IN (:...groupIds)', { groupIds })
            .andWhere('senderId != :userId', { userId })
            .andWhere('status = :status', { status: MessageStatus.SENT })
            .execute();
    }
}
