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
  ForbiddenException,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { ElonService } from './elon.service';
import { CreateElonDto } from './dto/create-elon.dto';
import { UpdateElonDto } from './dto/update-elon.dto';
import { AuthGuard } from 'src/common/guard/auth.guard';
import { RolesGuard } from 'src/common/guard/roles.guard';
import { AccessRoles } from 'src/common/decorator/access-roles.decorator';
import { UserRole } from 'src/common/enum/index.enum';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { buildMulterOptions, toPublicPath } from 'src/infrastructure/upload/upload.util';

@ApiTags('Elon')
@Controller('elon')
export class ElonController {
  constructor(private readonly elonService: ElonService) { }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @AccessRoles(UserRole.CLIENT)
  @Post()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        text: { type: 'string' },
        adressname: { type: 'string' },
        categoryId: { type: 'string', format: 'uuid' },
        supCategoryId: { type: 'string', format: 'uuid' },
        price: { type: 'string' },
        groupId: { type: 'string', format: 'uuid' },
        photo: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          maxItems: 10,
        },
      },
      required: ['text', 'categoryId'],
    },
  })
  @UseInterceptors(
    FileFieldsInterceptor(
      [{ name: 'photo', maxCount: 10 }],
      buildMulterOptions({ folder: 'elon', allowed: 'image', maxSizeMb: 5 }),
    ),
  )
  create(
    @Body() createElonDto: CreateElonDto,
    @Req() req: any,
    @UploadedFiles() files: { photo?: Express.Multer.File[] },
  ) {
    if (req?.user?.role !== UserRole.CLIENT) {
      throw new ForbiddenException('Only client can create elon');
    }
    const photos = files?.photo ?? [];
    return this.elonService.createForClient(
      createElonDto,
      req.user.id,
      photos.map((p) => toPublicPath('elon', p.filename)),
    );
  }

  @Get()
  findAll() {
    return this.elonService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.elonService.findOneById(id);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @AccessRoles(UserRole.CLIENT, UserRole.ADMIN, UserRole.SUPERADMIN)
  @Patch(':id')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        text: { type: 'string' },
        adressname: { type: 'string' },
        categoryId: { type: 'string', format: 'uuid' },
        supCategoryId: { type: 'string', format: 'uuid' },
        price: { type: 'string' },
        groupId: { type: 'string', format: 'uuid' },
        status: { type: 'string' },
        photo: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          maxItems: 10,
        },
      },
    },
  })
  @UseInterceptors(
    FileFieldsInterceptor(
      [{ name: 'photo', maxCount: 10 }],
      buildMulterOptions({ folder: 'elon', allowed: 'image', maxSizeMb: 5 }),
    ),
  )
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateElonDto: UpdateElonDto,
    @UploadedFiles() files: { photo?: Express.Multer.File[] },
  ) {
    const photos = files?.photo ?? [];
    return this.elonService.updateWithPhoto(
      id,
      updateElonDto,
      photos.map((p) => toPublicPath('elon', p.filename)),
    );
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @AccessRoles(UserRole.CLIENT, UserRole.ADMIN, UserRole.SUPERADMIN)
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.elonService.delete(id);
  }
}
