import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { config } from 'src/config';

export type OtpTemplateType = 1 | 2 | 3 | 4;

interface DevSmsResponse {
    success: boolean;
    message?: string;
    error?: string;
    data?: {
        sms_id: number;
        request_id: string;
        status: string;
        parts_count: number;
        total_cost: number;
        balance: number;
        type: string;
    };
}

@Injectable()
export class SmsService {
    private readonly logger = new Logger(SmsService.name);
    private readonly isDev = config.NODE_ENV !== 'production';

    /**
     * OTP SMS yuboradi (universal_otp shablon orqali).
     * @param phone  '+998901234567' yoki '998901234567' formatida
     * @param code   4-8 xonali raqam (string)
     * @param templateType
     *   1 = Amaliyot tasdiqlash
     *   2 = Parol tiklash
     *   3 = Ro'yxatdan o'tish
     *   4 = Tizimga kirish
     */
    async sendOtp(
        phone: string,
        code: string,
        templateType: OtpTemplateType = 3,
    ): Promise<void> {
        const normalizedPhone = phone.replace(/\D/g, '');

        if (this.isDev) {
            this.logger.log(
                `[SMS DEV] sendOtp phone=${normalizedPhone} code=${code} template=${templateType}`,
            );
            return;
        }

        const json = await this.post({
            phone: normalizedPhone,
            type: 'universal_otp',
            template_type: templateType,
            service_name: config.SMS.DEVSMS_SERVICE_NAME,
            otp_code: code,
        });

        if (!json) throw new ServiceUnavailableException('SMS yuborilmadi');

        if (!json.success) {
            this.logger.warn(`[SMS] OTP xato: ${json.error ?? json.message}`);
            throw new ServiceUnavailableException('SMS yuborilmadi');
        }

        this.logger.log(
            `[SMS] OTP yuborildi → phone=${normalizedPhone} code=${code} sms_id=${json.data?.sms_id} balance=${json.data?.balance}`,
        );
    }

    /**
     * Erkin matnli SMS yuboradi (eskiz turi).
     * Prod da xato bo'lsa ServiceUnavailableException throw qiladi.
     * @param phone   '+998901234567' yoki '998901234567' formatida
     * @param message SMS matni
     * @param from    Kimdan (default: '4546')
     */
    async sendSms(
        phone: string,
        message: string,
        from = '4546',
    ): Promise<void> {
        const normalizedPhone = phone.replace(/\D/g, '');

        if (this.isDev) {
            this.logger.log(
                `[SMS DEV] sendSms phone=${normalizedPhone} message="${message}"`,
            );
            return;
        }

        const json = await this.post({
            phone: normalizedPhone,
            message,
            from,
        });

        if (!json) throw new ServiceUnavailableException('SMS yuborilmadi');

        if (!json.success) {
            this.logger.warn(`[SMS] SMS xato: ${json.error ?? json.message}`);
            throw new ServiceUnavailableException('SMS yuborilmadi');
        }

        this.logger.log(
            `[SMS] SMS yuborildi → phone=${normalizedPhone} sms_id=${json.data?.sms_id} balance=${json.data?.balance}`,
        );
    }

    // ─── Private HTTP helper ─────────────────────────────────────────────────

    private async post(body: Record<string, unknown>): Promise<DevSmsResponse | null> {
        const token = config.SMS.DEVSMS_TOKEN;
        const baseUrl = config.SMS.DEVSMS_BASE_URL;

        if (!token || token === 'undefined') {
            this.logger.warn('[SMS] DEVSMS_TOKEN sozlanmagan — SMS yuborilmadi');
            return null;
        }

        try {
            const res = await fetch(`${baseUrl}/send_sms.php`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            });
            return res.json() as Promise<DevSmsResponse>;
        } catch (err: any) {
            this.logger.error(`[SMS] HTTP xatosi: ${err?.message ?? err}`);
            return null;
        }
    }
}
