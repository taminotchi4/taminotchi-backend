import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminEntity } from 'src/core/entity/admin.entity';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { CryptoService } from 'src/infrastructure/crypto/crypto.service';
import { ClientEntity } from 'src/core/entity/client.entity';
import { MarketEntity } from 'src/core/entity/market.entity';
import { CategoryEntity } from 'src/core/entity/category.entity';
import { GroupEntity } from 'src/core/entity/group.entity';
import { ElonEntity } from 'src/core/entity/elon.entity';
import { ProductEntity } from 'src/core/entity/product.entity';
import { MessageEntity } from 'src/core/entity/message.entity';
import { AuthCommonModule } from 'src/common/auth/auth-common.module';

@Module({
  imports: [TypeOrmModule.forFeature([
    AdminEntity,
    ClientEntity,
    MarketEntity,
    CategoryEntity,
    GroupEntity,
    ElonEntity,
    ProductEntity,
    MessageEntity,
  ]), AuthCommonModule],
  controllers: [AdminController],
  providers: [AdminService, CryptoService],
  exports: [AdminService],
})
export class AdminModule { }
