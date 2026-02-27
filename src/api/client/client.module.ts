import { Module } from '@nestjs/common';
import { ClientService } from './client.service';
import { ClientController } from './client.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientEntity } from 'src/core/entity/client.entity';
import { AuthCommonModule } from 'src/common/auth/auth-common.module';
import { CryptoService } from 'src/infrastructure/crypto/crypto.service';
import { ElonEntity } from 'src/core/entity/elon.entity';
import { PhotoEntity } from 'src/core/entity/photo.entity';
import { MessageEntity } from 'src/core/entity/message.entity';
import { CommentEntity } from 'src/core/entity/comment.entity';
import { PrivateChatEntity } from 'src/core/entity/private-chat.entity';

@Module({
  imports: [TypeOrmModule.forFeature([
    ClientEntity,
    ElonEntity,
    PhotoEntity,
    MessageEntity,
    CommentEntity,
    PrivateChatEntity,
  ]), AuthCommonModule],
  controllers: [ClientController],
  providers: [ClientService, CryptoService],
  exports: [ClientService],
})
export class ClientModule { }
