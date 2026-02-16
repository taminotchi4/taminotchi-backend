import { Module } from '@nestjs/common';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductEntity } from 'src/core/entity/product.entity';
import { CommentEntity } from 'src/core/entity/comment.entity';
import { PhotoEntity } from 'src/core/entity/photo.entity';
import { CategoryEntity } from 'src/core/entity/category.entity';
import { SupCategoryEntity } from 'src/core/entity/sup-category.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProductEntity,
      CommentEntity,
      PhotoEntity,
      CategoryEntity,
      SupCategoryEntity,
    ]),
  ],
  controllers: [ProductController],
  providers: [ProductService],
  exports: [ProductService],
})
export class ProductModule {}
