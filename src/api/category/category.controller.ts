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
import { ApiBearerAuth, ApiConsumes, ApiTags, ApiBody } from '@nestjs/swagger';
import { FileFieldsInterceptor } from '@nestjs/platform-express';

import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

import { buildMulterOptions, toPublicPath } from 'src/infrastructure/upload/upload.util';
import { UserRole } from 'src/common/enum/index.enum';

import { AuthGuard } from 'src/common/guard/auth.guard';
import { RolesGuard } from 'src/common/guard/roles.guard';
import { AccessRoles } from 'src/common/decorator/access-roles.decorator';

@ApiTags('Category')
@Controller('category')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) { }

  @Get()
  findAll(@Req() req: any) {
    return this.categoryService.findAll(req?.lang);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.categoryService.findOne(id, req?.lang);
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
        nameUz: { type: 'string', example: 'Avto ehtiyot qismlar' },
        nameRu: { type: 'string', example: 'Автозапчасти' },
        photo: { type: 'string', format: 'binary' },
        icon: { type: 'string', format: 'binary' },
      },
      required: ['nameUz'],
    },
  })
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'photo', maxCount: 1 },
        { name: 'icon', maxCount: 1 },
      ],
      buildMulterOptions({ folder: 'category', allowed: 'image', maxSizeMb: 3 }),
    ),
  )
  create(
    @Body() dto: CreateCategoryDto,
    @UploadedFiles()
    files: { photo?: Express.Multer.File[]; icon?: Express.Multer.File[] },
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
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        nameUz: { type: 'string', example: 'Elektronika' },
        nameRu: { type: 'string', example: 'Электроника' },
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
      buildMulterOptions({ folder: 'category', allowed: 'image', maxSizeMb: 3 }),
    ),
  )
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
    @UploadedFiles()
    files: { photo?: Express.Multer.File[]; icon?: Express.Multer.File[] },
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
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.categoryService.remove(id);
  }
}
