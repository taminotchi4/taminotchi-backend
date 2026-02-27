import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { randomInt } from 'crypto';
import type { Redis } from 'ioredis';
import { In, Repository } from 'typeorm';

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
import { AdressEntity } from 'src/core/entity/adress.entity';
import { ProductEntity } from 'src/core/entity/product.entity';
import { PhotoEntity } from 'src/core/entity/photo.entity';
import { MessageEntity } from 'src/core/entity/message.entity';
import { CommentEntity } from 'src/core/entity/comment.entity';
import { PrivateChatEntity } from 'src/core/entity/private-chat.entity';
import { UserRole } from 'src/common/enum/index.enum';

@Injectable()
export class MarketService extends BaseService<CreateMarketDto, UpdateMarketDto, MarketEntity> {
  constructor(
    @InjectRepository(MarketEntity)
    protected readonly marketRepo: Repository<MarketEntity>,
    @InjectRepository(AdressEntity)
    private readonly adressRepo: Repository<AdressEntity>,
    @InjectRepository(ProductEntity)
    private readonly productRepo: Repository<ProductEntity>,
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
    const existsPhone = await this.repo.findOne({ where: { phoneNumber, isDeleted: false } as any });
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
    const exists = await this.repo.findOne({ where: { phoneNumber: phone, isDeleted: false } as any });
    return successRes({ exists: Boolean(exists) });
  }

  async checkUsername(username: string) {
    const value = username.trim();
    if (!value) return successRes({ exists: false });
    const exists = await this.repo.findOne({ where: { username: value, isDeleted: false } as any });
    return successRes({ exists: Boolean(exists) });
  }

  private async ensureAdressExists(adressId?: string | null) {
    if (!adressId) return;
    const exists = await this.adressRepo.exist({ where: { id: adressId } });
    if (!exists) throw new NotFoundException('adress not found');
  }

