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
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { FindProductQueryDto } from './dto/find-product-query.dto';
import { UpdateVerificationDto } from './dto/update-verification.dto';
import { RateProductDto } from './dto/rate-product.dto';
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
  updatedAt: '2024-01-01T00:00:00.000Z',
  isDeleted: false,
  deletedAt: null,
};

const SUP_CATEGORY_EXAMPLE = {
  id: 'f1d2c3b4-0000-0000-0000-000000000002',
  nameUz: 'Smartfonlar',
  nameRu: 'Смартфоны',
  categoryId: 'f1d2c3b4-0000-0000-0000-000000000001',
  photoUrl: null,
  iconUrl: null,
  hintText: null,
  withAdress: false,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  isDeleted: false,
  deletedAt: null,
};

const MARKET_EXAMPLE = {
  id: 'f1d2c3b4-0000-0000-0000-000000000050',
  name: 'Tech Market',
  username: 'tech_market',
  phoneNumber: '+998901234567',
  photoPath: 'https://api.example.com/uploads/market/tech_market.jpg',
  isActive: true,
  role: 'market',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  isDeleted: false,
  deletedAt: null,
};

const PHOTO_PRODUCT_EXAMPLE = {
  id: 'f1d2c3b4-0000-0000-0000-000000000021',
  path: 'https://api.example.com/uploads/product/iphone15-front.jpg',
  productId: 'f1d2c3b4-0000-0000-0000-000000000200',
  elonId: null,
  createdAt: '2024-02-01T10:00:00.000Z',
  updatedAt: '2024-02-01T10:00:00.000Z',
  isDeleted: false,
  deletedAt: null,
};

const COMMENT_PRODUCT_EXAMPLE = {
  id: 'f1d2c3b4-0000-0000-0000-000000000031',
  scope: 'PRODUCT',
  productId: 'f1d2c3b4-0000-0000-0000-000000000200',
  elonId: null,
  messageCount: 8,
  createdAt: '2024-02-01T10:00:00.000Z',
  updatedAt: '2024-02-01T10:00:00.000Z',
  isDeleted: false,
  deletedAt: null,
};

const PRODUCT_FULL_EXAMPLE = {
  id: 'f1d2c3b4-0000-0000-0000-000000000200',
  name: 'iPhone 15 Pro Max 256GB Natural Titanium',
  categoryId: 'f1d2c3b4-0000-0000-0000-000000000001',
  supCategoryId: 'f1d2c3b4-0000-0000-0000-000000000002',
  marketId: 'f1d2c3b4-0000-0000-0000-000000000050',
  commentId: 'f1d2c3b4-0000-0000-0000-000000000031',
  price: '15990000',
  amount: 5,
  description: 'Original Apple iPhone 15 Pro Max, yangi, muhrlangan, Rossiya komplektatsiyasi',
  isActive: true,
  avgRating: 4.67,
  ratingCount: 9,
  // ── Relations ────────────────────────
  category: CATEGORY_EXAMPLE,
  supCategory: SUP_CATEGORY_EXAMPLE,
  market: MARKET_EXAMPLE,
  photos: [PHOTO_PRODUCT_EXAMPLE, { ...PHOTO_PRODUCT_EXAMPLE, id: 'f1d2c3b4-0000-0000-0000-000000000022', path: 'https://api.example.com/uploads/product/iphone15-back.jpg' }],
  comment: COMMENT_PRODUCT_EXAMPLE,
  // ── BaseEntity ────────────────────────
  createdAt: '2024-02-01T10:00:00.000Z',
  updatedAt: '2024-02-15T14:30:00.000Z',
  isDeleted: false,
  deletedAt: null,
};

const PAGINATION_META = {
  totalElements: 120,
  totalPages: 12,
  pageSize: 10,
  currentPage: 1,
  from: 1,
  to: 10,
};

// ────────────────────────────────────────────────────────────────────────────

