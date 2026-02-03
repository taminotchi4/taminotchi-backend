import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { BaseService } from 'src/infrastructure/base/base-service';
import { ISuccess, successRes } from 'src/infrastructure/response/success.response';
import { CryptoService } from 'src/infrastructure/crypto/crypto.service';

import { ClientEntity } from 'src/core/entity/client.entity';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { AuthCommonService } from 'src/common/auth/auth-common.service';
import { Response } from 'express';
import { ClientSignInDto } from './dto/client-login.dto';

@Injectable()
export class ClientService extends BaseService<CreateClientDto, UpdateClientDto, ClientEntity> {
  constructor(
    @InjectRepository(ClientEntity)
    protected readonly clientRepo: Repository<ClientEntity>,
    private readonly crypto: CryptoService,
    private readonly authCommon: AuthCommonService
  ) {
    super(clientRepo);
  }

  private safe(c: ClientEntity) {
    const { password, ...rest } = c as any;
    return rest;
  }

  async clientSignIn(dto: ClientSignInDto, res: Response) {
    const { username, password } = dto;

    return this.authCommon.signIn({
      repo: this.clientRepo,
      where: [{ username: username }],
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

  override async create(dto: CreateClientDto): Promise<ISuccess<any>> {
    const username = dto.username.trim();

    const existsUsername = await this.repo.findOne({ where: { username } as any });
    if (existsUsername) throw new ConflictException('Username already exists');

    if (dto.phoneNumber) {
      const phone = dto.phoneNumber.trim();
      const existsPhone = await this.repo.findOne({ where: { phoneNumber: phone } as any });
      if (existsPhone) throw new ConflictException('Phone number already exists');
    }

    const entity = this.repo.create({
      fullName: dto.fullName,
      username,
      password: await this.crypto.encrypt(dto.password),
      phoneNumber: dto.phoneNumber.trim(),
    });

    const saved = await this.repo.save(entity);
    return successRes(this.safe(saved), 201);
  }

  override async update(id: string, dto: UpdateClientDto): Promise<ISuccess<any>> {
    const client = await this.repo.findOne({ where: { id } as any });
    if (!client) throw new NotFoundException('Not found');

    if (dto.username) {
      const username = dto.username.trim();
      const u = await this.repo.findOne({ where: { username } as any });
      if (u && (u as any).id !== id) throw new ConflictException('Username already exists');
      (client as any).username = username;
    }

    if (dto.phoneNumber !== undefined) {
      const phone = dto.phoneNumber?.trim() ?? null;
      if (phone) {
        const p = await this.repo.findOne({ where: { phoneNumber: phone } as any });
        if (p && (p as any).id !== id) throw new ConflictException('Phone number already exists');
      }
      (client as any).phoneNumber = phone;
    }

    if (dto.password) {
      (client as any).password = await this.crypto.encrypt(dto.password);
    }

    if (dto.fullName !== undefined) (client as any).fullName = dto.fullName;

    const saved = await this.repo.save(client as any);
    return successRes(this.safe(saved as any));
  }

  async me(clientId: string) {
    return this.findOneById(clientId);
  }

  async updateMe(clientId: string, dto: UpdateClientDto) {
    const { isActive, role, ...rest } = dto;
    return this.update(clientId, rest);
  }
}
