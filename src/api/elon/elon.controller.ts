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
  UploadedFiles,
  UseGuards,
  ForbiddenException,
  UseInterceptors,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ElonService } from './elon.service';
import { CreateElonDto } from './dto/create-elon.dto';
import { UpdateElonDto } from './dto/update-elon.dto';
import { UpdateElonStatusDto } from './dto/update-elon-status.dto';
import { FindElonQueryDto } from './dto/find-elon-query.dto';
import { AuthGuard } from 'src/common/guard/auth.guard';
import { RolesGuard } from 'src/common/guard/roles.guard';
import { AccessRoles } from 'src/common/decorator/access-roles.decorator';
import { UserRole } from 'src/common/enum/index.enum';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { buildMulterOptions, toPublicPath } from 'src/infrastructure/upload/upload.util';
import {
  ApiUnauthorized,
  ApiForbidden,
  ApiNotFound,
  ApiValidation,
  ApiDeletedResponse,
} from 'src/common/swagger/swagger-responses';

// ── To'liq nested response misollari ────────────────────────────────────────

const CATEGORY_EXAMPLE = {
  id: 'f1d2c3b4-0000-0000-0000-000000000001',
  nameUz: 'Elektronika',
  nameRu: 'Электроника',
  photoUrl: 'https://api.example.com/uploads/category/electronic.jpg',
  iconUrl: 'https://api.example.com/uploads/category/electronic-icon.svg',
  hintText: 'Barcha elektronika mahsulotlari',
  withAdress: false,
  forProduct: true,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-15T10:00:00.000Z',
  isDeleted: false,
  deletedAt: null,
};

const SUP_CATEGORY_EXAMPLE = {
  id: 'f1d2c3b4-0000-0000-0000-000000000002',
  nameUz: 'Telefonlar',
  nameRu: 'Телефоны',
  categoryId: 'f1d2c3b4-0000-0000-0000-000000000001',
  photoUrl: 'https://api.example.com/uploads/category/phones.jpg',
  iconUrl: null,
  hintText: null,
  withAdress: false,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  isDeleted: false,
  deletedAt: null,
};

const GROUP_EXAMPLE = {
  id: 'f1d2c3b4-0000-0000-0000-000000000003',
  name: 'Elektronika savdosi',
  nameUz: 'Elektronika savdosi',
  nameRu: 'Торговля электроникой',
  description: 'Elektronika mahsulotlarini sotib oling yoki soting',
  categoryId: 'f1d2c3b4-0000-0000-0000-000000000001',
  supCategoryId: 'f1d2c3b4-0000-0000-0000-000000000002',
  profilePhoto: 'https://api.example.com/uploads/group/electronics.jpg',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  isDeleted: false,
  deletedAt: null,
};

const CLIENT_EXAMPLE = {
  id: 'f1d2c3b4-0000-0000-0000-000000000010',
  fullName: 'Ali Valiyev',
  username: 'ali_valiyev',
  phoneNumber: '+998901234567',
  photoPath: 'https://api.example.com/uploads/client/ali.jpg',
  language: 'uz',
  role: 'client',
  isActive: true,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  isDeleted: false,
  deletedAt: null,
};

const PHOTO_EXAMPLE = {
  id: 'f1d2c3b4-0000-0000-0000-000000000020',
  path: 'https://api.example.com/uploads/elon/samsung-s23.jpg',
  elonId: 'f1d2c3b4-0000-0000-0000-000000000100',
  productId: null,
  createdAt: '2024-01-10T08:30:00.000Z',
  updatedAt: '2024-01-10T08:30:00.000Z',
  isDeleted: false,
  deletedAt: null,
};

const COMMENT_EXAMPLE = {
  id: 'f1d2c3b4-0000-0000-0000-000000000030',
  scope: 'ELON',
  elonId: 'f1d2c3b4-0000-0000-0000-000000000100',
  productId: null,
  messageCount: 12,
  createdAt: '2024-01-10T08:30:00.000Z',
  updatedAt: '2024-01-10T08:30:00.000Z',
  isDeleted: false,
  deletedAt: null,
};

