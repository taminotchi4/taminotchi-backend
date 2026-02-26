import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
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
  ApiQuery,
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

const AllRoles = [UserRole.MARKET, UserRole.ADMIN, UserRole.SUPERADMIN];

@ApiTags('Group')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('group')
export class GroupController {
  constructor(private readonly groupService: GroupService) { }

  // ── 1. Statik GET routelar — :id dan OLDIN bo'lishi SHART ────────────────

  @ApiOperation({ summary: 'Barcha guruhlar (membersCount + isJoined)' })
  @AccessRoles(...AllRoles)
  @Get()
  findAll(@Req() req: any) {
    const marketId = req.user?.role === UserRole.MARKET ? req.user.id : undefined;
    return this.groupService.findAllGroups(req?.lang, marketId);
  }

  @ApiOperation({
    summary: 'CategoryId bo\'yicha guruhlar (isJoined bilan)',
  })
  @AccessRoles(...AllRoles)
  @Get('by-category/:categoryId')
  findByCategoryId(
    @Param('categoryId', ParseUUIDPipe) categoryId: string,
    @Req() req: any,
  ) {
    const marketId = req.user?.role === UserRole.MARKET ? req.user.id : undefined;
    return this.groupService.findByCategoryId(categoryId, req?.lang, marketId);
  }

  @ApiOperation({ summary: 'Market: join bo\'lgan guruhlarim (optional categoryId)' })
  @ApiQuery({ name: 'categoryId', required: false, type: String })
  @AccessRoles(UserRole.MARKET)
  @Get('me/groups')
  getMyGroups(
    @Req() req: any,
    @Query('categoryId', new ParseUUIDPipe({ optional: true })) categoryId?: string,
  ) {
    return this.groupService.getMyGroups(req.user.id, req?.lang, categoryId);
  }

  @ApiOperation({ summary: 'Market: join bo\'lgan kategoriyalarim' })
  @AccessRoles(UserRole.MARKET)
  @Get('me/join-categories')
  getMyJoinedCategories(@Req() req: any) {
    return this.groupService.getMyJoinedCategories(req.user.id, req?.lang);
  }



  // ── 2. Dinamik GET routelar — :id ─────────────────────────────────────────

  @ApiOperation({ summary: 'Bitta guruh (membersCount + isJoined)' })
  @AccessRoles(...AllRoles)
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    const marketId = req.user?.role === UserRole.MARKET ? req.user.id : undefined;
    return this.groupService.findOneGroup(id, req?.lang, marketId);
  }

  @ApiOperation({ summary: 'Guruh a\'zolari ro\'yxati' })
  @AccessRoles(...AllRoles)
  @Get(':id/members')
  getMembers(@Param('id', ParseUUIDPipe) id: string) {
    return this.groupService.getGroupMembers(id);
  }

  // ── 3. MARKET — join / leave ──────────────────────────────────────────────

  @ApiOperation({ summary: 'Market: guruhga qo\'shilish' })
  @AccessRoles(UserRole.MARKET)
  @Post(':id/join')
  join(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.groupService.joinGroup(id, req.user.id);
  }

  @ApiOperation({ summary: 'Market: guruhdan chiqish' })
  @AccessRoles(UserRole.MARKET)
  @Post(':id/leave')
  leave(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.groupService.leaveGroup(id, req.user.id);
  }

  // ── 4. ADMIN/SUPERADMIN — CRUD ────────────────────────────────────────────

  @ApiOperation({ summary: 'Guruhni yangilash (admin)' })
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN)
  @Patch(':id')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        nameUz: { type: 'string', example: 'Yangi nom (UZ)' },
        nameRu: { type: 'string', example: 'Новое название (RU)' },
        description: { type: 'string' },
        supCategoryId: { type: 'string', format: 'uuid' },
        profilePhoto: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor(
      'profilePhoto',
      buildMulterOptions({ folder: 'group', allowed: 'image', maxSizeMb: 10 }),
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

  @ApiOperation({ summary: 'Guruhni o\'chirish (admin)' })
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN)
  @Delete(':id')
  delete(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.groupService.deleteGroup(id, req.user.id, req.user.role);
  }

  @ApiOperation({ summary: 'A\'zoni chiqarish — kick (admin)' })
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
