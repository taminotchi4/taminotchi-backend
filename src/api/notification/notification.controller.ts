import {
    Controller,
    Get,
    Param,
    ParseUUIDPipe,
    Patch,
    Query,
    Req,
    UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import { NotificationService } from './notification.service';
import { AuthGuard } from 'src/common/guard/auth.guard';
import {
    ApiUnauthorized,
} from 'src/common/swagger/swagger-responses';

const NOTIF_EXAMPLE = {
    id: 'uuid',
    userId: 'uuid',
    type: 'NEW_MESSAGE',
    senderId: 'uuid',
    senderType: 'market',
    senderName: 'Market A',
    senderAvatar: 'https://example.com/uploads/market/photo.jpg',
    referenceId: 'uuid',
    referenceType: 'PRIVATE_CHAT',
    preview: 'Salom, mahsulot haqida...',
    isRead: false,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    isDeleted: false,
    deletedAt: null,
};

@ApiTags('Notification')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('notification')
export class NotificationController {
    constructor(private readonly notifService: NotificationService) { }

    @ApiOperation({ summary: 'Mening bildirishnomalarim (sahifali)' })
    @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
    @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
    @ApiResponse({
        status: 200,
        description: 'Bildirishnomalar ro\'yxati (sahifali)',
        schema: {
            example: {
                statusCode: 200,
                message: 'Amaliyot muvaffaqiyatli bajarildi',
                data: {
                    data: [NOTIF_EXAMPLE],
                    total: 42,
                    page: 1,
                    limit: 20,
                },
            },
        },
    })
    @ApiUnauthorized()
    @Get('me')
    getMyNotifications(
        @Req() req: any,
        @Query('page') page?: number,
        @Query('limit') limit?: number,
    ) {
        return this.notifService.getMyNotifications(req.user.id, page, limit);
    }

    @ApiOperation({ summary: 'O\'qilmagan bildirishnomalar soni (badge)' })
    @ApiResponse({
        status: 200,
        description: 'O\'qilmagan bildirisnomalar soni',
        schema: {
            example: {
                statusCode: 200,
                message: 'Amaliyot muvaffaqiyatli bajarildi',
                data: { count: 7 },
            },
        },
    })
    @ApiUnauthorized()
    @Get('unread-count')
    getUnreadCount(@Req() req: any) {
        return this.notifService.getUnreadCount(req.user.id);
    }

    @ApiOperation({ summary: 'Barchasini o\'qildi deb belgilash' })
    @ApiResponse({
        status: 200,
        description: 'Barchasi o\'qildi',
        schema: {
            example: {
                statusCode: 200,
                message: 'Amaliyot muvaffaqiyatli bajarildi',
                data: { updated: true },
            },
        },
    })
    @ApiUnauthorized()
    @Patch('read-all')
    markAllRead(@Req() req: any) {
        return this.notifService.markAllRead(req.user.id);
    }

    @ApiOperation({ summary: 'Bildirishnomani o\'qildi deb belgilash' })
    @ApiResponse({
        status: 200,
        description: 'O\'qildi deb belgilandi',
        schema: {
            example: {
                statusCode: 200,
                message: 'Amaliyot muvaffaqiyatli bajarildi',
                data: { updated: true },
            },
        },
    })
    @ApiUnauthorized()
    @Patch(':id/read')
    markRead(
        @Param('id', ParseUUIDPipe) id: string,
        @Req() req: any,
    ) {
        return this.notifService.markRead(id, req.user.id);
    }
}