@ApiTags('Product')
@Controller('product')
export class ProductController {
  constructor(private readonly productService: ProductService) { }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @AccessRoles(UserRole.MARKET)
  @Post()
  @ApiOperation({ summary: 'Yangi mahsulot yaratish (Market) — category, market, photos, comment bilan qaytadi' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'iPhone 15 Pro Max 256GB' },
        categoryId: { type: 'string', format: 'uuid', example: 'f1d2c3b4-0000-0000-0000-000000000001' },
        supCategoryId: { type: 'string', format: 'uuid', example: 'f1d2c3b4-0000-0000-0000-000000000002' },
        price: { type: 'string', example: '15990000' },
        amount: { type: 'number', example: 5 },
        description: { type: 'string', example: 'Original Apple, yangi, muhrlangan' },
        photo: { type: 'array', items: { type: 'string', format: 'binary' }, maxItems: 10 },
      },
      required: ['name', 'categoryId', 'price', 'amount'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Mahsulot yaratildi — category, supCategory, market, photos[], comment (+messageCount=0) bilan',
    schema: {
      example: {
        statusCode: 201,
        message: 'Amaliyot muvaffaqiyatli bajarildi',
        data: PRODUCT_FULL_EXAMPLE,
      },
    },
  })
  @ApiUnauthorized()
  @ApiForbidden()
  @ApiNotFound('Kategoriya')
  @ApiValidation()
  @UseInterceptors(FileFieldsInterceptor([{ name: 'photo', maxCount: 10 }], buildMulterOptions({ folder: 'product', allowed: 'image', maxSizeMb: 10 })))
  create(
    @Body() createProductDto: CreateProductDto,
    @Req() req: any,
    @UploadedFiles() files: { photo?: Express.Multer.File[] },
  ) {
    if (req?.user?.role !== UserRole.MARKET) throw new ForbiddenException('Only market can create product');
    const photos = files?.photo ?? [];
    return this.productService.createForMarket(createProductDto, req.user.id, photos.map((p) => toPublicPath('product', p.filename)));
  }

  @Get()
  @ApiOperation({ summary: 'Barcha mahsulotlar — pagination + filtr (category, supCategory, market, photos, comment bilan)' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'categoryId', required: false, type: String, description: 'Kategoriya ID bo\'yicha filtr' })
  @ApiQuery({ name: 'supCategoryId', required: false, type: String, description: 'SubKategoriya ID bo\'yicha filtr' })
  @ApiQuery({ name: 'marketId', required: false, type: String, description: 'Market ID bo\'yicha filtr' })
  @ApiResponse({
    status: 200,
    description: 'Mahsulotlar ro\'yxati — har bir mahsulot category, supCategory, market, photos[], comment (+messageCount) bilan keladi. meta — pagination ma\'lumotlari.',
    schema: {
      example: {
        statusCode: 200,
        message: 'Amaliyot muvaffaqiyatli bajarildi',
        data: [PRODUCT_FULL_EXAMPLE],
        meta: PAGINATION_META,
      },
    },
  })
  findAll(@Query() query: FindProductQueryDto) {
    return this.productService.findWithPaginationAndFilters(query);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Barcha tasdiqlanishi kutilayotgan yoki tasdiqlangan mahsulotlarni olish (Admin)' })
  @Get('admin/verification')
  findForVerification(@Query() query: FindProductQueryDto) {
    return this.productService.findForVerification(query);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Mahsulotni tasdiqlash yoki bekor qilish (Admin)' })
  @Patch('admin/verification/:id')
  updateVerificationStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVerificationDto,
  ) {
    return this.productService.updateVerificationStatus(id, dto.isVerified);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Bitta mahsulot — category, supCategory, market, photos, comment (+messageCount) bilan' })
  @ApiResponse({
    status: 200,
    description: 'Mahsulotning to\'liq ma\'lumotlari',
    schema: {
      example: {
        statusCode: 200,
        message: 'Amaliyot muvaffaqiyatli bajarildi',
        data: PRODUCT_FULL_EXAMPLE,
      },
    },
  })
  @ApiNotFound('Mahsulot')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.productService.findOneById(id);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.MARKET)
  @Patch(':id')
  @ApiOperation({ summary: 'Mahsulot yangilash — yangilangan to\'liq mahsulot qaytadi' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        categoryId: { type: 'string', format: 'uuid' },
        supCategoryId: { type: 'string', format: 'uuid' },
        price: { type: 'string' },
        amount: { type: 'number' },
        description: { type: 'string' },
        isActive: { type: 'boolean', description: 'Mahsulot aktiv/passiv holati' },
        photo: { type: 'array', items: { type: 'string', format: 'binary' }, maxItems: 10 },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Mahsulot yangilandi — to\'liq nested response',
    schema: {
      example: {
        statusCode: 200,
        message: 'Amaliyot muvaffaqiyatli bajarildi',
        data: { ...PRODUCT_FULL_EXAMPLE, name: 'iPhone 15 Pro Max 512GB', price: '17990000', amount: 3 },
      },
    },
  })
  @ApiUnauthorized()
  @ApiForbidden()
  @ApiNotFound('Mahsulot')
  @ApiValidation()
  @UseInterceptors(FileFieldsInterceptor([{ name: 'photo', maxCount: 10 }], buildMulterOptions({ folder: 'product', allowed: 'image', maxSizeMb: 10 })))
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateProductDto: UpdateProductDto,
    @UploadedFiles() files: { photo?: Express.Multer.File[] },
    @Req() req: any,
  ) {
    const photos = files?.photo ?? [];
    return this.productService.updateWithPhoto(
      id,
      updateProductDto,
      photos.map((p) => toPublicPath('product', p.filename)),
      req.user.id,
      req.user.role,
    );
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.MARKET)
  @Delete(':id')
  @ApiOperation({ summary: 'Mahsulot o\'chirish (soft delete) — photos va comment ham o\'chiriladi' })
  @ApiResponse({
    status: 200,
    description: 'Mahsulot soft delete qilindi',
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
  @ApiNotFound('Mahsulot')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.productService.delete(id);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @AccessRoles(UserRole.CLIENT)
  @Post(':id/rate')
  @ApiOperation({ summary: 'Mahsulotni baholash (Client, score: 1-5) — avgRating va ratingCount qayta hisoblanadi' })
  @ApiResponse({
    status: 200,
    description: 'Baho qabul qilindi — yangilangan o\'rtacha daraja',
    schema: {
      example: {
        statusCode: 200,
        message: 'Amaliyot muvaffaqiyatli bajarildi',
        data: {
          avgRating: 4.67,
          ratingCount: 9,
          myScore: 5,
        },
      },
    },
  })
  @ApiUnauthorized()
  @ApiForbidden()
  @ApiNotFound('Mahsulot')
  @ApiResponse({
    status: 400,
    description: 'Noto\'g\'ri score (1-5 oralig\'ida bo\'lishi kerak)',
    schema: {
      example: {
        statusCode: 400,
        error: 'Bad Request',
        message: 'Score must be between 1 and 5',
        timestamp: '2024-01-01T00:00:00.000Z',
        path: '/api/v1/product/{id}/rate',
        method: 'POST',
      },
    },
  })
  @ApiValidation()
  rateProduct(@Param('id', ParseUUIDPipe) id: string, @Body() dto: RateProductDto, @Req() req: any) {
    return this.productService.rateProduct(id, req.user.id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @AccessRoles(UserRole.CLIENT)
  @Get(':id/my-rating')
  @ApiOperation({ summary: 'Mening bahom — agar baho berganman bo\'lsam score, aks holda null qaytadi' })
  @ApiResponse({
    status: 200,
    description: 'Foydalanuvchi mahsulotga bergan bahosi',
    schema: {
      example: {
        statusCode: 200,
        message: 'Amaliyot muvaffaqiyatli bajarildi',
        data: { myScore: 4 },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Hali baho bermaganman',
    schema: {
      example: {
        statusCode: 200,
        message: 'Amaliyot muvaffaqiyatli bajarildi',
        data: { myScore: null },
      },
    },
  })
  @ApiUnauthorized()
  @ApiForbidden()
  getMyRating(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.productService.getMyRating(id, req.user.id);
  }
}
