import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MessageService } from './message.service';
import { MessageController } from './message.controller';
import { MessageUploadController } from './message-upload.controller';
import { MessageEntity } from 'src/core/entity/message.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MessageEntity])],
  controllers: [MessageController, MessageUploadController],
  providers: [MessageService],
  exports: [MessageService],
})
export class MessageModule { }

