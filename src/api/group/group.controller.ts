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
  ApiResponse,
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
import {
  ApiUnauthorized,
  ApiForbidden,
  ApiNotFound,
  ApiValidation,
  ApiConflict,
  ApiDeletedResponse,
} from 'src/common/swagger/swagger-responses';

const AllRoles = [UserRole.MARKET, UserRole.CLIENT, UserRole.ADMIN, UserRole.SUPERADMIN];

const GROUP_EXAMPLE = {
  id: 'uuid',
  nameUz: 'Avtomobil ehtiyot qismlari',
  nameRu: 'Автозапчасти',
  description: 'Guruh tavsifi',
  profilePhoto: 'https://example.com/uploads/group/photo.jpg',
  categoryId: 'uuid',
  supCategoryId: null,
  membersCount: 42,
  isJoined: false,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  isDeleted: false,
  deletedAt: null,
};

const MARKET_EXAMPLE = {
  id: 'uuid',
  name: 'Market nomi',
  username: 'market_01',
  phoneNumber: '+998901234567',
  photoPath: 'https://example.com/uploads/market/photo.jpg',
  role: 'market',
};

@ApiTags('Group')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('group')
export class GroupController {
  constructor(private readonly groupService: GroupService) { }

  @ApiOperation({ summary: 'Barcha guruhlar (membersCount + isJoined)' })
  @ApiResponse({
    status: 200,
    description: 'Guruhlar ro\'yxati',
    schema: { example: { statusCode: 200, message: 'Amaliyot muvaffaqiyatli bajarildi', data: [GROUP_EXAMPLE] } },
  })
  @ApiUnauthorized()
  @AccessRoles(...AllRoles)
  @Get()
  findAll(@Req() req: any) {
    const marketId = req.user?.role === UserRole.MARKET ? req.user.id : undefined;
    return this.groupService.findAllGroups(req?.lang, marketId);
  }

  @ApiOperation({ summary: 'CategoryId bo\'yicha guruhlar (isJoined bilan)' })
  @ApiResponse({
    status: 200,
    description: 'Kategoriya bo\'yicha guruhlar',
    schema: { example: { statusCode: 200, message: 'Amaliyot muvaffaqiyatli bajarildi', data: [GROUP_EXAMPLE] } },
  })
  @ApiUnauthorized()
  @ApiNotFound('Kategoriya')
  @AccessRoles(...AllRoles)
  @Get('by-category/:categoryId')
  findByCategoryId(@Param('categoryId', ParseUUIDPipe) categoryId: string, @Req() req: any) {
    const marketId = req.user?.role === UserRole.MARKET ? req.user.id : undefined;
    return this.groupService.findByCategoryId(categoryId, req?.lang, marketId);
  }

  @ApiOperation({ summary: 'Market: join bo\'lgan guruhlarim (optional categoryId)' })
  @ApiQuery({ name: 'categoryId', required: false, type: String })
  @ApiResponse({
    status: 200,
    description: 'Market a\'zo bo\'lgan guruhlar',
    schema: { example: { statusCode: 200, message: 'Amaliyot muvaffaqiyatli bajarildi', data: [{ ...GROUP_EXAMPLE, isJoined: true }] } },
  })
  @ApiUnauthorized()
  @AccessRoles(UserRole.MARKET)
  @Get('me/groups')
  getMyGroups(
    @Req() req: any,
    @Query('categoryId', new ParseUUIDPipe({ optional: true })) categoryId?: string,
  ) {
    return this.groupService.getMyGroups(req.user.id, req?.lang, categoryId);
  }

  @ApiOperation({ summary: 'Market: join bo\'lgan kategoriyalarim' })
  @ApiResponse({
    status: 200,
    description: 'Market a\'zo bo\'lgan kategoriyalar',
    schema: {
      example: {
        statusCode: 200,
        message: 'Amaliyot muvaffaqiyatli bajarildi',
        data: [{ id: 'uuid', nameUz: 'Elektronika', nameRu: 'Электроника', photoPath: null }],
      },
    },
  })
  @ApiUnauthorized()
  @AccessRoles(UserRole.MARKET)
  @Get('me/join-categories')
  getMyJoinedCategories(@Req() req: any) {
    return this.groupService.getMyJoinedCategories(req.user.id, req?.lang);
  }

