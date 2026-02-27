import { Module } from '@nestjs/common';
import { MarketService } from './market.service';
import { MarketController } from './market.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MarketEntity } from 'src/core/entity/market.entity';
import { AuthCommonModule } from 'src/common/auth/auth-common.module';
import { CryptoService } from 'src/infrastructure/crypto/crypto.service';
import { AdressEntity } from 'src/core/entity/adress.entity';
import { ProductEntity } from 'src/core/entity/product.entity';
import { PhotoEntity } from 'src/core/entity/photo.entity';
import { MessageEntity } from 'src/core/entity/message.entity';
import { CommentEntity } from 'src/core/entity/comment.entity';
import { PrivateChatEntity } from 'src/core/entity/private-chat.entity';

@Module({
  imports: [TypeOrmModule.forFeature([
    MarketEntity,
    AdressEntity,
    ProductEntity,
    PhotoEntity,
    MessageEntity,
    CommentEntity,
    PrivateChatEntity,
  ]), AuthCommonModule],
  controllers: [MarketController],
  providers: [MarketService, CryptoService],
  exports: [MarketService],
})
export class MarketModule { }
