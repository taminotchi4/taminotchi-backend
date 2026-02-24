import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { GroupService } from './group.service';
import { GroupController } from './group.controller';
import { GroupChatGateway } from './group-chat.gateway';
import { GroupChatService } from './group-chat.service';

import { GroupEntity } from 'src/core/entity/group.entity';
import { MarketEntity } from 'src/core/entity/market.entity';
import { SupCategoryEntity } from 'src/core/entity/sup-category.entity';
import { CategoryEntity } from 'src/core/entity/category.entity';
import { MessageEntity } from 'src/core/entity/message.entity';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      GroupEntity,
      MarketEntity,
      SupCategoryEntity,
      CategoryEntity,
      MessageEntity,
    ]),
    NotificationModule,
  ],
  controllers: [GroupController],
  providers: [GroupService, GroupChatGateway, GroupChatService],
  exports: [GroupService, GroupChatService],
})
export class GroupModule { }