  override async create(dto: CreateMarketDto): Promise<ISuccess<any>> {
    const phoneNumber = dto.phoneNumber.trim();
    await this.ensureAdressExists(dto.adressId);

    const existsPhone = await this.repo.findOne({ where: { phoneNumber, isDeleted: false } as any });
    if (existsPhone) throw new ConflictException('Phone number already exists');

    if (dto.username && dto.username !== undefined) {
      const username = dto.username.trim();
      if (!username) throw new BadRequestException('Username cannot be empty');
      const existsUsername = await this.repo.findOne({ where: { username, isDeleted: false } as any });
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
    await this.ensureAdressExists(dto.adressId);
    const verifyKey = `otp:market:verified:${phoneNumber}`;
    const ok = await this.redis.get(verifyKey);
    if (!ok) throw new BadRequestException('Phone not verified');

    const existsPhone = await this.repo.findOne({ where: { phoneNumber, isDeleted: false } as any });
    if (existsPhone) throw new ConflictException('Phone number already exists');
    if (dto.username !== undefined) {
      const username = dto.username.trim();
      if (!username) throw new BadRequestException('Username cannot be empty');
      const existsUsername = await this.repo.findOne({ where: { username, isDeleted: false } as any });
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
    const market = await this.repo.findOne({ where: { id, isDeleted: false } as any });
    if (!market) throw new NotFoundException('Not found');
    await this.ensureAdressExists(dto.adressId);

    if (dto.name !== undefined) market.name = dto.name;

    if (dto.phoneNumber !== undefined) {
      const phone = dto.phoneNumber.trim();
      const existsPhone = await this.repo.findOne({ where: { phoneNumber: phone, isDeleted: false } as any });
      if (existsPhone && (existsPhone as any).id !== id)
        throw new ConflictException('Phone number already exists');
      market.phoneNumber = phone;
    }
    if (dto.username !== undefined) {
      const username = dto.username?.trim() ?? null;
      if (username) {
        const existsUsername = await this.repo.findOne({ where: { username, isDeleted: false } as any });
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

  async myProducts(marketId: string): Promise<ISuccess<ProductEntity[]>> {
    const data = await this.productRepo.find({
      where: { marketId, isDeleted: false } as any,
      relations: {
        photos: true,
        comment: true,
        category: true,
        supCategory: true,
      } as any,
      order: { createdAt: 'DESC' } as any,
    });
    return successRes(data);
  }

  async updateMe(marketId: string, dto: UpdateMarketDto) {
    const market = await this.repo.findOne({ where: { id: marketId, isDeleted: false } as any });
    if (!market) throw new NotFoundException('Not found');

    if (dto.name !== undefined) market.name = dto.name;

    if (dto.phoneNumber !== undefined) {
      const phone = dto.phoneNumber?.trim();
      if (!phone) throw new BadRequestException('Phone number cannot be empty');
      const existsPhone = await this.repo.findOne({ where: { phoneNumber: phone, isDeleted: false } as any });
      if (existsPhone && (existsPhone as any).id !== marketId)
        throw new ConflictException('Phone number already exists');
      market.phoneNumber = phone;
    }

    if (dto.username !== undefined) {
      const username = dto.username?.trim();
      if (username) {
        const existsUsername = await this.repo.findOne({ where: { username, isDeleted: false } as any });
        if (existsUsername && (existsUsername as any).id !== marketId) {
          throw new ConflictException('Username already exists');
        }
        market.username = username;
      }
    }

    if (dto.password) {
      market.password = await this.crypto.encrypt(dto.password);
    }

    if (dto.photoPath !== undefined) market.photoPath = dto.photoPath ?? null;
    if (dto.adressId !== undefined) {
      await this.ensureAdressExists(dto.adressId);
      market.adressId = dto.adressId ?? null;
    }
    if (dto.language !== undefined) market.language = dto.language;

    const saved = await this.repo.save(market);
    return successRes(this.safe(saved));
  }

  async deleteWithRole(
    idFromParam: string | undefined,
    user: any,
  ): Promise<ISuccess<{ deleted: true }>> {

    // SUPERADMIN boshqa clientni o‘chiradi
    if (user.role === UserRole.SUPERADMIN) {
      if (!idFromParam) throw new BadRequestException('ID required');
      return this.SoftDelete(idFromParam);
    }

    // CLIENT o‘zini o‘chiradi
    if (user.role === UserRole.MARKET) {
      if (idFromParam && idFromParam !== user.id) throw new BadRequestException('You can only delete your own account');
      return this.SoftDelete(user.id);
    }

    throw new ForbiddenException('Access denied');
  }

  async SoftDelete(id: string): Promise<ISuccess<{ deleted: true }>> {
    return this.repo.manager.transaction(async (manager) => {
      const now = new Date();

      const market = await manager.findOne(MarketEntity, {
        where: { id, isDeleted: false } as any,
        select: ['id'],
      });
      if (!market) throw new NotFoundException('Market not found');

      // ───── PRODUCTS ─────
      const products = await manager.find(ProductEntity, {
        where: { marketId: id, isDeleted: false } as any,
        select: ['id', 'commentId'],
      });

      const productIds = products.map(p => p.id);
      const productCommentIds = products
        .map(p => p.commentId)
        .filter(Boolean);

      if (productIds.length) {
        await manager.update(PhotoEntity,
          { productId: In(productIds), isDeleted: false },
          { isDeleted: true, deletedAt: now });

        await manager.update(ProductEntity,
          { id: In(productIds) },
          { isDeleted: true, deletedAt: now });
      }

      // ───── PRODUCT COMMENTS ─────
      if (productCommentIds.length) {
        await manager.update(MessageEntity,
          { commentId: In(productCommentIds), isDeleted: false },
          { isDeleted: true, deletedAt: now });

        await manager.update(CommentEntity,
          { id: In(productCommentIds) },
          { isDeleted: true, deletedAt: now });
      }

      // ───── PRIVATE CHATS ─────
      const chats = await manager.find(PrivateChatEntity, {
        where: { marketId: id, isDeleted: false } as any,
        select: ['id'],
      });

      const chatIds = chats.map(c => c.id);

      if (chatIds.length) {
        await manager.update(MessageEntity,
          { privateChatId: In(chatIds), isDeleted: false },
          { isDeleted: true, deletedAt: now });

        await manager.update(PrivateChatEntity,
          { id: In(chatIds) },
          { isDeleted: true, deletedAt: now });
      }

      // ───── GROUP MEMBERSHIP (pivot cleanup) ─────
      await manager.query(
        `DELETE FROM "group_market" WHERE "marketId" = $1`,
        [id],
      );

      // ───── MARKET ─────
      await manager.update(MarketEntity,
        { id } as any,
        { isDeleted: true, deletedAt: now });

      return successRes({ deleted: true });
    });
  }
}
