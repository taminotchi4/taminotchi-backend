import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { SupCategoryService } from './sup-category.service';
import { CreateSupCategoryDto } from './dto/create-sup-category.dto';
import { UpdateSupCategoryDto } from './dto/update-sup-category.dto';
import { buildMulterOptions, toPublicPath } from 'src/infrastructure/upload/upload.util';
import { AuthGuard } from 'src/common/guard/auth.guard';
import { RolesGuard } from 'src/common/guard/roles.guard';
import { AccessRoles } from 'src/common/decorator/access-roles.decorator';
import { UserRole } from 'src/common/enum/index.enum';

@ApiTags('SupCategory')
@Controller('sup-category')
export class SupCategoryController {
  constructor(private readonly supCategoryService: SupCategoryService) { }

  @Get()
  findAll() {
    return this.supCategoryService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.supCategoryService.findOne(id);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN)
  @Post()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        nameUz: { type: 'string', example: 'Smartfonlar' },
        nameRu: { type: 'string', example: 'Смартфоны' },
        categoryId: { type: 'string', format: 'uuid' },
        photo: { type: 'string', format: 'binary' },
        icon: { type: 'string', format: 'binary' },
      },
      required: ['nameUz', 'categoryId'],
    },
  })
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'photo', maxCount: 1 },
        { name: 'icon', maxCount: 1 },
      ],
      buildMulterOptions({ folder: 'sup-category', allowed: 'image', maxSizeMb: 3 }),
    ),
  )
  create(
    @Body() dto: CreateSupCategoryDto,
    @UploadedFiles()
    files: { photo?: Express.Multer.File[]; icon?: Express.Multer.File[] },
  ) {
    const photo = files?.photo?.[0];
    const icon = files?.icon?.[0];

    return this.supCategoryService.create(dto, {
      photoPath: photo ? toPublicPath('sup-category', photo.filename) : null,
      iconPath: icon ? toPublicPath('sup-category', icon.filename) : null,
    });
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN)
  @Patch(':id')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        nameUz: { type: 'string', example: 'Smartfonlar' },
        nameRu: { type: 'string', example: 'Смартфоны' },
        categoryId: { type: 'string', format: 'uuid' },
        photo: { type: 'string', format: 'binary' },
        icon: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'photo', maxCount: 1 },
        { name: 'icon', maxCount: 1 },
      ],
      buildMulterOptions({ folder: 'sup-category', allowed: 'image', maxSizeMb: 3 }),
    ),
  )
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSupCategoryDto,
    @UploadedFiles()
    files: { photo?: Express.Multer.File[]; icon?: Express.Multer.File[] },
  ) {
    const photo = files?.photo?.[0];
    const icon = files?.icon?.[0];

    return this.supCategoryService.update(id, dto, {
      photoPath: photo ? toPublicPath('sup-category', photo.filename) : null,
      iconPath: icon ? toPublicPath('sup-category', icon.filename) : null,
    });
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @AccessRoles(UserRole.SUPERADMIN)
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.supCategoryService.remove(id);
  }
}
