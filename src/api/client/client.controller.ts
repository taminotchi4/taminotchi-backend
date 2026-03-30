import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ClientService } from './client.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { RequestClientOtpDto } from './dto/request-otp.dto';
import { VerifyClientOtpDto } from './dto/verify-otp.dto';
import { RegisterClientDto } from './dto/register-client.dto';
import { ResetClientPasswordDto } from './dto/forgot-password.dto';
import { LanguageType, UserRole } from 'src/common/enum/index.enum';
import { AuthGuard } from 'src/common/guard/auth.guard';
import { RolesGuard } from 'src/common/guard/roles.guard';
import { AccessRoles } from 'src/common/decorator/access-roles.decorator';
import { ClientLoginDto } from './dto/client-login.dto';
import type { Response } from 'express';
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

const CLIENT_EXAMPLE = {
  id: 'uuid',
  fullName: 'Ali Valiyev',
  username: 'ali_v',
  phoneNumber: '+998901234567',
  photoPath: 'https://example.com/uploads/client/photo.jpg',
  language: 'uz',
  role: 'client',
  isActive: true,
  fcmToken: null,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  isDeleted: false,
  deletedAt: null,
};

const ELON_EXAMPLE = {
  id: 'uuid',
  text: 'Mahsulot haqida e\'lon matni',
  categoryId: 'uuid',
  clientId: 'uuid',
  price: '150000',
  status: 'NEGOTIATION',
  answerCount: 3,
  photos: [],
  createdAt: '2024-01-01T00:00:00.000Z',
};

@ApiTags('Client')
@Controller('client')
export class ClientController {
  constructor(private readonly clientService: ClientService) { }

