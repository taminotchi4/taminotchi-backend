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
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MarketService } from './market.service';
import { CreateMarketDto } from './dto/create-market.dto';
import { UpdateMarketDto } from './dto/update-market.dto';
import { MarketLoginDto } from './dto/market-login.dto';
import { RequestMarketOtpDto } from './dto/request-otp.dto';
import { VerifyMarketOtpDto } from './dto/verify-otp.dto';
import { RegisterMarketDto } from './dto/register-market.dto';
import type { Response } from 'express';
import { AuthGuard } from 'src/common/guard/auth.guard';
import { RolesGuard } from 'src/common/guard/roles.guard';
import { AccessRoles } from 'src/common/decorator/access-roles.decorator';
import { UserRole } from 'src/common/enum/index.enum';

@ApiTags('Market')
@Controller('market')
export class MarketController {
  constructor(private readonly marketService: MarketService) { }

  @ApiOperation({ summary: 'Market login' })
  @ApiBody({ type: MarketLoginDto })
  @Post('login')
  login(@Body() dto: MarketLoginDto, @Res({ passthrough: true }) res: Response) {
    return this.marketService.marketSignIn(dto, res);
  }

  @ApiOperation({ summary: 'Market register - request OTP' })
  @ApiBody({ type: RequestMarketOtpDto })
  @Post('register/request-otp')
  requestOtp(@Body() dto: RequestMarketOtpDto) {
    return this.marketService.requestRegisterOtp(dto);
  }

  @ApiOperation({ summary: 'Market register - verify OTP' })
  @ApiBody({ type: VerifyMarketOtpDto })
  @Post('register/verify-otp')
  verifyOtp(@Body() dto: VerifyMarketOtpDto) {
    return this.marketService.verifyRegisterOtp(dto);
  }

  @ApiOperation({ summary: 'Market register - complete profile' })
  @ApiBody({ type: RegisterMarketDto })
  @Post('register/complete')
  completeRegister(@Body() dto: RegisterMarketDto) {
    return this.marketService.completeRegister(dto);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN)
  @Get()
  findAll() {
    return this.marketService.findAll();
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @AccessRoles(UserRole.MARKET)
  @Get('me/profile')
  me(@Req() req: any) {
    return this.marketService.me(req.user.id);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @AccessRoles(UserRole.MARKET)
  @Patch('me/profile')
  updateMe(@Req() req: any, @Body() dto: UpdateMarketDto) {
    return this.marketService.updateMe(req.user.id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN)
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.marketService.findOneById(id);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN)
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateMarketDto) {
    return this.marketService.update(id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @AccessRoles(UserRole.SUPERADMIN)
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.marketService.delete(id);
  }
}
