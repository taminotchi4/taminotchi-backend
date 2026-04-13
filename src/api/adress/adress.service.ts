import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { BaseService } from 'src/infrastructure/base/base-service';
import { ISuccess, successRes } from 'src/infrastructure/response/success.response';
import { AdressEntity } from 'src/core/entity/adress.entity';
import { MarketEntity } from 'src/core/entity/market.entity';
import { CreateAdressDto } from './dto/create-adress.dto';
import { UpdateAdressDto } from './dto/update-adress.dto';

@Injectable()
export class AdressService extends BaseService<CreateAdressDto, UpdateAdressDto, AdressEntity> {
  constructor(
    @InjectRepository(AdressEntity)
    protected readonly adressRepo: Repository<AdressEntity>,
    @InjectRepository(MarketEntity)
    private readonly marketRepo: Repository<MarketEntity>,
  ) {
    super(adressRepo);
  }

  async createAddress(dto: CreateAdressDto, marketId: string): Promise<ISuccess<AdressEntity>> {
    const market = await this.marketRepo.findOne({ where: { id: marketId } as any });
    if (!market) throw new NotFoundException('Market not found');

    const entity = this.adressRepo.create({
      name: dto.name.trim(),
      ...(dto.long !== undefined ? { long: dto.long } : {}),
      ...(dto.lat !== undefined ? { lat: dto.lat } : {}),
      marketId,
    });

    const saved = await this.adressRepo.save(entity);

    // market.adressId ni yangilaymiz
    await this.marketRepo.update(marketId, { adressId: saved.id });

    return successRes(saved, 201);
  }

  async updateAddress(id: string, dto: UpdateAdressDto, marketId: string): Promise<ISuccess<AdressEntity>> {
    const address = await this.adressRepo.findOne({ where: { id, isDeleted: false } as any });
    if (!address) throw new NotFoundException('Address not found');

    if (address.marketId !== marketId) {
      throw new ForbiddenException('You can only update your own address');
    }

    if (dto.name !== undefined) address.name = dto.name.trim();
    if (dto.long !== undefined) address.long = dto.long;
    if (dto.lat !== undefined) address.lat = dto.lat;

    const saved = await this.adressRepo.save(address);
    return successRes(saved);
  }

  async deleteAddress(id: string, marketId: string): Promise<ISuccess<AdressEntity>> {
    const address = await this.adressRepo.findOne({ where: { id, isDeleted: false } as any });
    if (!address) throw new NotFoundException('Address not found');

    if (address.marketId !== marketId) {
      throw new ForbiddenException('You can only delete your own address');
    }

    // market.adressId ni tozalaymiz
    await this.marketRepo.update(marketId, { adressId: null });

    const deleted = await this.adressRepo.remove(address);
    return successRes(deleted);
  }
}
