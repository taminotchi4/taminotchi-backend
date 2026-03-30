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
import { Throttle } from '@nestjs/throttler';
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
import {
  ApiUnauthorized,
  ApiForbidden,
  ApiNotFound,
  ApiValidation,
  ApiConflict,
  ApiRateLimit,
  ApiDeletedResponse,
} from 'src/common/swagger/swagger-responses';

const ADMIN_EXAMPLE = {
  id: 'uuid',
  username: 'admin01',
  phoneNumber: '+998901234567',
  email: 'admin@example.com',
  role: 'admin',
  isActive: true,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  isDeleted: false,
  deletedAt: null,
};

@ApiTags('Admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) { }

  @ApiOperation({ summary: 'Admin login' })
  @ApiBody({ type: AdminLoginDto })
  @ApiResponse({
    status: 200,
    description: 'Muvaffaqiyatli login — token cookie ga o\'rnatiladi',
    schema: {
      example: {
        statusCode: 200,
        message: 'Amaliyot muvaffaqiyatli bajarildi',
        data: {
          accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          user: ADMIN_EXAMPLE,
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Login yoki parol noto\'g\'ri' })
  @ApiValidation()
  @ApiRateLimit()
  @Throttle({ sensitive: { limit: 5, ttl: 60000 } })
  @Post('login')
  login(@Body() dto: AdminLoginDto, @Res({ passthrough: true }) res: Response) {
    return this.adminService.adminSignIn(dto, res);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new admin (SUPER_ADMIN only)' })
  @ApiBody({ type: CreateAdminDto })
  @ApiResponse({
    status: 201,
    description: 'Admin muvaffaqiyatli yaratildi',
    schema: {
      example: {
        statusCode: 201,
        message: 'Amaliyot muvaffaqiyatli bajarildi',
        data: ADMIN_EXAMPLE,
      },
    },
  })
  @ApiUnauthorized()
  @ApiForbidden()
  @ApiConflict('Username or phone already exists')
  @ApiValidation()
  @UseGuards(AuthGuard, RolesGuard)
  @AccessRoles(UserRole.SUPERADMIN)
  @Post()
  create(@Body() dto: CreateAdminDto) {
    return this.adminService.createAdmin(dto);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all admins (ADMIN and SUPER_ADMIN)' })
  @ApiResponse({
    status: 200,
    description: 'Adminlar ro\'yxati',
    schema: {
      example: {
        statusCode: 200,
        message: 'Amaliyot muvaffaqiyatli bajarildi',
        data: [ADMIN_EXAMPLE],
      },
    },
  })
  @ApiUnauthorized()
  @ApiForbidden()
  @UseGuards(AuthGuard, RolesGuard)
  @AccessRoles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @Get()
  findAll() {
    return this.adminService.findAllAdmins();
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin dashboard statistics (ADMIN and SUPER_ADMIN)' })
  @ApiResponse({
    status: 200,
    description: 'Dashboard statistikasi',
    schema: {
      example: {
        statusCode: 200,
        message: 'Amaliyot muvaffaqiyatli bajarildi',
        data: {
          totalClients: 120,
          totalMarkets: 45,
          totalProducts: 300,
          totalElons: 85,
          totalGroups: 20,
          totalCategories: 15,
        },
      },
    },
  })
  @ApiUnauthorized()
  @ApiForbidden()
  @UseGuards(AuthGuard, RolesGuard)
  @AccessRoles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @Get('stats')
  stats() {
    return this.adminService.getDashboardStats();
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get admin by id (ADMIN and SUPER_ADMIN)' })
  @ApiResponse({
    status: 200,
    description: 'Admin ma\'lumotlari',
    schema: {
      example: {
        statusCode: 200,
        message: 'Amaliyot muvaffaqiyatli bajarildi',
        data: ADMIN_EXAMPLE,
      },
    },
  })
  @ApiUnauthorized()
  @ApiForbidden()
  @ApiNotFound('Admin')
  @UseGuards(AuthGuard, RolesGuard)
  @AccessRoles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.findOneAdmin(id);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update admin (SUPER_ADMIN only)' })
  @ApiBody({ type: UpdateAdminDto })
  @ApiResponse({
    status: 200,
    description: 'Admin yangilandi',
    schema: {
      example: {
        statusCode: 200,
        message: 'Amaliyot muvaffaqiyatli bajarildi',
        data: ADMIN_EXAMPLE,
      },
    },
  })
  @ApiUnauthorized()
  @ApiForbidden()
  @ApiNotFound('Admin')
  @ApiValidation()
  @UseGuards(AuthGuard, RolesGuard)
  @AccessRoles(UserRole.SUPERADMIN)
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateAdminDto) {
    return this.adminService.updateAdmin(id, dto);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete admin (SUPER_ADMIN only)' })
  @ApiDeletedResponse()
  @ApiUnauthorized()
  @ApiForbidden()
  @ApiNotFound('Admin')
  @UseGuards(AuthGuard, RolesGuard)
  @AccessRoles(UserRole.SUPERADMIN)
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.deleteAdmin(id);
  }
}
