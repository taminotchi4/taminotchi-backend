import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { randomInt, randomUUID } from 'crypto';
import type { Redis } from 'ioredis';
import { Repository } from 'typeorm';

import { BaseService } from 'src/infrastructure/base/base-service';
import { ISuccess, successRes } from 'src/infrastructure/response/success.response';
import { CryptoService } from 'src/infrastructure/crypto/crypto.service';

import { ClientEntity } from 'src/core/entity/client.entity';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { AuthCommonService } from 'src/common/auth/auth-common.service';
import { Response } from 'express';
import { ClientLoginDto } from './dto/client-login.dto';
import { RequestClientOtpDto } from './dto/request-otp.dto';
import { VerifyClientOtpDto } from './dto/verify-otp.dto';
import { RegisterClientDto } from './dto/register-client.dto';

@Injectable()
export class ClientService extends BaseService<CreateClientDto, UpdateClientDto, ClientEntity> {
  constructor(
    @InjectRepository(ClientEntity)
    protected readonly clientRepo: Repository<ClientEntity>,
    private readonly crypto: CryptoService,
    private readonly authCommon: AuthCommonService,
    @InjectRedis() private readonly redis: Redis,
  ) {
    super(clientRepo);
  }

  private readonly OTP_TTL_SEC = 300;
  private readonly VERIFY_TTL_SEC = 600;
  private readonly OTP_MAX_ATTEMPTS = 5;

  private safe(c: ClientEntity) {
    const { password, ...rest } = c;
    return rest;
  }

  async clientSignIn(dto: ClientLoginDto, res: Response) {
    const { phoneNumber, password } = dto;

    return this.authCommon.signIn({
      repo: this.clientRepo,
      where: [{ phoneNumber }],
      password,
      res,
      safeUser: (c) => ({
        id: c.id,
        fullName: c.fullName,
        username: c.username,
        phoneNumber: c.phoneNumber,
        photoPath: c.photoPath ?? null,
        role: c.role,
        isActive: c.isActive,
        createdAt: c.createdAt,
      }),
      extraData: (c) => ({
        username: c.username,
        phoneNumber: c.phoneNumber,
      }),
    });
  }

  async requestRegisterOtp(dto: RequestClientOtpDto) {
    const phoneNumber = dto.phoneNumber.trim();
    const existsPhone = await this.repo.findOne({ where: { phoneNumber } as any });
    if (existsPhone) throw new ConflictException('Phone number already exists');

    const code = String(randomInt(100000, 1000000));
    const hash = await this.crypto.encrypt(code);

    await this.redis.set(
      `otp:client:${phoneNumber}`,
      JSON.stringify({ hash, attempts: 0 }),
      'EX',
      this.OTP_TTL_SEC,
    );

    return successRes({ otpCode: code });
  }

  async verifyRegisterOtp(dto: VerifyClientOtpDto) {
    const phoneNumber = dto.phoneNumber.trim();
    const key = `otp:client:${phoneNumber}`;
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
    const verifyToken = randomUUID();
    await this.redis.set(
      `otp:client:verified:${phoneNumber}:${verifyToken}`,
      '1',
      'EX',
      this.VERIFY_TTL_SEC,
    );

    return successRes({ verifyToken });
  }

  async completeRegister(dto: RegisterClientDto): Promise<ISuccess<any>> {
    const phoneNumber = dto.phoneNumber.trim();
    const verifyKey = `otp:client:verified:${phoneNumber}:${dto.verifyToken}`;
    const ok = await this.redis.get(verifyKey);
    if (!ok) throw new BadRequestException('Phone not verified');

    const existsUsername = await this.repo.findOne({ where: { username: dto.username } as any });
    if (existsUsername) throw new ConflictException('Username already exists');

    const existsPhone = await this.repo.findOne({ where: { phoneNumber } as any });
    if (existsPhone) throw new ConflictException('Phone number already exists');

    const entity = this.repo.create({
      fullName: dto.fullName,
      username: dto.username.trim(),
      password: await this.crypto.encrypt(dto.password),
      phoneNumber,
      ...(dto.language ? { language: dto.language } : {}),
    });

    const saved = await this.repo.save(entity);
    await this.redis.del(verifyKey);
    return successRes(this.safe(saved), 201);
  }

  override async update(id: string, dto: UpdateClientDto): Promise<ISuccess<any>> {
    const client = await this.repo.findOne({ where: { id } });
    if (!client) throw new NotFoundException('Not found');

    if (dto.username) {
      const username = dto.username.trim();
      const u = await this.repo.findOne({ where: { username } });
      if (u && (u).id !== id) throw new ConflictException('Username already exists');
      (client).username = username;
    }

    if (dto.phoneNumber !== undefined) {
      const phone = dto.phoneNumber?.trim() ?? null;
      if (phone) {
        const p = await this.repo.findOne({ where: { phoneNumber: phone } });
        if (p && (p).id !== id) throw new ConflictException('Phone number already exists');
      }
      (client).phoneNumber = phone;
    }

    if (dto.password) {
      (client).password = await this.crypto.encrypt(dto.password);
    }

    if (dto.fullName !== undefined) (client).fullName = dto.fullName;
    if (dto.language !== undefined) (client).language = dto.language;

    const saved = await this.repo.save(client);
    return successRes(this.safe(saved));
  }

  async me(clientId: string) {
    return this.findOneById(clientId);
  }

  async updateMe(clientId: string, dto: UpdateClientDto) {
    const { isActive, role, ...rest } = dto;
    return this.update(clientId, rest);
  }
}
