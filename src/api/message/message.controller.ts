import {
  Controller,
  Delete,
  Param,
  ParseUUIDPipe,
  Patch,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { MessageService } from './message.service';
import { UpdateMessageDto } from './dto/update-message.dto';
import { AuthGuard } from 'src/common/guard/auth.guard';
import { RolesGuard } from 'src/common/guard/roles.guard';
import { AccessRoles } from 'src/common/decorator/access-roles.decorator';
import { UserRole } from 'src/common/enum/index.enum';

@ApiTags('Message')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('message')
export class MessageController {
  constructor(private readonly messageService: MessageService) { }

  /**
   * Xabarni tahrirlash
   * - Faqat xabar egasi (senderId == req.user.id)
   * - Faqat TEXT type xabarlar
   */
  @ApiOperation({ summary: 'Xabarni tahrirlash (faqat TEXT, faqat o\'zingizniki)' })
  @AccessRoles(UserRole.CLIENT, UserRole.MARKET, UserRole.ADMIN, UserRole.SUPERADMIN)
  @Patch(':id')
  edit(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMessageDto,
    @Req() req: any,
  ) {
    return this.messageService.editMessage(id, dto, req.user.id, req.user.role);
  }

  /**
   * Xabarni o'chirish
   * - Xabar egasi yoki Admin/Superadmin
   */
  @ApiOperation({ summary: 'Xabarni o\'chirish (egasi yoki admin)' })
  @AccessRoles(UserRole.CLIENT, UserRole.MARKET, UserRole.ADMIN, UserRole.SUPERADMIN)
  @Delete(':id')
  delete(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: any,
  ) {
    return this.messageService.deleteMessage(id, req.user.id, req.user.role);
  }

  /**
   * Ko'rildi belgisi
   * - Faqat qabul qiluvchi (sender emas)
   */
  @ApiOperation({ summary: 'Xabarni ko\'rildi deb belgilash' })
  @AccessRoles(UserRole.CLIENT, UserRole.MARKET, UserRole.ADMIN, UserRole.SUPERADMIN)
  @Patch(':id/seen')
  markSeen(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: any,
  ) {
    return this.messageService.markSeen(id, req.user.id);
  }
}