  @ApiOperation({ summary: 'Bitta guruh (membersCount + isJoined)' })
  @ApiResponse({
    status: 200,
    description: 'Guruh ma\'lumotlari',
    schema: { example: { statusCode: 200, message: 'Amaliyot muvaffaqiyatli bajarildi', data: GROUP_EXAMPLE } },
  })
  @ApiUnauthorized()
  @ApiNotFound('Guruh')
  @AccessRoles(...AllRoles)
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    const marketId = req.user?.role === UserRole.MARKET ? req.user.id : undefined;
    return this.groupService.findOneGroup(id, req?.lang, marketId);
  }

  @ApiOperation({ summary: 'Guruh a\'zolari ro\'yxati' })
  @ApiResponse({
    status: 200,
    description: 'Guruh marketlari',
    schema: { example: { statusCode: 200, message: 'Amaliyot muvaffaqiyatli bajarildi', data: [MARKET_EXAMPLE] } },
  })
  @ApiUnauthorized()
  @ApiNotFound('Guruh')
  @AccessRoles(...AllRoles)
  @Get(':id/members')
  getMembers(@Param('id', ParseUUIDPipe) id: string) {
    return this.groupService.getGroupMembers(id);
  }

  @ApiOperation({ summary: 'Market: guruhga qo\'shilish' })
  @ApiResponse({
    status: 200,
    description: 'Guruhga qo\'shilindi',
    schema: { example: { statusCode: 200, message: 'Amaliyot muvaffaqiyatli bajarildi', data: { joined: true } } },
  })
  @ApiUnauthorized()
  @ApiForbidden()
  @ApiNotFound('Guruh')
  @ApiConflict('Market allaqachon guruh a\'zosi')
  @AccessRoles(UserRole.MARKET)
  @Post(':id/join')
  join(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.groupService.joinGroup(id, req.user.id);
  }

  @ApiOperation({ summary: 'Market: guruhdan chiqish' })
  @ApiResponse({
    status: 200,
    description: 'Guruhdan chiqildi',
    schema: { example: { statusCode: 200, message: 'Amaliyot muvaffaqiyatli bajarildi', data: { left: true } } },
  })
  @ApiUnauthorized()
  @ApiForbidden()
  @ApiNotFound('Guruh')
  @AccessRoles(UserRole.MARKET)
  @Post(':id/leave')
  leave(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.groupService.leaveGroup(id, req.user.id);
  }

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
  @ApiResponse({
    status: 200,
    description: 'Guruh yangilandi',
    schema: { example: { statusCode: 200, message: 'Amaliyot muvaffaqiyatli bajarildi', data: GROUP_EXAMPLE } },
  })
  @ApiUnauthorized()
  @ApiForbidden()
  @ApiNotFound('Guruh')
  @ApiValidation()
  @UseInterceptors(FileInterceptor('profilePhoto', buildMulterOptions({ folder: 'group', allowed: 'image', maxSizeMb: 10 })))
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
  @ApiDeletedResponse()
  @ApiUnauthorized()
  @ApiForbidden()
  @ApiNotFound('Guruh')
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN)
  @Delete(':id')
  delete(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.groupService.deleteGroup(id, req.user.id, req.user.role);
  }

  @ApiOperation({ summary: 'A\'zoni chiqarish — kick (admin)' })
  @ApiResponse({
    status: 200,
    description: 'A\'zo chiqarildi',
    schema: { example: { statusCode: 200, message: 'Amaliyot muvaffaqiyatli bajarildi', data: { kicked: true } } },
  })
  @ApiUnauthorized()
  @ApiForbidden()
  @ApiNotFound('Guruh yoki market')
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
