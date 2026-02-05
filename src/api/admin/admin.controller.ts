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

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new admin (SUPER_ADMIN only)' })
  @ApiBody({ type: CreateAdminDto })
  @UseGuards(AuthGuard, RolesGuard)
  @AccessRoles(UserRole.SUPERADMIN)
  @Post()
  create(@Body() dto: CreateAdminDto) {
    return this.adminService.createAdmin(dto);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all admins (ADMIN and SUPER_ADMIN)' })
  @UseGuards(AuthGuard, RolesGuard)
  @AccessRoles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @Get()
  findAll() {
    return this.adminService.findAllAdmins();
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin dashboard statistics (ADMIN and SUPER_ADMIN)' })
  @UseGuards(AuthGuard, RolesGuard)
  @AccessRoles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @Get('stats')
  stats() {
    return this.adminService.getDashboardStats();
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get admin by id (ADMIN and SUPER_ADMIN)' })
  @UseGuards(AuthGuard, RolesGuard)
  @AccessRoles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.findOneAdmin(id);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update admin (SUPER_ADMIN only)' })
  @ApiBody({ type: UpdateAdminDto })
  @UseGuards(AuthGuard, RolesGuard)
  @AccessRoles(UserRole.SUPERADMIN)
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateAdminDto) {
    return this.adminService.updateAdmin(id, dto);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete admin (SUPER_ADMIN only)' })
  @UseGuards(AuthGuard, RolesGuard)
  @AccessRoles(UserRole.SUPERADMIN)
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.deleteAdmin(id);
  }
}
