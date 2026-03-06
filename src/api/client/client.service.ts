import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { randomInt } from 'crypto';
import type { Redis } from 'ioredis';
import { In, Repository } from 'typeorm';

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
import { ElonEntity } from 'src/core/entity/elon.entity';
import { PhotoEntity } from 'src/core/entity/photo.entity';
import { MessageEntity } from 'src/core/entity/message.entity';
import { CommentEntity } from 'src/core/entity/comment.entity';
import { PrivateChatEntity } from 'src/core/entity/private-chat.entity';
import { UserRole } from 'src/common/enum/index.enum';
import { deleteFile, toPublicPath } from 'src/infrastructure/upload/upload.util';

@Injectable()
export class ClientService extends BaseService<CreateClientDto, UpdateClientDto, ClientEntity> {
  constructor(
    @InjectRepository(ClientEntity)
    protected readonly clientRepo: Repository<ClientEntity>,
    @InjectRepository(ElonEntity)
    private readonly elonRepo: Repository<ElonEntity>,
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
    const existsPhone = await this.repo.findOne({ where: { phoneNumber, isDeleted: false } as any });
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
    await this.redis.set(
      `otp:client:verified:${phoneNumber}`,
      '1',
      'EX',
      this.VERIFY_TTL_SEC,
    );

    return successRes({ verified: true });
  }

  async completeRegister(dto: RegisterClientDto): Promise<ISuccess<any>> {
    const phoneNumber = dto.phoneNumber.trim();
    const verifyKey = `otp:client:verified:${phoneNumber}`;
    const ok = await this.redis.get(verifyKey);
    if (!ok) throw new BadRequestException('Phone not verified');

    if (dto.username) {
      const existsUsername = await this.repo.findOne({ where: { username: dto.username, isDeleted: false } as any });
      if (existsUsername) throw new ConflictException('Username already exists');
    }

    const existsPhone = await this.repo.findOne({ where: { phoneNumber, isDeleted: false } as any });
    if (existsPhone) throw new ConflictException('Phone number already exists');

    const entity = this.repo.create({
      ...(dto.fullName ? { fullName: dto.fullName } : {}),
      ...(dto.username ? { username: dto.username.trim() } : {}),
      password: await this.crypto.encrypt(dto.password),
      phoneNumber,
      ...(dto.language ? { language: dto.language } : {}),
    });

    const saved = await this.repo.save(entity);
    await this.redis.del(verifyKey);
    return successRes(this.safe(saved), 201);
  }

  override async update(id: string, dto: UpdateClientDto): Promise<ISuccess<any>> {
    const client = await this.repo.findOne({ where: { id, isDeleted: false } });
    if (!client) throw new NotFoundException('Not found');

    if (dto.username) {
      const username = dto.username.trim();
      const u = await this.repo.findOne({ where: { username, isDeleted: false } });
      if (u && (u).id !== id) throw new ConflictException('Username already exists');
      (client).username = username;
    }

    if (dto.phoneNumber !== undefined) {
      const phone = dto.phoneNumber?.trim() ?? null;
      if (phone) {
        const p = await this.repo.findOne({ where: { phoneNumber: phone, isDeleted: false } });
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

  async myElons(clientId: string): Promise<ISuccess<ElonEntity[]>> {
    const data = await this.elonRepo.find({
      where: { clientId, isDeleted: false } as any,
      relations: {
        photos: true,
        comment: true,
        category: true,
        supCategory: true,
        groups: true,
        client: true,
      } as any,
      order: { createdAt: 'DESC' } as any,
    });
    return successRes(data);
  }

  async updateMe(clientId: string, dto: UpdateClientDto) {
    const client = await this.repo.findOne({ where: { id: clientId, isDeleted: false } });
    if (!client) throw new NotFoundException('Not found');

    if (dto.username !== undefined) {
      const username = dto.username?.trim();
      if (username) {
        const u = await this.repo.findOne({ where: { username, isDeleted: false } });
        if (u && (u).id !== clientId) throw new ConflictException('Username already exists');
        client.username = username;
      }
    }

    if (dto.phoneNumber !== undefined) {
      const phone = dto.phoneNumber?.trim();
      if (!phone) throw new BadRequestException('Phone number cannot be empty');
      const p = await this.repo.findOne({ where: { phoneNumber: phone, isDeleted: false } });
      if (p && (p).id !== clientId) throw new ConflictException('Phone number already exists');
      client.phoneNumber = phone;
    }

    if (dto.password) {
      client.password = await this.crypto.encrypt(dto.password);
    }

    if (dto.fullName !== undefined) client.fullName = dto.fullName;
    if (dto.language !== undefined) client.language = dto.language;

    const saved = await this.repo.save(client);
    return successRes(this.safe(saved));
  }

  async uploadPhoto(clientId: string, file: Express.Multer.File) {
    const client = await this.repo.findOne({ where: { id: clientId, isDeleted: false } });
    if (!client) throw new NotFoundException('Client not found');

    // Eski rasmni o'chirish
    if (client.photoPath) {
      await deleteFile(client.photoPath);
    }

    client.photoPath = toPublicPath('client', file.filename);
    const saved = await this.repo.save(client);

    return successRes(this.safe(saved));
  }

  async deletePhoto(clientId: string) {
    const client = await this.repo.findOne({ where: { id: clientId, isDeleted: false } });
    if (!client) throw new NotFoundException('Client not found');

    if (client.photoPath) {
      await deleteFile(client.photoPath);
      client.photoPath = null;
      await this.repo.save(client);
    }

    return successRes(this.safe(client));
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
    if (user.role === UserRole.CLIENT) {
      if (idFromParam && idFromParam !== user.id) throw new BadRequestException('You can only delete your own account');
      return this.SoftDelete(user.id);
    }

    throw new ForbiddenException('Access denied');
  }

  async SoftDelete(id: string): Promise<ISuccess<{ deleted: true }>> {
    return this.repo.manager.transaction(async (manager) => {
      const now = new Date();

      const client = await manager.findOne(ClientEntity, {
        where: { id, isDeleted: false } as any,
        select: ['id'],
      });
      if (!client) throw new NotFoundException('Client not found');

      // ───── ELONS ─────
      const elons = await manager.find(ElonEntity, {
        where: { clientId: id, isDeleted: false } as any,
        select: ['id', 'commentId'],
      });

      const elonIds = elons.map(e => e.id);
      const elonCommentIds = elons.map(e => e.commentId).filter(Boolean);

      if (elonIds.length) {
        await manager.update(PhotoEntity,
          { elonId: In(elonIds), isDeleted: false },
          { isDeleted: true, deletedAt: now });

        await manager.update(ElonEntity,
          { id: In(elonIds) },
          { isDeleted: true, deletedAt: now });
      }

      // ───── ELON COMMENTS ─────
      if (elonCommentIds.length) {
        await manager.update(MessageEntity,
          { commentId: In(elonCommentIds), isDeleted: false },
          { isDeleted: true, deletedAt: now });

        await manager.update(CommentEntity,
          { id: In(elonCommentIds) },
          { isDeleted: true, deletedAt: now });
      }

      // ───── PRIVATE CHATS ─────
      const chats = await manager.find(PrivateChatEntity, {
        where: { clientId: id, isDeleted: false } as any,
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

      // ───── CLIENT ─────
      await manager.update(ClientEntity,
        { id } as any,
        { isDeleted: true, deletedAt: now });

      return successRes({ deleted: true });
    });
  }
}
