import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { AdminLoginDto } from './dto/admin-login.dto';

import { AuthGuard } from 'src/common/guard/auth.guard';
import { RolesGuard } from 'src/common/guard/roles.guard';
import { AccessRoles } from 'src/common/decorator/access-roles.decorator';
import { UserRole } from 'src/common/enum/index.enum';
import type { Response } from 'express';

@ApiTags('Admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) { }

  @ApiOperation({ summary: 'Admin login' })
  @ApiBody({ type: AdminLoginDto })
  @Post('login')
  login(@Body() dto: AdminLoginDto, @Res({ passthrough: true }) res: Response) {
    return this.adminService.adminSignIn(dto, res);
  }

  @ApiOperation({ summary: 'Create a new admin (SUPER_ADMIN only)' })
  @ApiBody({ type: CreateAdminDto })
  @UseGuards(AuthGuard, RolesGuard)
  @AccessRoles(UserRole.SUPERADMIN)
  @ApiBearerAuth()
  @Post()
  create(@Body() dto: CreateAdminDto) {
    return this.adminService.createAdmin(dto);
  }

  @ApiOperation({ summary: 'Get all admins (ADMIN and SUPER_ADMIN)' })
  @UseGuards(AuthGuard, RolesGuard)
  @AccessRoles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiBearerAuth()
  @Get()
  findAll() {
    return this.adminService.findAllAdmins();
  }

  @ApiOperation({ summary: 'Admin dashboard statistics (ADMIN and SUPER_ADMIN)' })
  @UseGuards(AuthGuard, RolesGuard)
  @AccessRoles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiBearerAuth()
  @Get('stats')
  stats() {
    return this.adminService.getDashboardStats();
  }

  @ApiOperation({ summary: 'Get admin by id (ADMIN and SUPER_ADMIN)' })
  @UseGuards(AuthGuard, RolesGuard)
  @AccessRoles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiBearerAuth()
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.findOneAdmin(id);
  }

  @ApiOperation({ summary: 'Update admin (SUPER_ADMIN only)' })
  @ApiBody({ type: UpdateAdminDto })
  @UseGuards(AuthGuard, RolesGuard)
  @AccessRoles(UserRole.SUPERADMIN)
  @ApiBearerAuth()
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateAdminDto) {
    return this.adminService.updateAdmin(id, dto);
  }

  @ApiOperation({ summary: 'Delete admin (SUPER_ADMIN only)' })
  @UseGuards(AuthGuard, RolesGuard)
  @AccessRoles(UserRole.SUPERADMIN)
  @ApiBearerAuth()
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.deleteAdmin(id);
  }
}
