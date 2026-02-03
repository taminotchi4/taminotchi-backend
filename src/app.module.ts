import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { RedisModule } from '@nestjs-modules/ioredis';

import { config } from './config';
import { AdminModule } from './api/admin/admin.module';
import { AdminEntity } from './core/entity/admin.entity';
import { ClientEntity } from './core/entity/client.entity';
import { MarketEntity } from './core/entity/market.entity';
import { CategoryEntity } from './core/entity/category.entity';
import { GroupEntity } from './core/entity/group.entity';
import { ElonEntity } from './core/entity/elon.entity';
import { ProductEntity } from './core/entity/product.entity';
import { MessageEntity } from './core/entity/message.entity';
import { CommentEntity } from './core/entity/comment.entity';
import { AdressEntity } from './core/entity/adress.entity';
import { LanguageEntity } from './core/entity/language.entity';
import { PhotoEntity } from './core/entity/photo.entity';
import { OrderEntity } from './core/entity/order.entity';
import { OrderProductEntity } from './core/entity/order-product.entity';
import { ClientModule } from './api/client/client.module';
import { CategoryModule } from './api/category/category.module';
import { ProductModule } from './api/product/product.module';
import { AdressModule } from './api/adress/adress.module';
import { PrivateChatEntity } from './core/entity/private-chat.entity';
import { MarketModule } from './api/market/market.module';
import { CommentModule } from './api/comment/comment.module';
import { ElonModule } from './api/elon/elon.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'], // kerak bo‘lsa
    }),

    TypeOrmModule.forRootAsync({
      useFactory: async () => {
        const isProd = config.NODE_ENV === 'production';

        return {
          type: 'postgres',
          url: config.DB_URL,
          entities: [
            AdminEntity,
            ClientEntity,
            MarketEntity,
            PrivateChatEntity,
            CategoryEntity,
            GroupEntity,
            ElonEntity,
            ProductEntity,
            MessageEntity,
            CommentEntity,
            AdressEntity,
            LanguageEntity,
            PhotoEntity,
            OrderEntity,
            OrderProductEntity,
          ],
          autoLoadEntities: true,
          retryAttempts: 1,
          synchronize: !isProd, // prod’da false bo‘ladi
          logging: ['error', 'warn'],
          ssl: isProd
            ? { rejectUnauthorized: false }
            : false,
        };
      },
    }),

    JwtModule.register({
      global: true,
      secret: config.TOKEN.JWT_SECRET_KEY,
      signOptions: { expiresIn: config.TOKEN.ACCESS_TOKEN_TIME },
    }),

    // Redis bo‘lmasa local’da yiqilmasin
    ...(config.REDIS_URL
      ? [
        RedisModule.forRoot({
          type: 'single',
          url: config.REDIS_URL,
        }),
      ]
      : []),

    // API modules
    AdminModule,
    ClientModule,
    CategoryModule,
    ProductModule,
    AdressModule,
    MarketModule,
    CommentModule,
    ElonModule,
  ],
})
export class AppModule { }
