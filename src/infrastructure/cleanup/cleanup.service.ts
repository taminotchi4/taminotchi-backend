import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import { config } from 'src/config';

@Injectable()
export class CleanupService {
    private readonly logger = new Logger(CleanupService.name);

    constructor(private readonly dataSource: DataSource) { }

    @Cron(CronExpression.EVERY_DAY_AT_10PM)
    async handleCleanup() {
        const days = config.CLEANUP_DAYS || 30;

        const cleanupDate = new Date();
        cleanupDate.setDate(cleanupDate.getDate() - days);

        this.logger.log(`Cleanup boshlandi. ${days} kundan eski soft-deleted yozuvlar o'chiriladi`);

        // FK buzmaslik uchun dependency tartibi
        const tables = [
            // 1. eng past dependency
            'message',
            'photo',
            'notification',
            'group_market',
            'group_elon',

            // 2.
            'comment',
            'privateChat',
            'order',
            'orderProduct',

            // 3.
            'elon',
            'product',
            'group',

            // 4.
            'client',
            'market',

            // 5.
            'sup_category',
            'category',

            // 6.
            'admin',
        ];

        try {
            await this.dataSource.transaction(async (manager) => {
                for (const table of tables) {
                    const hasColumns = await this.tableSupportsSoftDelete(manager, table);
                    if (!hasColumns) continue;

                    const result = await manager.query(
                        `
            DELETE FROM "${table}"
            WHERE "isDeleted" = true
              AND "deletedAt" IS NOT NULL
              AND "deletedAt" < $1
            RETURNING id
            `,
                        [cleanupDate],
                    );

                    if (result.length > 0) {
                        this.logger.log(`${table}: ${result.length} ta yozuv o'chirildi`);
                    }
                }
            });

            this.logger.log('Cleanup muvaffaqiyatli yakunlandi');
        } catch (error) {
            this.logger.error(`Cleanup xatolik bilan tugadi: ${error.message}`);
        }
    }

    private async tableSupportsSoftDelete(manager, table: string): Promise<boolean> {
        const result = await manager.query(
            `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = $1
      `,
            [table],
        );

        const columns = result.map((r) => r.column_name);

        return columns.includes('isDeleted') && columns.includes('deletedAt');
    }
}