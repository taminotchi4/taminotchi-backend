import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { BaseService } from 'src/infrastructure/base/base-service';
import { ISuccess, successRes } from 'src/infrastructure/response/success.response';
import { CryptoService } from 'src/infrastructure/crypto/crypto.service';
import { AuthCommonService } from 'src/common/auth/auth-common.service';

import { MarketEntity } from 'src/core/entity/market.entity';
import { CreateMarketDto } from './dto/create-market.dto';
import { UpdateMarketDto } from './dto/update-market.dto';
import { Response } from 'express';
import { MarketLoginDto } from './dto/market-login.dto';

@Injectable()
export class MarketService extends BaseService<CreateMarketDto, UpdateMarketDto, MarketEntity> {
  constructor(
    @InjectRepository(MarketEntity)
    protected readonly marketRepo: Repository<MarketEntity>,
    private readonly crypto: CryptoService,
    private readonly authCommon: AuthCommonService,
  ) {
    super(marketRepo);
  }

  private safe(m: MarketEntity) {
    const { password, ...rest } = m as any;
    return rest;
  }

  async marketSignIn(dto: MarketLoginDto, res: Response) {
    const { phoneNumber, password } = dto;

    return this.authCommon.signIn({
      repo: this.marketRepo,
      where: { phoneNumber },
      password,
      res,
      safeUser: (m) => ({
        id: m.id,
        name: m.name,
        phoneNumber: m.phoneNumber,
        photoPath: m.photoPath ?? null,
        role: m.role,
        isActive: m.isActive,
        createdAt: m.createdAt,
      }),
    });
  }

  override async create(dto: CreateMarketDto): Promise<ISuccess<any>> {
    const name = dto.name.trim();
    const phoneNumber = dto.phoneNumber.trim();

    const existsPhone = await this.repo.findOne({ where: { phoneNumber } as any });
    if (existsPhone) throw new ConflictException('Phone number already exists');

    const entity = this.repo.create({
      name,
      phoneNumber,
      password: await this.crypto.encrypt(dto.password),
      adressId: dto.adressId ?? null,
      languageId: dto.languageId ?? null,
      photoPath: dto.photoPath ?? null,
    });

    const saved = await this.repo.save(entity);
    return successRes(this.safe(saved), 201);
  }

  override async update(id: string, dto: UpdateMarketDto): Promise<ISuccess<any>> {
    const market = await this.repo.findOne({ where: { id } as any });
    if (!market) throw new NotFoundException('Not found');

    if (dto.name !== undefined) market.name = dto.name;

    if (dto.phoneNumber !== undefined) {
      const phone = dto.phoneNumber.trim();
      const existsPhone = await this.repo.findOne({ where: { phoneNumber: phone } as any });
      if (existsPhone && (existsPhone as any).id !== id)
        throw new ConflictException('Phone number already exists');
      market.phoneNumber = phone;
    }

    if (dto.password) {
      market.password = await this.crypto.encrypt(dto.password);
    }

    if (dto.photoPath !== undefined) market.photoPath = dto.photoPath ?? null;
    if (dto.adressId !== undefined) market.adressId = dto.adressId ?? null;
    if (dto.languageId !== undefined) market.languageId = dto.languageId ?? null;
    if (dto.isActive !== undefined) market.isActive = dto.isActive;

    const saved = await this.repo.save(market);
    return successRes(this.safe(saved));
  }

  async me(marketId: string) {
    return this.findOneById(marketId);
  }

  async updateMe(marketId: string, dto: UpdateMarketDto) {
    const { isActive, ...rest } = dto;
    return this.update(marketId, rest);
  }
}
