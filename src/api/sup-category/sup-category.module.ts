import { Module } from '@nestjs/common';
import { SupCategoryService } from './sup-category.service';
import { SupCategoryController } from './sup-category.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SupCategoryEntity } from 'src/core/entity/sup-category.entity';
import { CategoryEntity } from 'src/core/entity/category.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SupCategoryEntity, CategoryEntity])],
  controllers: [SupCategoryController],
  providers: [SupCategoryService],
  exports: [SupCategoryService],
})
export class SupCategoryModule {}