  @ApiOperation({ summary: 'Client login' })
  @ApiBody({ type: ClientLoginDto })
  @ApiResponse({
    status: 200,
    description: 'Muvaffaqiyatli login — accessToken cookie ga o\'rnatiladi',
    schema: {
      example: {
        statusCode: 200,
        message: 'Amaliyot muvaffaqiyatli bajarildi',
        data: {
          accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          user: CLIENT_EXAMPLE,
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Telefon raqam yoki parol noto\'g\'ri' })
  @ApiValidation()
  @ApiRateLimit()
  @Throttle({ sensitive: { limit: 5, ttl: 60000 } })
  @Post('login')
  login(@Body() dto: ClientLoginDto, @Res({ passthrough: true }) res: Response) {
    return this.clientService.clientSignIn(dto, res);
  }

  @ApiOperation({ summary: 'Client register - request OTP' })
  @ApiBody({ type: RequestClientOtpDto })
  @ApiOtpSentResponse()
  @ApiConflict('Phone number already exists')
  @ApiValidation()
  @ApiRateLimit()
  @Throttle({ sensitive: { limit: 5, ttl: 60000 } })
  @Post('register/request-otp')
  requestOtp(@Body() dto: RequestClientOtpDto) {
    return this.clientService.requestRegisterOtp(dto);
  }

  @ApiOperation({ summary: 'Check client phone exists' })
  @ApiResponse({
    status: 200,
    description: 'Telefon raqam tekshiruvi',
    schema: { example: { statusCode: 200, message: 'Amaliyot muvaffaqiyatli bajarildi', data: { exists: false } } },
  })
  @ApiRateLimit()
  @Throttle({ sensitive: { limit: 10, ttl: 60000 } })
  @Get('check-phone/:phone')
  checkPhone(@Param('phone') phone: string) {
    return this.clientService.checkPhone(phone);
  }

  @ApiOperation({ summary: 'Check client username exists' })
  @ApiResponse({
    status: 200,
    description: 'Username tekshiruvi',
    schema: { example: { statusCode: 200, message: 'Amaliyot muvaffaqiyatli bajarildi', data: { exists: true } } },
  })
  @ApiRateLimit()
  @Throttle({ sensitive: { limit: 10, ttl: 60000 } })
  @Get('check-username/:username')
  checkUsername(@Param('username') username: string) {
    return this.clientService.checkUsername(username);
  }

  @ApiOperation({ summary: 'Client register - verify OTP' })
  @ApiBody({ type: VerifyClientOtpDto })
  @ApiVerifiedResponse()
  @ApiBadRequest('OTP expired yoki noto\'g\'ri')
  @ApiValidation()
  @ApiRateLimit()
  @Throttle({ sensitive: { limit: 5, ttl: 60000 } })
  @Post('register/verify-otp')
  verifyOtp(@Body() dto: VerifyClientOtpDto) {
    return this.clientService.verifyRegisterOtp(dto);
  }

  @ApiOperation({ summary: 'Client register - complete profile' })
  @ApiBody({ type: RegisterClientDto })
  @ApiResponse({
    status: 201,
    description: 'Ro\'yxatdan o\'tish tugallandi',
    schema: {
      example: { statusCode: 201, message: 'Amaliyot muvaffaqiyatli bajarildi', data: CLIENT_EXAMPLE },
    },
  })
  @ApiBadRequest('Phone not verified')
  @ApiConflict('Username yoki phone allaqachon mavjud')
  @ApiValidation()
  @ApiRateLimit()
  @Throttle({ sensitive: { limit: 5, ttl: 60000 } })
  @Post('register/complete')
  completeRegister(@Body() dto: RegisterClientDto) {
    return this.clientService.completeRegister(dto);
  }

  @ApiOperation({ summary: 'Client forgot password - request OTP' })
  @ApiBody({ type: RequestClientOtpDto })
  @ApiOtpSentResponse()
  @ApiNotFound('Telefon raqam')
  @ApiValidation()
  @ApiRateLimit()
  @Throttle({ sensitive: { limit: 5, ttl: 60000 } })
  @Post('forgot/request-otp')
  forgotRequestOtp(@Body() dto: RequestClientOtpDto) {
    return this.clientService.requestForgotOtp(dto);
  }

  @ApiOperation({ summary: 'Client forgot password - verify OTP' })
  @ApiBody({ type: VerifyClientOtpDto })
  @ApiVerifiedResponse()
  @ApiBadRequest('OTP expired yoki noto\'g\'ri')
  @ApiRateLimit()
  @Throttle({ sensitive: { limit: 5, ttl: 60000 } })
  @Post('forgot/verify-otp')
  forgotVerifyOtp(@Body() dto: VerifyClientOtpDto) {
    return this.clientService.verifyForgotOtp(dto);
  }

  @ApiOperation({ summary: 'Client forgot password - reset password' })
  @ApiBody({ type: ResetClientPasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Parol yangilandi',
    schema: { example: { statusCode: 200, message: 'Amaliyot muvaffaqiyatli bajarildi', data: CLIENT_EXAMPLE } },
  })
  @ApiBadRequest('Phone not verified')
  @ApiNotFound('Foydalanuvchi')
  @ApiRateLimit()
  @Throttle({ sensitive: { limit: 5, ttl: 60000 } })
  @Post('forgot/reset-password')
  forgotResetPassword(@Body() dto: ResetClientPasswordDto) {
    return this.clientService.resetPassword(dto);
  }

  @ApiOperation({ summary: 'Client restore deleted account - request OTP' })
  @ApiBody({ type: RequestClientOtpDto })
  @ApiOtpSentResponse()
  @ApiNotFound('O\'chirilgan account')
  @ApiRateLimit()
  @Throttle({ sensitive: { limit: 5, ttl: 60000 } })
  @Post('restore/request-otp')
  restoreRequestOtp(@Body() dto: RequestClientOtpDto) {
    return this.clientService.requestRestoreOtp(dto);
  }

  @ApiOperation({ summary: 'Client restore deleted account - verify OTP & restore' })
  @ApiBody({ type: VerifyClientOtpDto })
  @ApiResponse({
    status: 200,
    description: 'Account tiklandi',
    schema: { example: { statusCode: 200, message: 'Amaliyot muvaffaqiyatli bajarildi', data: { restored: true } } },
  })
  @ApiBadRequest('OTP expired yoki noto\'g\'ri')
  @ApiRateLimit()
  @Throttle({ sensitive: { limit: 5, ttl: 60000 } })
  @Post('restore/verify-otp')
  restoreVerifyOtp(@Body() dto: VerifyClientOtpDto) {
    return this.clientService.restoreAccount(dto);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.MARKET, UserRole.CLIENT)
  @ApiOperation({ summary: 'Get all clients, optionally filter by username (partial match)' })
  @ApiQuery({ name: 'username', required: false, description: 'Partial username search (case-insensitive)' })
  @ApiResponse({
    status: 200,
    description: 'Clientlar ro\'yxati',
    schema: { example: { statusCode: 200, message: 'Amaliyot muvaffaqiyatli bajarildi', data: [CLIENT_EXAMPLE] } },
  })
  @ApiUnauthorized()
  @Get()
  findAll(@Query('username') username?: string) {
    return this.clientService.findAllByUsername(username);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @AccessRoles(UserRole.CLIENT)
  @ApiOperation({ summary: 'Mening profilim' })
  @ApiResponse({
    status: 200,
    description: 'Client profili',
    schema: { example: { statusCode: 200, message: 'Amaliyot muvaffaqiyatli bajarildi', data: CLIENT_EXAMPLE } },
  })
  @ApiUnauthorized()
  @Get('me/profile')
  me(@Req() req: any) {
    return this.clientService.me(req.user.id);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @AccessRoles(UserRole.CLIENT)
  @ApiOperation({ summary: 'Mening e\'lonlarim' })
  @ApiResponse({
    status: 200,
    description: 'E\'lonlar ro\'yxati (comment.messageCount bilan)',
    schema: { example: { statusCode: 200, message: 'Amaliyot muvaffaqiyatli bajarildi', data: [ELON_EXAMPLE] } },
  })
  @ApiUnauthorized()
  @Get('me/elons')
  myElons(@Req() req: any) {
    return this.clientService.myElons(req.user.id);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @AccessRoles(UserRole.CLIENT)
  @Patch('me/profile')
  @ApiOperation({ summary: 'Update client profile' })
  @ApiBody({ type: UpdateClientDto })
  @ApiResponse({
    status: 200,
    description: 'Profil yangilandi',
    schema: { example: { statusCode: 200, message: 'Amaliyot muvaffaqiyatli bajarildi', data: CLIENT_EXAMPLE } },
  })
  @ApiUnauthorized()
  @ApiConflict('Username yoki phone allaqachon mavjud')
  @ApiValidation()
  updateMe(@Req() req: any, @Body() dto: UpdateClientDto) {
    return this.clientService.updateMe(req.user.id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @AccessRoles(UserRole.CLIENT)
  @Post('me/upload-photo')
  @ApiOperation({ summary: 'Upload client photo' })
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
    schema: { example: { statusCode: 200, message: 'Amaliyot muvaffaqiyatli bajarildi', data: CLIENT_EXAMPLE } },
  })
  @ApiUnauthorized()
  @UseInterceptors(FileInterceptor('photo', buildMulterOptions({ folder: 'client', allowed: 'image', maxSizeMb: 10 })))
  uploadPhoto(@Req() req: any, @UploadedFile() file: Express.Multer.File) {
    return this.clientService.uploadPhoto(req.user.id, file);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @AccessRoles(UserRole.CLIENT)
  @Delete('me/delete-photo')
  @ApiOperation({ summary: 'Delete client photo' })
  @ApiResponse({
    status: 200,
    description: 'Rasm o\'chirildi',
    schema: { example: { statusCode: 200, message: 'Amaliyot muvaffaqiyatli bajarildi', data: { ...CLIENT_EXAMPLE, photoPath: null } } },
  })
  @ApiUnauthorized()
  deletePhoto(@Req() req: any) {
    return this.clientService.deletePhoto(req.user.id);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @AccessRoles(UserRole.CLIENT)
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
    return this.clientService.updateFcmToken(req.user.id, token);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.MARKET, UserRole.CLIENT)
  @ApiOperation({ summary: 'Client ma\'lumotlari (ID bo\'yicha)' })
  @ApiResponse({
    status: 200,
    description: 'Client ma\'lumotlari',
    schema: { example: { statusCode: 200, message: 'Amaliyot muvaffaqiyatli bajarildi', data: CLIENT_EXAMPLE } },
  })
  @ApiUnauthorized()
  @ApiNotFound('Client')
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.clientService.findOneById(id);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Client yangilash (admin)' })
  @ApiResponse({
    status: 200,
    description: 'Client yangilandi',
    schema: { example: { statusCode: 200, message: 'Amaliyot muvaffaqiyatli bajarildi', data: CLIENT_EXAMPLE } },
  })
  @ApiUnauthorized()
  @ApiForbidden()
  @ApiNotFound('Client')
  @ApiValidation()
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateClientDto) {
    return this.clientService.update(id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @AccessRoles(UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Client o\'chirish (superadmin)' })
  @ApiDeletedResponse()
  @ApiUnauthorized()
  @ApiForbidden()
  @ApiNotFound('Client')
  @Delete(':id')
  removeByAdmin(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.clientService.deleteWithRole(id, req.user);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'O\'z profilni o\'chirish (client)' })
  @ApiDeletedResponse()
  @ApiUnauthorized()
  @Delete('me')
  removeSelf(@Req() req: any) {
    return this.clientService.deleteWithRole(req.user.id, req.user);
  }
}
