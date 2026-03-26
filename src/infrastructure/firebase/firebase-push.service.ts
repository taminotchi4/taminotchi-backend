import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';
import { config } from 'src/config';

@Injectable()
export class FirebasePushService implements OnModuleInit {
    private readonly logger = new Logger(FirebasePushService.name);
    private initialized = false;

    onModuleInit() {
        // Agar firebase-admin allaqachon initialized bo'lsa qayta qilmaymiz
        if (admin.apps.length > 0) {
            this.initialized = true;
            return;
        }

        const credPath = path.resolve(config.FIREBASE.CREDENTIALS_PATH);

        if (!fs.existsSync(credPath)) {
            this.logger.warn(
                `[Firebase] serviceAccountKey.json topilmadi: ${credPath}. Push notification o'chirilgan.`,
            );
            return;
        }

        try {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const serviceAccount = require(credPath);
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
            });
            this.initialized = true;
            this.logger.log('[Firebase] Firebase Admin SDK muvaffaqiyatli ishga tushdi.');
        } catch (err) {
            this.logger.error('[Firebase] Firebase Admin SDK ishga tushishda xato:', err);
        }
    }

    /**
     * Bitta FCM tokenga push yuboradi.
     * @param token   - FCM device token
     * @param title   - Bildirishnoma sarlavhasi
     * @param body    - Bildirishnoma matni
     * @param data    - Ixtiyoriy qo'shimcha ma'lumotlar (key-value string pairs)
     */
    async sendPush(
        token: string,
        title: string,
        body: string,
        data?: Record<string, string>,
    ): Promise<void> {
        if (!this.initialized) return;
        if (!token?.trim()) return;

        const message: admin.messaging.Message = {
            token,
            notification: { title, body },
            data: data ?? {},
            android: {
                priority: 'high',
                notification: {
                    sound: 'default',
                    channelId: 'default',
                },
            },
            apns: {
                payload: {
                    aps: {
                        sound: 'default',
                        badge: 1,
                    },
                },
            },
        };

        try {
            const msgId = await admin.messaging().send(message);
            this.logger.log(`[Firebase] Push yuborildi → ${msgId}`);
        } catch (err: any) {
            // Token eskirgan yoki noto'g'ri — bu normal holat, xato ko'tarmaymiz
            if (
                err?.errorInfo?.code === 'messaging/registration-token-not-registered' ||
                err?.errorInfo?.code === 'messaging/invalid-registration-token'
            ) {
                this.logger.warn(`[Firebase] Token yaroqsiz, tozalanishi kerak: ${token?.slice(0, 20)}...`);
            } else {
                this.logger.error('[Firebase] Push yuborishda xato:', err?.message ?? err);
            }
        }
    }

    /**
     * Ko'p tokenga bir vaqtda push yuboradi (max 500).
     */
    async sendMulticast(
        tokens: string[],
        title: string,
        body: string,
        data?: Record<string, string>,
    ): Promise<void> {
        if (!this.initialized) return;
        const validTokens = tokens.filter((t) => t?.trim());
        if (!validTokens.length) return;

        const message: admin.messaging.MulticastMessage = {
            tokens: validTokens,
            notification: { title, body },
            data: data ?? {},
            android: { priority: 'high', notification: { sound: 'default', channelId: 'default' } },
            apns: { payload: { aps: { sound: 'default', badge: 1 } } },
        };

        try {
            const batchResponse = await admin.messaging().sendEachForMulticast(message);
            this.logger.log(
                `[Firebase] Multicast: ${batchResponse.successCount} muvaffaq, ${batchResponse.failureCount} xato`,
            );
        } catch (err: any) {
            this.logger.error('[Firebase] Multicast xato:', err?.message ?? err);
        }
    }
}
