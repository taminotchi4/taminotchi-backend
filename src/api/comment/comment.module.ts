import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';

import { CommentService } from './comment.service';
import { CommentController } from './comment.controller';
import { CommentChatGateway } from './comment-chat.gateway';
import { CommentChatService } from './comment-chat.service';

import { CommentEntity } from 'src/core/entity/comment.entity';
import { MessageEntity } from 'src/core/entity/message.entity';
import { config } from 'src/config';

@Module({
  imports: [
    TypeOrmModule.forFeature([CommentEntity, MessageEntity]),
    JwtModule.register({
      secret: config.TOKEN.ACCESS_TOKEN_KEY,
      signOptions: { expiresIn: config.TOKEN.ACCESS_TOKEN_TIME },
    }),
  ],
  controllers: [CommentController],
  providers: [CommentService, CommentChatGateway, CommentChatService],
  exports: [CommentService],
})
export class CommentModule { }
