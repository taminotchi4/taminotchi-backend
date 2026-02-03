import { Module } from '@nestjs/common';
import { CommentService } from './comment.service';
import { CommentController } from './comment.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommentEntity } from 'src/core/entity/comment.entity';
import { MessageEntity } from 'src/core/entity/message.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CommentEntity, MessageEntity])],
  controllers: [CommentController],
  providers: [CommentService],
  exports: [CommentService],
})
export class CommentModule {}
