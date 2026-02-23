import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';

import { MessageEntity } from 'src/core/entity/message.entity';
import { GroupEntity } from 'src/core/entity/group.entity';

import { SendGroupMessageDto } from './dto/send-group-message.dto';
import { MessageType, UserRole } from 'src/common/enum/index.enum';
import { config } from 'src/config';
import { IToken } from 'src/infrastructure/token/interface';

@Injectable()
export class GroupChatService {
    constructor(
        @InjectRepository(MessageEntity)
        private readonly msgRepo: Repository<MessageEntity>,

        @InjectRepository(GroupEntity)
        private readonly groupRepo: Repository<GroupEntity>,

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
    // MARKET → group_market junction table orqali
    // ADMIN/SUPERADMIN → barcha guruhlar
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
    // Xabarni DB ga saqlash (MessageEntity, scope: group)
    // ─────────────────────────────────────────────────
    async saveMessage(
        dto: SendGroupMessageDto,
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

        return this.msgRepo.save(msg);
    }

    // ─────────────────────────────────────────────────
    // Xabarlar tarixi (pagination)
    // ─────────────────────────────────────────────────
    async getHistory(
        groupId: string,
        page: number = 1,
        limit: number = 30,
    ): Promise<{ data: MessageEntity[]; total: number; page: number; limit: number }> {
        const [data, total] = await this.msgRepo.findAndCount({
            where: { groupId },
            order: { createdAt: 'DESC' },
            skip: (page - 1) * limit,
            take: limit,
        });

        return { data: data.reverse(), total, page, limit };
    }
}
