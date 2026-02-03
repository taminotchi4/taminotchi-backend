import { Module } from '@nestjs/common';
import { AdressService } from './adress.service';
import { AdressController } from './adress.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdressEntity } from 'src/core/entity/adress.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AdressEntity])],
  controllers: [AdressController],
  providers: [AdressService],
  exports: [AdressService],
})
export class AdressModule {}