const ELON_FULL_EXAMPLE = {
  id: 'f1d2c3b4-0000-0000-0000-000000000100',
  text: 'Samsung Galaxy S23 Ultra sotiladi — ideal holat, zaryadlovchi va quloqchin bilan',
  adressname: 'Toshkent, Chilonzor-9',
  categoryId: 'f1d2c3b4-0000-0000-0000-000000000001',
  supCategoryId: 'f1d2c3b4-0000-0000-0000-000000000002',
  clientId: 'f1d2c3b4-0000-0000-0000-000000000010',
  commentId: 'f1d2c3b4-0000-0000-0000-000000000030',
  price: '7500000.00',
  status: 'NEGOTIATION',
  answerCount: 5,
  // ── Relations ────────────────────────
  category: CATEGORY_EXAMPLE,
  supCategory: SUP_CATEGORY_EXAMPLE,
  groups: [GROUP_EXAMPLE],
  client: CLIENT_EXAMPLE,
  photos: [PHOTO_EXAMPLE],
  comment: COMMENT_EXAMPLE,
  // ── BaseEntity ────────────────────────
  createdAt: '2024-01-10T08:30:00.000Z',
  updatedAt: '2024-01-10T10:00:00.000Z',
  isDeleted: false,
  deletedAt: null,
};

const PAGINATION_META = {
  totalElements: 87,
  totalPages: 9,
  pageSize: 10,
  currentPage: 1,
  from: 1,
  to: 10,
};

// ────────────────────────────────────────────────────────────────────────────

@ApiTags('Elon')
@Controller('elon')
export class ElonController {
  constructor(private readonly elonService: ElonService) { }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @AccessRoles(UserRole.CLIENT)
  @Post()
  @ApiOperation({ summary: 'Yangi e\'lon yaratish (Client)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        text: { type: 'string', example: 'Samsung Galaxy S23 Ultra sotiladi' },
        adressname: { type: 'string', example: 'Toshkent, Chilonzor-9' },
        categoryId: { type: 'string', format: 'uuid', example: 'f1d2c3b4-0000-0000-0000-000000000001' },
        supCategoryId: { type: 'string', format: 'uuid', example: 'f1d2c3b4-0000-0000-0000-000000000002' },
        price: { type: 'string', example: '7500000' },
        photo: { type: 'array', items: { type: 'string', format: 'binary' }, maxItems: 10 },
      },
      required: ['text', 'categoryId'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'E\'lon yaratildi — category, supCategory, groups, client, photos, comment (+messageCount) bilan',
    schema: {
      example: {
        statusCode: 201,
        message: 'Amaliyot muvaffaqiyatli bajarildi',
        data: ELON_FULL_EXAMPLE,
      },
    },
  })
  @ApiUnauthorized()
  @ApiForbidden()
  @ApiNotFound('Kategoriya yoki supkategoriya')
  @ApiValidation()
  @UseInterceptors(FileFieldsInterceptor([{ name: 'photo', maxCount: 10 }], buildMulterOptions({ folder: 'elon', allowed: 'image', maxSizeMb: 10 })))
  create(
    @Body() createElonDto: CreateElonDto,
    @Req() req: any,
    @UploadedFiles() files: { photo?: Express.Multer.File[] },
  ) {
    if (req?.user?.role !== UserRole.CLIENT) throw new ForbiddenException('Only client can create elon');
    const photos = files?.photo ?? [];
    return this.elonService.createForClient(createElonDto, req.user.id, photos.map((p) => toPublicPath('elon', p.filename)));
  }

