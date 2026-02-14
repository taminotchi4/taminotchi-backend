import { Module } from '@nestjs/common';
import { ElonService } from './elon.service';
import { ElonController } from './elon.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ElonEntity } from 'src/core/entity/elon.entity';
import { CommentEntity } from 'src/core/entity/comment.entity';
import { PhotoEntity } from 'src/core/entity/photo.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ElonEntity, CommentEntity, PhotoEntity])],
  controllers: [ElonController],
  providers: [ElonService],
  exports: [ElonService],
})
export class ElonModule {}
