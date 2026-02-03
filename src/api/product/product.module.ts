import { Module } from '@nestjs/common';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductEntity } from 'src/core/entity/product.entity';
import { CommentEntity } from 'src/core/entity/comment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ProductEntity, CommentEntity])],
  controllers: [ProductController],
  providers: [ProductService],
  exports: [ProductService],
})
export class ProductModule {}
