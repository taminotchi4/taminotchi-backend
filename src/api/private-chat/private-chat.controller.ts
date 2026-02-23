import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { PrivateChatService } from './private-chat.service';
import { GetOrCreatePrivateChatDto } from './dto/create-private-chat.dto';
import { AuthGuard } from 'src/common/guard/auth.guard';
import { RolesGuard } from 'src/common/guard/roles.guard';
import { AccessRoles } from 'src/common/decorator/access-roles.decorator';
import { UserRole } from 'src/common/enum/index.enum';

@ApiTags('Private Chat')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('private-chat')
export class PrivateChatController {
  constructor(private readonly privateChatService: PrivateChatService) { }

  /**
   * GET or CREATE private chat
   * - So'rovchi: req.user dan olinadi
   * - Qabul qiluvchi: dto.receiverId + dto.receiverRole
   * - client → faqat marketga yoza oladi
   * - market → faqat clientga yoza oladi
   * - Chat mavjud bo'lsa: messages bilan qaytaradi
   * - Mavjud bo'lmasa: yangi chat yaratadi (201)
   */
  @ApiOperation({ summary: 'Private chat olish yoki yaratish' })
  @AccessRoles(UserRole.CLIENT, UserRole.MARKET)
  @Post()
  getOrCreate(
    @Body() dto: GetOrCreatePrivateChatDto,
    @Req() req: any,
  ) {
    return this.privateChatService.getOrCreate(
      req.user.id,
      req.user.role,
      dto,
    );
  }

  /**
   * Mening barcha private chatlarim (lastMessage bilan)
   */
  @ApiOperation({ summary: 'Mening barcha private chatlarim' })
  @AccessRoles(UserRole.CLIENT, UserRole.MARKET, UserRole.ADMIN, UserRole.SUPERADMIN)
  @Get('me')
  getMyChats(@Req() req: any) {
    return this.privateChatService.getMyChats(req.user.id, req.user.role);
  }
}
