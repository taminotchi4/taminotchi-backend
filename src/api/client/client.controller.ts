import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ClientService } from './client.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { RequestClientOtpDto } from './dto/request-otp.dto';
import { VerifyClientOtpDto } from './dto/verify-otp.dto';
import { RegisterClientDto } from './dto/register-client.dto';

import { UserRole } from 'src/common/enum/index.enum';
import { AuthGuard } from 'src/common/guard/auth.guard';
import { RolesGuard } from 'src/common/guard/roles.guard';
import { AccessRoles } from 'src/common/decorator/access-roles.decorator';
import { ClientLoginDto } from './dto/client-login.dto';
import type { Response } from 'express';

@ApiTags('Client')
@Controller('client')
export class ClientController {
  constructor(private readonly clientService: ClientService) { }

  @ApiOperation({ summary: 'Client login' })
  @ApiBody({ type: ClientLoginDto })
  @Post('login')
  login(@Body() dto: ClientLoginDto, @Res({ passthrough: true }) res: Response) {
    return this.clientService.clientSignIn(dto, res);
  }

  @ApiOperation({ summary: 'Client register - request OTP' })
  @ApiBody({ type: RequestClientOtpDto })
  @Post('register/request-otp')
  requestOtp(@Body() dto: RequestClientOtpDto) {
    return this.clientService.requestRegisterOtp(dto);
  }

  @ApiOperation({ summary: 'Check client phone exists' })
  @Get('check-phone/:phone')
  checkPhone(@Param('phone') phone: string) {
    return this.clientService.checkPhone(phone);
  }

  @ApiOperation({ summary: 'Check client username exists' })
  @Get('check-username/:username')
  checkUsername(@Param('username') username: string) {
    return this.clientService.checkUsername(username);
  }

  @ApiOperation({ summary: 'Client register - verify OTP' })
  @ApiBody({ type: VerifyClientOtpDto })
  @Post('register/verify-otp')
  verifyOtp(@Body() dto: VerifyClientOtpDto) {
    return this.clientService.verifyRegisterOtp(dto);
  }

  @ApiOperation({ summary: 'Client register - complete profile' })
  @ApiBody({ type: RegisterClientDto })
  @Post('register/complete')
  completeRegister(@Body() dto: RegisterClientDto) {
    return this.clientService.completeRegister(dto);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN)
  @Get()
  findAll() {
    return this.clientService.findAll();
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @AccessRoles(UserRole.CLIENT)
  @Get('me/profile')
  me(@Req() req: any) {
    return this.clientService.me(req.user.id);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @AccessRoles(UserRole.CLIENT)
  @Get('me/elons')
  myElons(@Req() req: any) {
    return this.clientService.myElons(req.user.id);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @AccessRoles(UserRole.CLIENT)
  @Patch('me/profile')
  updateMe(@Req() req: any, @Body() dto: UpdateClientDto) {
    return this.clientService.updateMe(req.user.id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN)
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.clientService.findOneById(id);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN)
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateClientDto) {
    return this.clientService.update(id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @AccessRoles(UserRole.SUPERADMIN)
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.clientService.delete(id);
  }
}
