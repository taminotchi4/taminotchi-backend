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
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { buildMulterOptions, toPublicPath } from 'src/infrastructure/upload/upload.util';
import { UserRole } from 'src/common/enum/index.enum';
import { AuthGuard } from 'src/common/guard/auth.guard';
import { RolesGuard } from 'src/common/guard/roles.guard';
import { AccessRoles } from 'src/common/decorator/access-roles.decorator';
import {
  ApiUnauthorized,
  ApiForbidden,
  ApiNotFound,
  ApiValidation,
  ApiDeletedResponse,
} from 'src/common/swagger/swagger-responses';

const CATEGORY_EXAMPLE = {
  id: 'uuid',
  nameUz: 'Elektronika',
  nameRu: 'Электроника',
  hintText: 'Qisqa izoh',
  withAdress: false,
  forProduct: true,
  photoPath: 'https://example.com/uploads/category/photo.jpg',
  iconPath: 'https://example.com/uploads/category/icon.png',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  isDeleted: false,
  deletedAt: null,
};

@ApiTags('Category')
@Controller('category')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) { }

  @Get()
  @ApiOperation({ summary: 'Barcha kategoriyalar' })
  @ApiResponse({
    status: 200,
    description: 'Kategoriyalar ro\'yxati',
    schema: { example: { statusCode: 200, message: 'Amaliyot muvaffaqiyatli bajarildi', data: [CATEGORY_EXAMPLE] } },
  })
  findAll(@Req() req: any) {
    return this.categoryService.findAll(req?.lang);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Kategoriya (ID bo\'yicha)' })
  @ApiResponse({
    status: 200,
    description: 'Kategoriya ma\'lumotlari',
    schema: { example: { statusCode: 200, message: 'Amaliyot muvaffaqiyatli bajarildi', data: CATEGORY_EXAMPLE } },
  })
  @ApiNotFound('Kategoriya')
  findOne(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.categoryService.findOne(id, req?.lang);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN)
  @Post()
  @ApiOperation({ summary: 'Yangi kategoriya yaratish (Admin)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        nameUz: { type: 'string', example: 'Avto ehtiyot qismlar' },
        nameRu: { type: 'string', example: 'Автозапчасти' },
        hintText: { type: 'string', example: 'Qisqa izoh' },
        withAdress: { type: 'boolean' },
        forProduct: { type: 'boolean' },
        photo: { type: 'string', format: 'binary' },
        icon: { type: 'string', format: 'binary' },
      },
      required: ['nameUz'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Kategoriya yaratildi',
    schema: { example: { statusCode: 201, message: 'Amaliyot muvaffaqiyatli bajarildi', data: CATEGORY_EXAMPLE } },
  })
  @ApiUnauthorized()
  @ApiForbidden()
  @ApiValidation()
  @UseInterceptors(
    FileFieldsInterceptor(
      [{ name: 'photo', maxCount: 1 }, { name: 'icon', maxCount: 1 }],
      buildMulterOptions({ folder: 'category', allowed: 'image', maxSizeMb: 10 }),
    ),
  )
  create(
    @Body() dto: CreateCategoryDto,
    @UploadedFiles() files: { photo?: Express.Multer.File[]; icon?: Express.Multer.File[] },
  ) {
    const photo = files?.photo?.[0];
    const icon = files?.icon?.[0];
    return this.categoryService.create(dto, {
      photoUrl: photo ? toPublicPath('category', photo.filename) : null,
      iconUrl: icon ? toPublicPath('category', icon.filename) : null,
    });
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN)
  @Patch(':id')
  @ApiOperation({ summary: 'Kategoriya yangilash (Admin)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        nameUz: { type: 'string', example: 'Elektronika' },
        nameRu: { type: 'string', example: 'Электроника' },
        hintText: { type: 'string', example: 'Qisqa izoh' },
        withAdress: { type: 'boolean', example: false },
        forProduct: { type: 'boolean', example: false },
        photo: { type: 'string', format: 'binary' },
        icon: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Kategoriya yangilandi',
    schema: { example: { statusCode: 200, message: 'Amaliyot muvaffaqiyatli bajarildi', data: CATEGORY_EXAMPLE } },
  })
  @ApiUnauthorized()
  @ApiForbidden()
  @ApiNotFound('Kategoriya')
  @ApiValidation()
  @UseInterceptors(
    FileFieldsInterceptor(
      [{ name: 'photo', maxCount: 1 }, { name: 'icon', maxCount: 1 }],
      buildMulterOptions({ folder: 'category', allowed: 'image', maxSizeMb: 10 }),
    ),
  )
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
    @UploadedFiles() files: { photo?: Express.Multer.File[]; icon?: Express.Multer.File[] },
  ) {
    const photo = files?.photo?.[0];
    const icon = files?.icon?.[0];
    return this.categoryService.update(id, dto, {
      photoUrl: photo ? toPublicPath('category', photo.filename) : null,
      iconUrl: icon ? toPublicPath('category', icon.filename) : null,
    });
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @AccessRoles(UserRole.SUPERADMIN)
  @Delete(':id')
  @ApiOperation({ summary: 'Kategoriya o\'chirish (SuperAdmin)' })
  @ApiDeletedResponse()
  @ApiUnauthorized()
  @ApiForbidden()
  @ApiNotFound('Kategoriya')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.categoryService.remove(id);
  }
}
