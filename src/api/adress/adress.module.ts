import { Module } from '@nestjs/common';
import { AdressService } from './adress.service';
import { AdressController } from './adress.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdressEntity } from 'src/core/entity/adress.entity';
import { MarketEntity } from 'src/core/entity/market.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AdressEntity, MarketEntity])],
  controllers: [AdressController],
  providers: [AdressService],
  exports: [AdressService],
})
export class AdressModule { }
