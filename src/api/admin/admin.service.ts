import {
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleInit,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AdminEntity } from 'src/core/entity/admin.entity';
import { ClientEntity } from 'src/core/entity/client.entity';
import { MarketEntity } from 'src/core/entity/market.entity';
import { CategoryEntity } from 'src/core/entity/category.entity';
import { GroupEntity } from 'src/core/entity/group.entity';
import { ElonEntity } from 'src/core/entity/elon.entity';
import { ProductEntity } from 'src/core/entity/product.entity';
import { MessageEntity } from 'src/core/entity/message.entity';

import { AdminStatsResponseDto } from '../../common/dto/admin-stats.response';

import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { AdminLoginDto } from './dto/admin-login.dto';

import { CryptoService } from 'src/infrastructure/crypto/crypto.service';
import { BaseService } from 'src/infrastructure/base/base-service';
import { successRes } from 'src/infrastructure/response/success.response';
import { UserRole } from 'src/common/enum/index.enum';

import { config } from 'src/config';
import { AuthCommonService } from 'src/common/auth/auth-common.service';
import { Response } from 'express';

@Injectable()
export class AdminService
  extends BaseService<CreateAdminDto, UpdateAdminDto, AdminEntity>
  implements OnModuleInit {
  constructor(
    @InjectRepository(AdminEntity) private readonly adminRepo: Repository<AdminEntity>,
    @InjectRepository(ClientEntity) private readonly clientRepo: Repository<ClientEntity>,
    @InjectRepository(MarketEntity) private readonly marketRepo: Repository<MarketEntity>,
    @InjectRepository(CategoryEntity) private readonly categoryRepo: Repository<CategoryEntity>,
    @InjectRepository(GroupEntity) private readonly groupRepo: Repository<GroupEntity>,
    @InjectRepository(ElonEntity) private readonly elonRepo: Repository<ElonEntity>,
    @InjectRepository(ProductEntity) private readonly productRepo: Repository<ProductEntity>,
    @InjectRepository(MessageEntity) private readonly messageRepo: Repository<MessageEntity>,
    private readonly crypto: CryptoService,
    private readonly authCommon: AuthCommonService
  ) {
    super(adminRepo);
  }

  async onModuleInit() {
    const existsSuperAdmin = await this.adminRepo.findOne({
      where: { role: UserRole.SUPERADMIN },
    });

    if (!existsSuperAdmin) {
      const hashPassword = await this.crypto.encrypt(
        config.SUPERADMIN.SUPERADMIN_PASSWORD,
      );

      const superAdmin = this.adminRepo.create({
        username: config.SUPERADMIN.SUPERADMIN_USERNAME,
        phoneNumber: config.SUPERADMIN.SUPERADMIN_PHONE_NUMBER,
        email: config.SUPERADMIN.SUPERADMIN_EMAIL,
        password: hashPassword,
        role: UserRole.SUPERADMIN,
        isActive: true,
      });

      await this.adminRepo.save(superAdmin);
    }
  }

  async adminSignIn(dto: AdminLoginDto, res: Response) {
    const { username, password } = dto;

    return this.authCommon.signIn({
      repo: this.adminRepo,
      where: { username },
      password,
      res,
      safeUser: (a) => ({
        id: a.id,
        username: a.username,
        phoneNumber: a.phoneNumber,
        role: a.role,
        email: a.email,
        isActive: a.isActive,
        createdAt: a.createdAt,
      }),
      extraData: (a) => ({
        username: a.username,
      }),
    });
  }

  async createAdmin(dto: CreateAdminDto) {
    const { phoneNumber, username, password, email } = dto;

    const existsUsername = await this.adminRepo.findOne({ where: { username } });
    if (existsUsername) throw new ConflictException('Username already exists!');

    const existsPhoneNumber = await this.adminRepo.findOne({ where: { phoneNumber } });
    if (existsPhoneNumber) throw new ConflictException('Phone number already exists');

    const existsEmail = await this.adminRepo.findOne({ where: { email } });
    if (existsEmail) throw new ConflictException('Email already exists!');

    const hashPassword = await this.crypto.encrypt(password);

    const admin = this.adminRepo.create({
      username,
      phoneNumber,
      email,
      role: UserRole.ADMIN,
      password: hashPassword,
      isActive: true,
    });

    await this.adminRepo.save(admin);

    const safeAdmin = {
      id: admin.id,
      username: admin.username,
      phoneNumber: admin.phoneNumber,
      email: admin.email,
      role: admin.role,
      isActive: admin.isActive,
      createdAt: admin.createdAt,
      updatedAt: admin.updatedAt,
    };

    return successRes(safeAdmin, 201);
  }

  async findAllAdmins() {
    const admins = await this.adminRepo.find({
      select: ['id', 'username', 'phoneNumber', 'email', 'role', 'isActive', 'createdAt', 'updatedAt'],
      order: { createdAt: 'DESC' },
    });

    return successRes(admins, 200);
  }

  async findOneAdmin(id: string) {
    const admin = await this.adminRepo.findOne({
      where: { id },
      select: ['id', 'username', 'phoneNumber', 'email', 'role', 'isActive', 'createdAt', 'updatedAt'],
    });

    if (!admin) throw new NotFoundException('Admin not found');
    return successRes(admin, 200);
  }

  async updateAdmin(id: string, dto: UpdateAdminDto) {
    const admin = await this.adminRepo.findOne({ where: { id } });
    if (!admin) throw new NotFoundException('Admin not found');

    if (dto.username && dto.username !== admin.username) {
      const existsUsername = await this.adminRepo.findOne({ where: { username: dto.username } });
      if (existsUsername) throw new ConflictException('Username already exists!');
      admin.username = dto.username;
    }

    if (dto.phoneNumber && dto.phoneNumber !== admin.phoneNumber) {
      const existsPhoneNumber = await this.adminRepo.findOne({ where: { phoneNumber: dto.phoneNumber } });
      if (existsPhoneNumber) throw new ConflictException('Phone number already exists');
      admin.phoneNumber = dto.phoneNumber;
    }

    if (dto.email && dto.email !== admin.email) {
      const existsEmail = await this.adminRepo.findOne({ where: { email: dto.email } });
      if (existsEmail) throw new ConflictException('Email already exists!');
      admin.email = dto.email;
    }
    if (dto.role) admin.role = dto.role;
    if (dto.isActive !== undefined) admin.isActive = dto.isActive;

    if (dto.password) {
      admin.password = await this.crypto.encrypt(dto.password);
    }

    await this.adminRepo.save(admin);

    const safeAdmin = {
      id: admin.id,
      username: admin.username,
      phoneNumber: admin.phoneNumber,
      email: admin.email,
      role: admin.role,
      isActive: admin.isActive,
      createdAt: admin.createdAt,
      updatedAt: admin.updatedAt,
    };

    return successRes(safeAdmin, 200);
  }

  async deleteAdmin(id: string) {
    const admin = await this.adminRepo.findOne({ where: { id } });
    if (!admin) throw new NotFoundException('Admin not found');

    if (admin.role === UserRole.SUPERADMIN) {
      throw new ForbiddenException('Super adminni o‘chirib bo‘lmaydi');
    }

    await this.adminRepo.remove(admin);
    return successRes({ deleted: true }, 200);
  }

  private lastNDays(n: number) {
    const days: string[] = [];
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      days.push(d.toISOString().slice(0, 10)); // YYYY-MM-DD
    }
    return days;
  }

  private async countByDay(repo: Repository<any>, days: string[]) {
    // Postgres: date_trunc('day', "createdAt")
    const rows = await repo
      .createQueryBuilder('t')
      .select(`to_char(date_trunc('day', t."createdAt"), 'YYYY-MM-DD')`, 'day')
      .addSelect('COUNT(*)', 'count')
      .where(`t."createdAt" >= NOW() - INTERVAL '7 days'`)
      .groupBy('day')
      .orderBy('day', 'ASC')
      .getRawMany<{ day: string; count: string }>();

    const map = new Map(rows.map((r) => [r.day, Number(r.count)]));

    return days.map((d) => ({
      day: d,
      count: map.get(d) ?? 0,
    }));
  }

  async getDashboardStats(): Promise<AdminStatsResponseDto> {
    const days = this.lastNDays(7);

    const [
      adminsTotal,
      clientsTotal,
      marketsTotal,
      categoriesTotal,
      groupsTotal,
      elonsTotal,
      productsTotal,
      marketsActive,
      productsActive,
    ] = await Promise.all([
      this.adminRepo.count(),
      this.clientRepo.count(),
      this.marketRepo.count(),
      this.categoryRepo.count(),
      this.groupRepo.count(),
      this.elonRepo.count(),
      this.productRepo.count(),
      this.marketRepo.count({ where: { isActive: true } }),
      this.productRepo.count({ where: { isActive: true } }),
    ]);

    let elonStatus: AdminStatsResponseDto['elonStatus'] | undefined;
    try {
      const [negotiation, agreed] = await Promise.all([
        this.elonRepo.count({ where: { status: 'negotiation' as any } }),
        this.elonRepo.count({ where: { status: 'agreed' as any } }),
      ]);
      elonStatus = { negotiation, agreed };
    } catch {
      elonStatus = undefined;
    }

    const [elonsLast7Days, productsLast7Days, messagesLast7Days] =
      await Promise.all([
        this.countByDay(this.elonRepo, days),
        this.countByDay(this.productRepo, days),
        this.countByDay(this.messageRepo, days),
      ]);

    return {
      admins: { total: adminsTotal },
      clients: { total: clientsTotal },
      markets: { total: marketsTotal, active: marketsActive },
      categories: { total: categoriesTotal },
      groups: { total: groupsTotal },
      elons: { total: elonsTotal },
      products: { total: productsTotal, active: productsActive },

      elonStatus,
      elonsLast7Days,
      productsLast7Days,
      messagesLast7Days,
    };
  }


}
