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
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { AuthGuard } from 'src/common/guard/auth.guard';
import { RolesGuard } from 'src/common/guard/roles.guard';
import { AccessRoles } from 'src/common/decorator/access-roles.decorator';
import { UserRole } from 'src/common/enum/index.enum';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { buildMulterOptions, toPublicPath } from 'src/infrastructure/upload/upload.util';

@ApiTags('Product')
@Controller('product')
export class ProductController {
  constructor(private readonly productService: ProductService) { }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @AccessRoles(UserRole.MARKET)
  @Post()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        categoryId: { type: 'string', format: 'uuid' },
        supCategoryId: { type: 'string', format: 'uuid' },
        price: { type: 'string' },
        amount: { type: 'number' },
        description: { type: 'string' },
        photo: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          maxItems: 10,
        },
      },
      required: ['name', 'categoryId', 'price', 'amount'],
    },
  })
  @UseInterceptors(
    FileFieldsInterceptor(
      [{ name: 'photo', maxCount: 10 }],
      buildMulterOptions({ folder: 'product', allowed: 'image', maxSizeMb: 5 }),
    ),
  )
  create(
    @Body() createProductDto: CreateProductDto,
    @Req() req: any,
    @UploadedFiles() files: { photo?: Express.Multer.File[] },
  ) {
    if (req?.user?.role !== UserRole.MARKET) {
      throw new ForbiddenException('Only market can create product');
    }
    const photos = files?.photo ?? [];
    return this.productService.createForMarket(
      createProductDto,
      req.user.id,
      photos.map((p) => toPublicPath('product', p.filename)),
    );
  }

  @Get()
  findAll() {
    return this.productService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.productService.findOneById(id);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.MARKET)
  @Patch(':id')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        categoryId: { type: 'string', format: 'uuid' },
        supCategoryId: { type: 'string', format: 'uuid' },
        price: { type: 'string' },
        amount: { type: 'number' },
        description: { type: 'string' },
        isActive: { type: 'boolean' },
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
      buildMulterOptions({ folder: 'product', allowed: 'image', maxSizeMb: 5 }),
    ),
  )
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateProductDto: UpdateProductDto,
    @UploadedFiles() files: { photo?: Express.Multer.File[] },
  ) {
    const photos = files?.photo ?? [];
    return this.productService.updateWithPhoto(
      id,
      updateProductDto,
      photos.map((p) => toPublicPath('product', p.filename)),
    );
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.MARKET)
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.productService.delete(id);
  }
}
