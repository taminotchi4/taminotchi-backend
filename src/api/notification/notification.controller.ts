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
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

import { NotificationService } from './notification.service';
import { AuthGuard } from 'src/common/guard/auth.guard';

@ApiTags('Notification')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('notification')
export class NotificationController {
    constructor(private readonly notifService: NotificationService) { }

    @ApiOperation({ summary: 'Mening bildirishnomalarim (sahifali)' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @Get('me')
    getMyNotifications(
        @Req() req: any,
        @Query('page') page?: number,
        @Query('limit') limit?: number,
    ) {
        return this.notifService.getMyNotifications(req.user.id, page, limit);
    }

    @ApiOperation({ summary: 'O\'qilmagan bildirishnomalar soni (badge)' })
    @Get('unread-count')
    getUnreadCount(@Req() req: any) {
        return this.notifService.getUnreadCount(req.user.id);
    }

    @ApiOperation({ summary: 'Bildirishnomani o\'qildi deb belgilash' })
    @Patch(':id/read')
    markRead(
        @Param('id', ParseUUIDPipe) id: string,
        @Req() req: any,
    ) {
        return this.notifService.markRead(id, req.user.id);
    }

    @ApiOperation({ summary: 'Barchasini o\'qildi deb belgilash' })
    @Patch('read-all')
    markAllRead(@Req() req: any) {
        return this.notifService.markAllRead(req.user.id);
    }
}
