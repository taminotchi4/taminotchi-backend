import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';

import { PrivateChatController } from './private-chat.controller';
import { PrivateChatService } from './private-chat.service';
import { PrivateChatGateway } from './private-chat.gateway';
import { PrivateChatWsService } from './private-chat-ws.service';

import { PrivateChatEntity } from 'src/core/entity/private-chat.entity';
import { MessageEntity } from 'src/core/entity/message.entity';
import { ClientEntity } from 'src/core/entity/client.entity';
import { MarketEntity } from 'src/core/entity/market.entity';
import { AdminEntity } from 'src/core/entity/admin.entity';
import { NotificationModule } from '../notification/notification.module';
import { config } from 'src/config';

@Module({
  imports: [
    TypeOrmModule.forFeature([PrivateChatEntity, MessageEntity, ClientEntity, MarketEntity, AdminEntity]),
    JwtModule.register({
      secret: config.TOKEN.ACCESS_TOKEN_KEY,
      signOptions: { expiresIn: config.TOKEN.ACCESS_TOKEN_TIME },
    }),
    NotificationModule,
  ],
  controllers: [PrivateChatController],
  providers: [PrivateChatService, PrivateChatGateway, PrivateChatWsService],
  exports: [PrivateChatService],
})
export class PrivateChatModule { }
