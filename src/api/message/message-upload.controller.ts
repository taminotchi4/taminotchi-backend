import {
    Controller,
    Post,
    UploadedFile,
    UseGuards,
    UseInterceptors,
    BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';

import { AuthGuard } from 'src/common/guard/auth.guard';
import { buildMulterOptions, toPublicPath } from 'src/infrastructure/upload/upload.util';
import { successRes } from 'src/infrastructure/response/success.response';

/**
 * Message fayl upload
 *
 * Oqim:
 *   1. Client faylni shu endpointga yuboradi → path oladi
 *   2. Olingan pathni WebSocket send_message eventida mediaPath sifatida yuboradi
 *
 * Ruxsat etilgan formatlar:
 *   image/* → /uploads/message/image/
 *   audio/* → /uploads/message/audio/
 */
@ApiTags('Message')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('message/upload')
export class MessageUploadController {
    // ── Rasm yuklash ────────────────────────────────
    @ApiOperation({ summary: 'Xabar uchun rasm yuklash' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            required: ['file'],
            properties: {
                file: { type: 'string', format: 'binary' },
            },
        },
    })
    @Post('image')
    @UseInterceptors(
        FileInterceptor(
            'file',
            buildMulterOptions({ folder: 'message/image', allowed: 'image', maxSizeMb: 10 }),
        ),
    )
    uploadImage(@UploadedFile() file: Express.Multer.File) {
        if (!file) throw new BadRequestException('File is required');
        return successRes({
            path: toPublicPath('message/image', file.filename),
            originalName: file.originalname,
            size: file.size,
        });
    }

    // ── Audio yuklash ───────────────────────────────
    @ApiOperation({ summary: 'Xabar uchun audio yuklash (voice message)' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            required: ['file'],
            properties: {
                file: { type: 'string', format: 'binary' },
            },
        },
    })
    @Post('audio')
    @UseInterceptors(
        FileInterceptor(
            'file',
            buildMulterOptions({ folder: 'message/audio', allowed: 'audio', maxSizeMb: 20 }),
        ),
    )
    uploadAudio(@UploadedFile() file: Express.Multer.File) {
        if (!file) throw new BadRequestException('File is required');
        return successRes({
            path: toPublicPath('message/audio', file.filename),
            originalName: file.originalname,
            size: file.size,
        });
    }
}
