import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { NotificationEntity } from 'src/core/entity/notification.entity';
import { ClientEntity } from 'src/core/entity/client.entity';
import { MarketEntity } from 'src/core/entity/market.entity';
import { NotificationRefType, NotificationType, UserRole } from 'src/common/enum/index.enum';
import { successRes } from 'src/infrastructure/response/success.response';
import { FirebasePushService } from 'src/infrastructure/firebase/firebase-push.service';
import { NotificationGateway } from './notification.gateway';

export interface CreateNotificationParams {
    userId: string;
    userRole?: UserRole | null;            // qabul qiluvchi roli (token olish uchun)
    type: NotificationType;
    senderId?: string | null;
    senderType?: UserRole | null;
    senderName?: string | null;
    senderAvatar?: string | null;
    referenceId?: string | null;
    referenceType?: NotificationRefType | null;
    preview?: string | null;
}

/** NotificationType asosida push sarlavhasini qaytaradi */
function titleByType(type: NotificationType): string {
    switch (type) {
        case NotificationType.NEW_MESSAGE:
            return 'Yangi xabar 💬';
        case NotificationType.GROUP_JOIN:
            return 'Guruh bildirishi 👥';
        case NotificationType.ELON_COMMENT:
            return 'Eloningizga izoh 📢';
        case NotificationType.NEW_ELON:
            return 'Yangi elon 🏷️';
        default:
            return 'Bildirishnoma 🔔';
    }
}

@Injectable()
export class NotificationService {
    constructor(
        @InjectRepository(NotificationEntity)
        private readonly notifRepo: Repository<NotificationEntity>,

        @InjectRepository(ClientEntity)
        private readonly clientRepo: Repository<ClientEntity>,

        @InjectRepository(MarketEntity)
        private readonly marketRepo: Repository<MarketEntity>,

        private readonly firebase: FirebasePushService,

        private readonly notifGateway: NotificationGateway,
    ) { }

    // ── Notification yaratish: DB → WS → FCM ─────────
    async create(params: CreateNotificationParams): Promise<NotificationEntity> {
        // 1) DB ga saqlaymiz
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
        const saved = await this.notifRepo.save(notif);

        // 2) WebSocket orqali real-time push (user online bo'lsa)
        this.notifGateway.pushToUser(params.userId, saved);

        // 3) Firebase FCM push (user offline bo'lsa ham oladi)
        this.sendFcmPush(params).catch(() => { /* log ichida bo'ladi */ });

        return saved;
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
            where: { userId, isDeleted: false } as any,
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

        // Push updated unread count to user's WS session
        const unreadCount = await this.notifRepo.count({ where: { userId, isRead: false } });
        this.notifGateway.pushUnreadCount(userId, unreadCount);

        return successRes({ updated: true });
    }

    // ── Barchasini o'qildi belgilash ──────────────
    async markAllRead(userId: string) {
        await this.notifRepo.update({ userId, isRead: false }, { isRead: true });

        // Push count=0 to user's WS session immediately
        this.notifGateway.pushUnreadCount(userId, 0);

        return successRes({ updated: true });
    }

    // ── Private: FCM token olish va push yuborish ─
    private async sendFcmPush(params: CreateNotificationParams): Promise<void> {
        const token = await this.getFcmToken(params.userId, params.userRole);
        if (!token) return;

        const title = titleByType(params.type);
        const body = params.preview ?? title;

        await this.firebase.sendPush(
            token,
            title,
            body,
            {
                type: params.type,
                ...(params.referenceId ? { referenceId: params.referenceId } : {}),
                ...(params.referenceType ? { referenceType: params.referenceType } : {}),
            },
        );
    }

    /** userId asosida client yoki market ning fcmToken ini oladi */
    private async getFcmToken(
        userId: string,
        userRole?: UserRole | null,
    ): Promise<string | null> {
        // Agar rol ko'rsatilgan bo'lsa — to'g'ri repoda qidiradi
        if (userRole === UserRole.CLIENT) {
            const c = await this.clientRepo.findOne({
                where: { id: userId },
                select: ['fcmToken'],
            });
            return c?.fcmToken ?? null;
        }

        if (userRole === UserRole.MARKET) {
            const m = await this.marketRepo.findOne({
                where: { id: userId },
                select: ['fcmToken'],
            });
            return m?.fcmToken ?? null;
        }

        // Rol noma'lum bo'lsa — ikkisida ham qidiradi
        const client = await this.clientRepo.findOne({
            where: { id: userId },
            select: ['fcmToken'],
        });
        if (client?.fcmToken) return client.fcmToken;

        const market = await this.marketRepo.findOne({
            where: { id: userId },
            select: ['fcmToken'],
        });
        return market?.fcmToken ?? null;
    }
}
