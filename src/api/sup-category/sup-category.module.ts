import { Module } from '@nestjs/common';
import { SupCategoryService } from './sup-category.service';
import { SupCategoryController } from './sup-category.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SupCategoryEntity } from 'src/core/entity/sup-category.entity';
import { CategoryEntity } from 'src/core/entity/category.entity';
import { ProductEntity } from 'src/core/entity/product.entity';
import { GroupEntity } from 'src/core/entity/group.entity';
import { ElonEntity } from 'src/core/entity/elon.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SupCategoryEntity, CategoryEntity, ProductEntity, GroupEntity, ElonEntity])],
  controllers: [SupCategoryController],
  providers: [SupCategoryService],
  exports: [SupCategoryService],
})
export class SupCategoryModule {}
