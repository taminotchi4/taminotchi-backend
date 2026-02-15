import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { randomInt } from 'crypto';
import type { Redis } from 'ioredis';
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
import { RequestMarketOtpDto } from './dto/request-otp.dto';
import { VerifyMarketOtpDto } from './dto/verify-otp.dto';
import { RegisterMarketDto } from './dto/register-market.dto';

@Injectable()
export class MarketService extends BaseService<CreateMarketDto, UpdateMarketDto, MarketEntity> {
  constructor(
    @InjectRepository(MarketEntity)
    protected readonly marketRepo: Repository<MarketEntity>,
    private readonly crypto: CryptoService,
    private readonly authCommon: AuthCommonService,
    @InjectRedis() private readonly redis: Redis,
  ) {
    super(marketRepo);
  }

  private readonly OTP_TTL_SEC = 300;
  private readonly VERIFY_TTL_SEC = 600;
  private readonly OTP_MAX_ATTEMPTS = 5;

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
        username: m.username,
        phoneNumber: m.phoneNumber,
        photoPath: m.photoPath ?? null,
        role: m.role,
        isActive: m.isActive,
        createdAt: m.createdAt,
      }),
    });
  }

  async requestRegisterOtp(dto: RequestMarketOtpDto) {
    const phoneNumber = dto.phoneNumber.trim();
    const existsPhone = await this.repo.findOne({ where: { phoneNumber } as any });
    if (existsPhone) throw new ConflictException('Phone number already exists');

    const code = String(randomInt(100000, 1000000));
    const hash = await this.crypto.encrypt(code);

    await this.redis.set(
      `otp:market:${phoneNumber}`,
      JSON.stringify({ hash, attempts: 0 }),
      'EX',
      this.OTP_TTL_SEC,
    );

    return successRes({ otpCode: code });
  }

  async checkPhone(phoneNumber: string) {
    const phone = phoneNumber.trim();
    const exists = await this.repo.findOne({ where: { phoneNumber: phone } as any });
    return successRes({ exists: Boolean(exists) });
  }

  async checkUsername(username: string) {
    const value = username.trim();
    if (!value) return successRes({ exists: false });
    const exists = await this.repo.findOne({ where: { username: value } as any });
    return successRes({ exists: Boolean(exists) });
  }

  override async create(dto: CreateMarketDto): Promise<ISuccess<any>> {
    const phoneNumber = dto.phoneNumber.trim();

    const existsPhone = await this.repo.findOne({ where: { phoneNumber } as any });
    if (existsPhone) throw new ConflictException('Phone number already exists');

    if (dto.username && dto.username !== undefined) {
      const username = dto.username.trim();
      if (!username) throw new BadRequestException('Username cannot be empty');
      const existsUsername = await this.repo.findOne({ where: { username } as any });
      if (existsUsername) throw new ConflictException('Username already exists');
    }

    const entity = this.repo.create({
      ...(dto.name ? { name: dto.name.trim() } : {}),
      phoneNumber,
      ...(dto.username && dto.username !== undefined ? { username: dto.username.trim() } : {}),
      password: await this.crypto.encrypt(dto.password),
      adressId: dto.adressId ?? null,
      ...(dto.language ? { language: dto.language } : {}),
      photoPath: dto.photoPath ?? null,
    });

    const saved = await this.repo.save(entity);
    return successRes(this.safe(saved), 201);
  }

  async verifyRegisterOtp(dto: VerifyMarketOtpDto) {
    const phoneNumber = dto.phoneNumber.trim();
    const key = `otp:market:${phoneNumber}`;
    const raw = await this.redis.get(key);
    if (!raw) throw new BadRequestException('OTP expired');

    const data = JSON.parse(raw) as { hash: string; attempts: number };
    if (data.attempts >= this.OTP_MAX_ATTEMPTS) {
      throw new BadRequestException('OTP attempts exceeded');
    }

    const ok = await this.crypto.decrypt(dto.code, data.hash);
    if (!ok) {
      const ttl = await this.redis.ttl(key);
      const next = { hash: data.hash, attempts: data.attempts + 1 };
      if (ttl > 0) {
        await this.redis.set(key, JSON.stringify(next), 'EX', ttl);
      } else {
        await this.redis.set(key, JSON.stringify(next), 'EX', this.OTP_TTL_SEC);
      }
      throw new BadRequestException('OTP is incorrect');
    }

    await this.redis.del(key);
    await this.redis.set(
      `otp:market:verified:${phoneNumber}`,
      '1',
      'EX',
      this.VERIFY_TTL_SEC,
    );

    return successRes({ verified: true });
  }

  async completeRegister(dto: RegisterMarketDto): Promise<ISuccess<any>> {
    const phoneNumber = dto.phoneNumber.trim();
    const verifyKey = `otp:market:verified:${phoneNumber}`;
    const ok = await this.redis.get(verifyKey);
    if (!ok) throw new BadRequestException('Phone not verified');

    const existsPhone = await this.repo.findOne({ where: { phoneNumber } as any });
    if (existsPhone) throw new ConflictException('Phone number already exists');
    if (dto.username !== undefined) {
      const username = dto.username.trim();
      if (!username) throw new BadRequestException('Username cannot be empty');
      const existsUsername = await this.repo.findOne({ where: { username } as any });
      if (existsUsername) throw new ConflictException('Username already exists');
    }

    const entity = this.repo.create({
      ...(dto.name ? { name: dto.name.trim() } : {}),
      ...(dto.username !== undefined ? { username: dto.username.trim() } : {}),
      phoneNumber,
      password: await this.crypto.encrypt(dto.password),
      adressId: dto.adressId ?? null,
      ...(dto.language ? { language: dto.language } : {}),
      photoPath: dto.photoPath ?? null,
    });

    const saved = await this.repo.save(entity);
    await this.redis.del(verifyKey);
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
    if (dto.username !== undefined) {
      const username = dto.username?.trim() ?? null;
      if (username) {
        const existsUsername = await this.repo.findOne({ where: { username } as any });
        if (existsUsername && (existsUsername as any).id !== id) {
          throw new ConflictException('Username already exists');
        }
      }
      market.username = username;
    }

    if (dto.password) {
      market.password = await this.crypto.encrypt(dto.password);
    }

    if (dto.photoPath !== undefined) market.photoPath = dto.photoPath ?? null;
    if (dto.adressId !== undefined) market.adressId = dto.adressId ?? null;
    if (dto.language !== undefined) market.language = dto.language;
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
