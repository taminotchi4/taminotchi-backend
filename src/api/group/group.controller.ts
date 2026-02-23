import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';

import { GroupService } from './group.service';
import { UpdateGroupDto } from './dto/update-group.dto';

import { AuthGuard } from 'src/common/guard/auth.guard';
import { RolesGuard } from 'src/common/guard/roles.guard';
import { AccessRoles } from 'src/common/decorator/access-roles.decorator';
import { UserRole } from 'src/common/enum/index.enum';
import { buildMulterOptions, toPublicPath } from 'src/infrastructure/upload/upload.util';

@ApiTags('Group')
@Controller('group')
export class GroupController {
  constructor(private readonly groupService: GroupService) { }

  // ── PUBLIC (guard yo'q) ───────────────────────────

  @ApiOperation({ summary: 'Barcha guruhlar (membersCount bilan)' })
  @Get()
  findAll() {
    return this.groupService.findAllGroups();
  }

  @ApiOperation({ summary: 'Bitta guruh (membersCount bilan)' })
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.groupService.findOneGroup(id);
  }

  @ApiOperation({ summary: 'Guruh a\'zolari ro\'yxati' })
  @Get(':id/members')
  getMembers(@Param('id', ParseUUIDPipe) id: string) {
    return this.groupService.getGroupMembers(id);
  }

  // ── PROTECTED ────────────────────────────────────

  @ApiOperation({ summary: 'Market: qo\'shilgan guruhlarim' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @AccessRoles(UserRole.MARKET)
  @Get('me/groups')
  getMyGroups(@Req() req: any) {
    return this.groupService.getMyGroups(req.user.id);
  }

  @ApiOperation({ summary: 'Guruhni yangilash (creator yoki admin)' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN)
  @Patch(':id')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Yangi nom' },
        description: { type: 'string' },
        supCategoryId: { type: 'string', format: 'uuid' },
        profilePhoto: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor(
      'profilePhoto',
      buildMulterOptions({ folder: 'group', allowed: 'image', maxSizeMb: 8 }),
    ),
  )
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateGroupDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Req() req: any,
  ) {
    const profilePhoto = file ? toPublicPath('group', file.filename) : undefined;
    return this.groupService.updateGroup(id, dto, req.user.id, req.user.role, profilePhoto);
  }

  @ApiOperation({ summary: 'Guruhni o\'chirish (creator yoki admin)' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN)
  @Delete(':id')
  delete(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.groupService.deleteGroup(id, req.user.id, req.user.role);
  }

  @ApiOperation({ summary: 'Market: guruhga qo\'shilish' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @AccessRoles(UserRole.MARKET)
  @Post(':id/join')
  join(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.groupService.joinGroup(id, req.user.id);
  }

  @ApiOperation({ summary: 'Market: guruhdan chiqish' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @AccessRoles(UserRole.MARKET)
  @Post(':id/leave')
  leave(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.groupService.leaveGroup(id, req.user.id);
  }

  @ApiOperation({ summary: 'A\'zoni chiqarish — kick (creator yoki admin)' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN)
  @Delete(':id/members/:marketId')
  kick(
    @Param('id', ParseUUIDPipe) groupId: string,
    @Param('marketId', ParseUUIDPipe) marketId: string,
    @Req() req: any,
  ) {
    return this.groupService.kickMember(groupId, marketId, req.user.id, req.user.role);
  }
}
