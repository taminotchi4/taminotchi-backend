import { Module } from '@nestjs/common';
import { ClientService } from './client.service';
import { ClientController } from './client.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientEntity } from 'src/core/entity/client.entity';
import { AuthCommonModule } from 'src/common/auth/auth-common.module';
import { CryptoService } from 'src/infrastructure/crypto/crypto.service';
import { ElonEntity } from 'src/core/entity/elon.entity';

@Module({
  imports: [TypeOrmModule.forFeature([
    ClientEntity,
    ElonEntity,
  ]), AuthCommonModule],
  controllers: [ClientController],
  providers: [ClientService, CryptoService],
  exports: [ClientService],
})
export class ClientModule { }
