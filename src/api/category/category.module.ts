import { Module } from '@nestjs/common';
import { CategoryService } from './category.service';
import { CategoryController } from './category.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoryEntity } from 'src/core/entity/category.entity';
import { SupCategoryEntity } from 'src/core/entity/sup-category.entity';
import { ProductEntity } from 'src/core/entity/product.entity';
import { ElonEntity } from 'src/core/entity/elon.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CategoryEntity, SupCategoryEntity, ProductEntity, ElonEntity])],
  controllers: [CategoryController],
  providers: [CategoryService],
  exports: [CategoryService],
})
export class CategoryModule {}
