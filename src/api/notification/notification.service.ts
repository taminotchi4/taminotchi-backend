import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { NotificationEntity } from 'src/core/entity/notification.entity';
import { NotificationRefType, NotificationType, UserRole } from 'src/common/enum/index.enum';
import { successRes } from 'src/infrastructure/response/success.response';

export interface CreateNotificationParams {
    userId: string;
    type: NotificationType;
    senderId?: string | null;
    senderType?: UserRole | null;
    senderName?: string | null;
    senderAvatar?: string | null;
    referenceId?: string | null;
    referenceType?: NotificationRefType | null;
    preview?: string | null;
}

@Injectable()
export class NotificationService {
    constructor(
        @InjectRepository(NotificationEntity)
        private readonly notifRepo: Repository<NotificationEntity>,
    ) { }

    // ── Notification yaratish va DB ga saqlash ─────
    async create(params: CreateNotificationParams): Promise<NotificationEntity> {
        const notif = this.notifRepo.create({
            userId: params.userId,
            type: params.type,
            senderId: params.senderId ?? null,
            senderType: params.senderType ?? null,
            senderName: params.senderName ?? null,
            senderAvatar: params.senderAvatar ?? null,
            referenceId: params.referenceId ?? null,
            referenceType: params.referenceType ?? null,
            preview: params.preview ? params.preview.slice(0, 100) : null,
            isRead: false,
        });
        return this.notifRepo.save(notif);
    }

    // ── O'qilmagan notification soni (badge) ──────
    async getUnreadCount(userId: string) {
        const count = await this.notifRepo.count({
            where: { userId, isRead: false },
        });
        return successRes({ count });
    }

    // ── Foydalanuvchining notifikatsiyalari ───────
    async getMyNotifications(userId: string, page = 1, limit = 20) {
        const [data, total] = await this.notifRepo.findAndCount({
            where: { userId },
            order: { createdAt: 'DESC' },
            skip: (page - 1) * limit,
            take: limit,
        });
        return successRes({ data, total, page, limit });
    }

    // ── Bitta notifikatsiyani o'qildi belgilash ───
    async markRead(id: string, userId: string) {
        const notif = await this.notifRepo.findOne({
            where: { id, userId },
        });
        if (!notif) return successRes({ updated: false });
        notif.isRead = true;
        await this.notifRepo.save(notif);
        return successRes({ updated: true });
    }

    // ── Barchasini o'qildi belgilash ──────────────
    async markAllRead(userId: string) {
        await this.notifRepo.update({ userId, isRead: false }, { isRead: true });
        return successRes({ updated: true });
    }
}
