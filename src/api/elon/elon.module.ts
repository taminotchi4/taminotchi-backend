import { Module } from '@nestjs/common';
import { ElonService } from './elon.service';
import { ElonController } from './elon.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ElonEntity } from 'src/core/entity/elon.entity';
import { CommentEntity } from 'src/core/entity/comment.entity';
import { PhotoEntity } from 'src/core/entity/photo.entity';
import { CategoryEntity } from 'src/core/entity/category.entity';
import { SupCategoryEntity } from 'src/core/entity/sup-category.entity';
import { GroupEntity } from 'src/core/entity/group.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ElonEntity,
      CommentEntity,
      PhotoEntity,
      CategoryEntity,
      SupCategoryEntity,
      GroupEntity,
    ]),
  ],
  controllers: [ElonController],
  providers: [ElonService],
  exports: [ElonService],
})
export class ElonModule {}