  @Get()
  @ApiOperation({ summary: 'Barcha e\'lonlar — pagination + filtr (category, supCategory, groups, client, photos, comment bilan)' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'categoryId', required: false, type: String, description: 'Kategoriya bo\'yicha filtr' })
  @ApiQuery({ name: 'supCategoryId', required: false, type: String, description: 'SubKategoriya bo\'yicha filtr' })
  @ApiQuery({ name: 'groupId', required: false, type: String, description: 'Guruh bo\'yicha filtr' })
  @ApiResponse({
    status: 200,
    description: 'E\'lonlar ro\'yxati — har bir e\'lon category, supCategory, groups[], client, photos[], comment (+messageCount) bilan keladi',
    schema: {
      example: {
        statusCode: 200,
        message: 'Amaliyot muvaffaqiyatli bajarildi',
        data: [ELON_FULL_EXAMPLE],
        meta: PAGINATION_META,
      },
    },
  })
  findAll(@Query() query: FindElonQueryDto) {
    return this.elonService.findWithPaginationAndFilters(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Bitta e\'lon — category, supCategory, groups, client, photos, comment (+messageCount) bilan' })
  @ApiResponse({
    status: 200,
    description: 'E\'lonning to\'liq ma\'lumotlari',
    schema: {
      example: {
        statusCode: 200,
        message: 'Amaliyot muvaffaqiyatli bajarildi',
        data: ELON_FULL_EXAMPLE,
      },
    },
  })
  @ApiNotFound('E\'lon')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.elonService.findOneById(id);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @AccessRoles(UserRole.CLIENT, UserRole.ADMIN, UserRole.SUPERADMIN)
  @Patch(':id')
  @ApiOperation({ summary: 'E\'lon yangilash — yangilangan to\'liq e\'lon qaytadi' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        text: { type: 'string' },
        adressname: { type: 'string' },
        categoryId: { type: 'string', format: 'uuid' },
        supCategoryId: { type: 'string', format: 'uuid' },
        price: { type: 'string' },
        status: { type: 'string', enum: ['NEGOTIATION', 'FIXED', 'FREE'], description: 'E\'lon narx holati' },
        photo: { type: 'array', items: { type: 'string', format: 'binary' }, maxItems: 10 },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'E\'lon yangilandi — to\'liq nested response',
    schema: {
      example: {
        statusCode: 200,
        message: 'Amaliyot muvaffaqiyatli bajarildi',
        data: { ...ELON_FULL_EXAMPLE, text: 'Yangilangan matn', status: 'FIXED' },
      },
    },
  })
  @ApiUnauthorized()
  @ApiForbidden()
  @ApiNotFound('E\'lon')
  @ApiValidation()
  @UseInterceptors(FileFieldsInterceptor([{ name: 'photo', maxCount: 10 }], buildMulterOptions({ folder: 'elon', allowed: 'image', maxSizeMb: 10 })))
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateElonDto: UpdateElonDto,
    @UploadedFiles() files: { photo?: Express.Multer.File[] },
  ) {
    const photos = files?.photo ?? [];
    return this.elonService.updateWithPhoto(id, updateElonDto, photos.map((p) => toPublicPath('elon', p.filename)));
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @AccessRoles(UserRole.CLIENT, UserRole.MARKET, UserRole.ADMIN, UserRole.SUPERADMIN)
  @Patch(':id/answer-count')
  @ApiOperation({ summary: 'E\'lon javob sonini +1 oshirish — market shu e\'longa javob berganida chaqiriladi' })
  @ApiResponse({
    status: 200,
    description: 'answerCount oshdi — yangilangan elon (relations YO\'Q, faqat elon o\'zi)',
    schema: {
      example: {
        statusCode: 200,
        message: 'Amaliyot muvaffaqiyatli bajarildi',
        data: {
          id: 'f1d2c3b4-0000-0000-0000-000000000100',
          text: 'Samsung Galaxy S23 Ultra sotiladi',
          categoryId: 'f1d2c3b4-0000-0000-0000-000000000001',
          clientId: 'f1d2c3b4-0000-0000-0000-000000000010',
          price: '7500000.00',
          status: 'NEGOTIATION',
          answerCount: 6,
          createdAt: '2024-01-10T08:30:00.000Z',
          updatedAt: '2024-01-10T10:30:00.000Z',
          isDeleted: false,
          deletedAt: null,
        },
      },
    },
  })
  @ApiUnauthorized()
  @ApiNotFound('E\'lon')
  incrementAnswerCount(@Param('id', ParseUUIDPipe) id: string) {
    return this.elonService.incrementAnswerCount(id);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @AccessRoles(UserRole.CLIENT, UserRole.ADMIN, UserRole.SUPERADMIN)
  @Patch(':id/status')
  @ApiOperation({ summary: 'E\'lon statusini yangilash — to\'liq nested response qaytadi' })
  @ApiResponse({
    status: 200,
    description: 'Status yangilandi — NEGOTIATION | FIXED | FREE',
    schema: {
      example: {
        statusCode: 200,
        message: 'Amaliyot muvaffaqiyatli bajarildi',
        data: { ...ELON_FULL_EXAMPLE, status: 'FIXED' },
      },
    },
  })
  @ApiUnauthorized()
  @ApiForbidden()
  @ApiNotFound('E\'lon')
  @ApiValidation()
  updateStatus(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateElonStatusDto) {
    return this.elonService.updateStatus(id, dto.status);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @AccessRoles(UserRole.CLIENT, UserRole.ADMIN, UserRole.SUPERADMIN)
  @Delete(':id')
  @ApiOperation({ summary: 'E\'lon o\'chirish (soft delete) — barcha bog\'liq photo va comment ham o\'chiriladi' })
  @ApiResponse({
    status: 200,
    description: 'E\'lon soft delete qilindi',
    schema: {
      example: {
        statusCode: 200,
        message: 'Amaliyot muvaffaqiyatli bajarildi',
        data: { deleted: true },
      },
    },
  })
  @ApiUnauthorized()
  @ApiForbidden()
  @ApiNotFound('E\'lon')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.elonService.delete(id);
  }
}
