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
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { MarketService } from './market.service';
import { CreateMarketDto } from './dto/create-market.dto';
import { UpdateMarketDto } from './dto/update-market.dto';
import { MarketLoginDto } from './dto/market-login.dto';
import { RequestMarketOtpDto } from './dto/request-otp.dto';
import { VerifyMarketOtpDto } from './dto/verify-otp.dto';
import { RegisterMarketDto } from './dto/register-market.dto';
import { ResetMarketPasswordDto } from './dto/forgot-password.dto';
import type { Response } from 'express';
import { AuthGuard } from 'src/common/guard/auth.guard';
import { RolesGuard } from 'src/common/guard/roles.guard';
import { AccessRoles } from 'src/common/decorator/access-roles.decorator';
import { UserRole, LanguageType } from 'src/common/enum/index.enum';
import { FileInterceptor } from '@nestjs/platform-express';
import { buildMulterOptions, toPublicPath } from 'src/infrastructure/upload/upload.util';
import {
  ApiUnauthorized,
  ApiForbidden,
  ApiNotFound,
  ApiValidation,
  ApiConflict,
  ApiRateLimit,
  ApiBadRequest,
  ApiDeletedResponse,
  ApiOtpSentResponse,
  ApiVerifiedResponse,
} from 'src/common/swagger/swagger-responses';

const MARKET_EXAMPLE = {
  id: 'uuid',
  name: 'Market Nomi',
  phoneNumber: '+998901234567',
  username: 'market_01',
  photoPath: 'https://example.com/uploads/market/photo.jpg',
  adressId: null,
  language: 'uz',
  isActive: true,
  fcmToken: null,
  role: 'market',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  isDeleted: false,
  deletedAt: null,
};

const PRODUCT_EXAMPLE = {
  id: 'uuid',
  name: 'Mahsulot nomi',
  price: '50000',
  amount: 10,
  isActive: true,
  avgRating: 4.5,
  ratingCount: 12,
  photos: [],
  comment: { id: 'uuid', messageCount: 5 },
  createdAt: '2024-01-01T00:00:00.000Z',
};

@ApiTags('Market')
@Controller('market')
export class MarketController {
  constructor(private readonly marketService: MarketService) { }

