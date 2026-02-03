import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { BaseService } from 'src/infrastructure/base/base-service';
import { ISuccess, successRes } from 'src/infrastructure/response/success.response';
import { AdressEntity } from 'src/core/entity/adress.entity';
import { CreateAdressDto } from './dto/create-adress.dto';
import { UpdateAdressDto } from './dto/update-adress.dto';

@Injectable()
export class AdressService extends BaseService<CreateAdressDto, UpdateAdressDto, AdressEntity> {
  constructor(
    @InjectRepository(AdressEntity)
    protected readonly adressRepo: Repository<AdressEntity>,
  ) {
    super(adressRepo);
  }

  override async create(dto: CreateAdressDto): Promise<ISuccess<AdressEntity>> {
    const entity = this.repo.create({
      name: dto.name.trim(),
      ...(dto.long !== undefined ? { long: dto.long } : {}),
      ...(dto.lat !== undefined ? { lat: dto.lat } : {}),
    });

    const saved = await this.repo.save(entity);
    return successRes(saved, 201);
  }

  override async update(id: string, dto: UpdateAdressDto): Promise<ISuccess<AdressEntity>> {
    const address = await this.repo.findOne({ where: { id } as any });
    if (!address) throw new NotFoundException('Not found');

    if (dto.name !== undefined) address.name = dto.name.trim();
    if (dto.long !== undefined) address.long = dto.long;
    if (dto.lat !== undefined) address.lat = dto.lat;

    const saved = await this.repo.save(address);
    return successRes(saved);
  }
}