  @ApiOperation({ summary: 'Market login' })
  @ApiBody({ type: MarketLoginDto })
  @ApiResponse({
    status: 200,
    description: 'Muvaffaqiyatli login — accessToken cookie ga o\'rnatiladi',
    schema: {
      example: {
        statusCode: 200,
        message: 'Amaliyot muvaffaqiyatli bajarildi',
        data: { accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...', user: MARKET_EXAMPLE },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Telefon yoki parol noto\'g\'ri' })
  @ApiValidation()
  @ApiRateLimit()
  @Throttle({ sensitive: { limit: 5, ttl: 60000 } })
  @Post('login')
  login(@Body() dto: MarketLoginDto, @Res({ passthrough: true }) res: Response) {
    return this.marketService.marketSignIn(dto, res);
  }

  @ApiOperation({ summary: 'Market register - request OTP' })
  @ApiBody({ type: RequestMarketOtpDto })
  @ApiOtpSentResponse()
  @ApiConflict('Phone number already exists')
  @ApiValidation()
  @ApiRateLimit()
  @Throttle({ sensitive: { limit: 5, ttl: 60000 } })
  @Post('register/request-otp')
  requestOtp(@Body() dto: RequestMarketOtpDto) {
    return this.marketService.requestRegisterOtp(dto);
  }

  @ApiOperation({ summary: 'Check market phone exists' })
  @ApiResponse({
    status: 200,
    description: 'Telefon raqam tekshiruvi',
    schema: { example: { statusCode: 200, message: 'Amaliyot muvaffaqiyatli bajarildi', data: { exists: false } } },
  })
  @ApiRateLimit()
  @Get('check-phone/:phone')
  checkPhone(@Param('phone') phone: string) {
    return this.marketService.checkPhone(phone);
  }

  @ApiOperation({ summary: 'Check market username exists' })
  @ApiResponse({
    status: 200,
    description: 'Username tekshiruvi',
    schema: { example: { statusCode: 200, message: 'Amaliyot muvaffaqiyatli bajarildi', data: { exists: true } } },
  })
  @ApiRateLimit()
  @Get('check-username/:username')
  checkUsername(@Param('username') username: string) {
    return this.marketService.checkUsername(username);
  }

  @ApiOperation({ summary: 'Market register - verify OTP' })
  @ApiBody({ type: VerifyMarketOtpDto })
  @ApiVerifiedResponse()
  @ApiBadRequest('OTP expired yoki noto\'g\'ri')
  @ApiValidation()
  @ApiRateLimit()
  @Throttle({ sensitive: { limit: 5, ttl: 60000 } })
  @Post('register/verify-otp')
  verifyOtp(@Body() dto: VerifyMarketOtpDto) {
    return this.marketService.verifyRegisterOtp(dto);
  }

  @ApiOperation({ summary: 'Market register - complete profile' })
  @ApiBody({ type: RegisterMarketDto })
  @ApiResponse({
    status: 201,
    description: 'Ro\'yxatdan o\'tish tugallandi',
    schema: { example: { statusCode: 201, message: 'Amaliyot muvaffaqiyatli bajarildi', data: MARKET_EXAMPLE } },
  })
  @ApiBadRequest('Phone not verified')
  @ApiConflict('Username yoki phone allaqachon mavjud')
  @ApiValidation()
  @ApiRateLimit()
  @Throttle({ sensitive: { limit: 5, ttl: 60000 } })
  @Post('register/complete')
  completeRegister(@Body() dto: RegisterMarketDto) {
    return this.marketService.completeRegister(dto);
  }

  @ApiOperation({ summary: 'Market forgot password - request OTP' })
  @ApiBody({ type: RequestMarketOtpDto })
  @ApiOtpSentResponse()
  @ApiNotFound('Telefon raqam')
  @ApiValidation()
  @ApiRateLimit()
  @Throttle({ sensitive: { limit: 5, ttl: 60000 } })
  @Post('forgot/request-otp')
  forgotRequestOtp(@Body() dto: RequestMarketOtpDto) {
    return this.marketService.requestForgotOtp(dto);
  }

  @ApiOperation({ summary: 'Market forgot password - verify OTP' })
  @ApiBody({ type: VerifyMarketOtpDto })
  @ApiVerifiedResponse()
  @ApiBadRequest('OTP expired yoki noto\'g\'ri')
  @ApiRateLimit()
  @Throttle({ sensitive: { limit: 5, ttl: 60000 } })
  @Post('forgot/verify-otp')
  forgotVerifyOtp(@Body() dto: VerifyMarketOtpDto) {
    return this.marketService.verifyForgotOtp(dto);
  }

  @ApiOperation({ summary: 'Market forgot password - reset password' })
  @ApiBody({ type: ResetMarketPasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Parol yangilandi',
    schema: { example: { statusCode: 200, message: 'Amaliyot muvaffaqiyatli bajarildi', data: MARKET_EXAMPLE } },
  })
  @ApiBadRequest('Phone not verified')
  @ApiNotFound('Foydalanuvchi')
  @ApiRateLimit()
  @Throttle({ sensitive: { limit: 5, ttl: 60000 } })
  @Post('forgot/reset-password')
  forgotResetPassword(@Body() dto: ResetMarketPasswordDto) {
    return this.marketService.resetPassword(dto);
  }

  @ApiOperation({ summary: 'Market restore deleted account - request OTP' })
  @ApiBody({ type: RequestMarketOtpDto })
  @ApiOtpSentResponse()
  @ApiNotFound('O\'chirilgan account')
  @ApiRateLimit()
  @Throttle({ sensitive: { limit: 5, ttl: 60000 } })
  @Post('restore/request-otp')
  restoreRequestOtp(@Body() dto: RequestMarketOtpDto) {
    return this.marketService.requestRestoreOtp(dto);
  }

  @ApiOperation({ summary: 'Market restore deleted account - verify OTP & restore' })
  @ApiBody({ type: VerifyMarketOtpDto })
  @ApiResponse({
    status: 200,
    description: 'Account tiklandi',
    schema: { example: { statusCode: 200, message: 'Amaliyot muvaffaqiyatli bajarildi', data: { restored: true } } },
  })
  @ApiBadRequest('OTP expired yoki noto\'g\'ri')
  @ApiRateLimit()
  @Throttle({ sensitive: { limit: 5, ttl: 60000 } })
  @Post('restore/verify-otp')
  restoreVerifyOtp(@Body() dto: VerifyMarketOtpDto) {
    return this.marketService.restoreAccount(dto);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.MARKET, UserRole.CLIENT)
  @ApiOperation({ summary: 'Get all markets, optionally filter by username (partial match)' })
  @ApiQuery({ name: 'username', required: false, description: 'Partial username search (case-insensitive)' })
  @ApiResponse({
    status: 200,
    description: 'Marketlar ro\'yxati',
    schema: { example: { statusCode: 200, message: 'Amaliyot muvaffaqiyatli bajarildi', data: [MARKET_EXAMPLE] } },
  })
  @ApiUnauthorized()
  @Get()
  findAll(@Query('username') username?: string) {
    return this.marketService.findAllByUsername(username);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @AccessRoles(UserRole.MARKET)
  @ApiOperation({ summary: 'Mening profilim' })
  @ApiResponse({
    status: 200,
    description: 'Market profili',
    schema: { example: { statusCode: 200, message: 'Amaliyot muvaffaqiyatli bajarildi', data: MARKET_EXAMPLE } },
  })
  @ApiUnauthorized()
  @Get('me/profile')
  me(@Req() req: any) {
    return this.marketService.me(req.user.id);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @AccessRoles(UserRole.MARKET)
  @ApiOperation({ summary: 'Mening mahsulotlarim — category, supCategory, market, photos[], comment (+messageCount) bilan' })
  @ApiResponse({
    status: 200,
    description: 'Mahsulotlar ro\'yxati — har biri category, supCategory, market (o\'zi), photos[], comment (+messageCount) bilan keladi',
    schema: {
      example: {
        statusCode: 200,
        message: 'Amaliyot muvaffaqiyatli bajarildi',
        data: [{
          id: 'f1d2c3b4-0000-0000-0000-000000000200',
          name: 'iPhone 15 Pro Max 256GB',
          categoryId: 'f1d2c3b4-0000-0000-0000-000000000001',
          supCategoryId: 'f1d2c3b4-0000-0000-0000-000000000002',
          marketId: MARKET_EXAMPLE.id,
          commentId: 'f1d2c3b4-0000-0000-0000-000000000031',
          price: '15990000',
          amount: 5,
          description: 'Original Apple, yangi',
          isActive: true,
          avgRating: 4.67,
          ratingCount: 9,
          category: {
            id: 'f1d2c3b4-0000-0000-0000-000000000001',
            nameUz: 'Elektronika', nameRu: 'Электроника',
            photoUrl: 'https://api.example.com/uploads/category/electronic.jpg',
            iconUrl: null, hintText: null, withAdress: false, forProduct: true,
          },
          supCategory: {
            id: 'f1d2c3b4-0000-0000-0000-000000000002',
            nameUz: 'Smartfonlar', nameRu: 'Смартфоны',
            categoryId: 'f1d2c3b4-0000-0000-0000-000000000001',
            photoUrl: null, iconUrl: null, hintText: null,
          },
          market: MARKET_EXAMPLE,
          photos: [{
            id: 'f1d2c3b4-0000-0000-0000-000000000021',
            path: 'https://api.example.com/uploads/product/iphone15-front.jpg',
            productId: 'f1d2c3b4-0000-0000-0000-000000000200',
            elonId: null,
          }],
          comment: {
            id: 'f1d2c3b4-0000-0000-0000-000000000031',
            scope: 'PRODUCT',
            productId: 'f1d2c3b4-0000-0000-0000-000000000200',
            elonId: null,
            messageCount: 8,
          },
          createdAt: '2024-02-01T10:00:00.000Z',
          updatedAt: '2024-02-15T14:30:00.000Z',
          isDeleted: false, deletedAt: null,
        }],
      },
    },
  })
  @ApiUnauthorized()
  @Get('me/products')
  myProducts(@Req() req: any) {
    return this.marketService.myProducts(req.user.id);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @AccessRoles(UserRole.MARKET)
  @Patch('me/profile')
  @ApiOperation({ summary: 'Update market profile' })
  @ApiBody({ type: UpdateMarketDto })
  @ApiResponse({
    status: 200,
    description: 'Market profili yangilandi',
    schema: { example: { statusCode: 200, message: 'Amaliyot muvaffaqiyatli bajarildi', data: MARKET_EXAMPLE } },
  })
  @ApiUnauthorized()
  @ApiConflict('Username yoki phone allaqachon mavjud')
  @ApiValidation()
  updateMe(@Req() req: any, @Body() dto: UpdateMarketDto) {
    return this.marketService.updateMe(req.user.id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @AccessRoles(UserRole.MARKET)
  @Post('me/upload-photo')
  @ApiOperation({ summary: 'Upload market photo' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { photo: { type: 'string', format: 'binary' } },
      required: ['photo'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Rasm yuklandi, eski rasm o\'chirildi',
    schema: { example: { statusCode: 200, message: 'Amaliyot muvaffaqiyatli bajarildi', data: MARKET_EXAMPLE } },
  })
  @ApiUnauthorized()
  @UseInterceptors(FileInterceptor('photo', buildMulterOptions({ folder: 'market', allowed: 'image', maxSizeMb: 10 })))
  uploadPhoto(@Req() req: any, @UploadedFile() file: Express.Multer.File) {
    return this.marketService.uploadPhoto(req.user.id, file);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @AccessRoles(UserRole.MARKET)
  @Delete('me/delete-photo')
  @ApiOperation({ summary: 'Delete market photo' })
  @ApiResponse({
    status: 200,
    description: 'Rasm o\'chirildi',
    schema: { example: { statusCode: 200, message: 'Amaliyot muvaffaqiyatli bajarildi', data: { ...MARKET_EXAMPLE, photoPath: null } } },
  })
  @ApiUnauthorized()
  deletePhoto(@Req() req: any) {
    return this.marketService.deletePhoto(req.user.id);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @AccessRoles(UserRole.MARKET)
  @Patch('me/fcm-token')
  @ApiOperation({ summary: 'Firebase FCM token yangilash (push notification uchun)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { token: { type: 'string', example: 'fcm-device-token-here' } },
      required: ['token'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'FCM token yangilandi',
    schema: { example: { statusCode: 200, message: 'Amaliyot muvaffaqiyatli bajarildi', data: { updated: true } } },
  })
  @ApiUnauthorized()
  updateFcmToken(@Req() req: any, @Body('token') token: string) {
    return this.marketService.updateFcmToken(req.user.id, token);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.MARKET, UserRole.CLIENT)
  @ApiOperation({ summary: 'Market ma\'lumotlari (ID bo\'yicha)' })
  @ApiResponse({
    status: 200,
    description: 'Market ma\'lumotlari',
    schema: { example: { statusCode: 200, message: 'Amaliyot muvaffaqiyatli bajarildi', data: MARKET_EXAMPLE } },
  })
  @ApiUnauthorized()
  @ApiNotFound('Market')
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.marketService.findOneById(id);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Market yangilash (admin)' })
  @ApiResponse({
    status: 200,
    description: 'Market yangilandi',
    schema: { example: { statusCode: 200, message: 'Amaliyot muvaffaqiyatli bajarildi', data: MARKET_EXAMPLE } },
  })
  @ApiUnauthorized()
  @ApiForbidden()
  @ApiNotFound('Market')
  @ApiValidation()
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateMarketDto) {
    return this.marketService.update(id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @AccessRoles(UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Market o\'chirish (superadmin)' })
  @ApiDeletedResponse()
  @ApiUnauthorized()
  @ApiForbidden()
  @ApiNotFound('Market')
  @Delete(':id')
  removeByAdmin(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.marketService.deleteWithRole(id, req.user);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'O\'z profilni o\'chirish (market)' })
  @ApiDeletedResponse()
  @ApiUnauthorized()
  @Delete('me')
  removeSelf(@Req() req: any) {
    return this.marketService.deleteWithRole(req.user.id, req.user);
  }
}
