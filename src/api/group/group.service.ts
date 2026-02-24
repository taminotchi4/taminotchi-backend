import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { GroupEntity } from 'src/core/entity/group.entity';
import { MarketEntity } from 'src/core/entity/market.entity';
import { SupCategoryEntity } from 'src/core/entity/sup-category.entity';

import { BaseService } from 'src/infrastructure/base/base-service';
import { successRes } from 'src/infrastructure/response/success.response';

import { UserRole } from 'src/common/enum/index.enum';

import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';

@Injectable()
export class GroupService extends BaseService<CreateGroupDto, UpdateGroupDto, GroupEntity> {
  constructor(
    @InjectRepository(GroupEntity)
    private readonly groupRepo: Repository<GroupEntity>,

    @InjectRepository(MarketEntity)
    private readonly marketRepo: Repository<MarketEntity>,

    @InjectRepository(SupCategoryEntity)
    private readonly supCategoryRepo: Repository<SupCategoryEntity>,
  ) {
    super(groupRepo);
  }

  // ──────────────────────────────────────────────
  // Lang bo'yicha name fieldini qo'shamiz
  // ──────────────────────────────────────────────
  private withName<T extends { nameUz?: string | null; nameRu?: string | null }>(
    item: T,
    lang?: 'uz' | 'ru',
  ) {
    const name = lang === 'ru' ? (item.nameRu || item.nameUz || '') : (item.nameUz || '');
    return { ...item, name };
  }

  // ──────────────────────────────────────────────
  // Guruhlar ro'yxati + membersCount
  // ──────────────────────────────────────────────
  async findAllGroups(lang?: 'uz' | 'ru') {
    const groups = await this.groupRepo
      .createQueryBuilder('g')
      .leftJoinAndSelect('g.supCategory', 'sc')
      .leftJoinAndSelect('g.category', 'cat')
      .loadRelationCountAndMap('g.membersCount', 'g.markets')
      .orderBy('g.createdAt', 'DESC')
      .getMany();
    return successRes(groups.map((g) => this.withName(g, lang)));
  }

  // ──────────────────────────────────────────────
  // CategoryId bo'yicha guruhlar:
  //   1) Guruhning o'z categoryId = berilgan id
  //   2) Guruhning supCategory.categoryId = berilgan id
  // ──────────────────────────────────────────────
  async findByCategoryId(categoryId: string, lang?: 'uz' | 'ru') {
    const groups = await this.groupRepo
      .createQueryBuilder('g')
      .leftJoinAndSelect('g.supCategory', 'sc')
      .leftJoinAndSelect('g.category', 'cat')
      .loadRelationCountAndMap('g.membersCount', 'g.markets')
      .where('g.categoryId = :categoryId', { categoryId })
      .orWhere('sc.categoryId = :categoryId', { categoryId })
      .orderBy('g.createdAt', 'DESC')
      .getMany();
    return successRes(groups.map((g) => this.withName(g, lang)));
  }

  // ──────────────────────────────────────────────
  // Bitta guruh + membersCount
  // ──────────────────────────────────────────────
  async findOneGroup(id: string, lang?: 'uz' | 'ru') {
    const group = await this.groupRepo
      .createQueryBuilder('g')
      .leftJoinAndSelect('g.supCategory', 'sc')
      .leftJoinAndSelect('g.category', 'cat')
      .loadRelationCountAndMap('g.membersCount', 'g.markets')
      .where('g.id = :id', { id })
      .getOne();

    if (!group) throw new NotFoundException('Group not found');
    return successRes(this.withName(group, lang));
  }

  // ──────────────────────────────────────────────
  // Guruh a'zolari (marketlar) ro'yxati
  // ──────────────────────────────────────────────
  async getGroupMembers(id: string) {
    const group = await this.groupRepo.findOne({
      where: { id },
      relations: { markets: true },
    });
    if (!group) throw new NotFoundException('Group not found');

    // password ni chiqarmaymiz
    const members = group.markets.map(({ password, ...rest }: any) => rest);
    return successRes(members);
  }

  // ──────────────────────────────────────────────
  // Guruhni yangilash (har qanday admin)
  // ──────────────────────────────────────────────
  async updateGroup(
    id: string,
    dto: UpdateGroupDto,
    requesterId: string,
    requesterRole: UserRole,
    profilePhoto?: string | null,
  ) {
    const group = await this.groupRepo.findOne({ where: { id } });
    if (!group) throw new NotFoundException('Group not found');

    // Faqat Admin/Superadmin yangilay oladi
    if (requesterRole === UserRole.MARKET) {
      throw new ForbiddenException('Only admins can update groups');
    }

    if (dto.supCategoryId !== undefined) {
      await this.validateSupCategory(dto.supCategoryId);
    }

    if (dto.nameUz !== undefined) {
      group.nameUz = dto.nameUz.trim();
      group.name = group.nameUz;   // name = nameUz (backward compat)
    }
    if (dto.nameRu !== undefined) group.nameRu = dto.nameRu ?? null;
    if (dto.description !== undefined) group.description = dto.description ?? null;
    if (dto.supCategoryId !== undefined) group.supCategoryId = dto.supCategoryId ?? null;
    if (profilePhoto !== undefined) group.profilePhoto = profilePhoto ?? null;

    const saved = await this.groupRepo.save(group);
    return successRes(saved);
  }

  // ──────────────────────────────────────────────
  // Guruhni o'chirish (faqat admin)
  // ──────────────────────────────────────────────
  async deleteGroup(id: string, requesterId: string, requesterRole: UserRole) {
    const group = await this.groupRepo.findOne({ where: { id } });
    if (!group) throw new NotFoundException('Group not found');

    if (requesterRole === UserRole.MARKET) {
      throw new ForbiddenException('Only admins can delete groups');
    }

    await this.groupRepo.delete(id);
    return successRes({ deleted: true });
  }

  // ──────────────────────────────────────────────
  // Market guruhga qo'shilish (join)
  // ──────────────────────────────────────────────
  async joinGroup(groupId: string, marketId: string) {
    const group = await this.groupRepo.findOne({
      where: { id: groupId },
      relations: { markets: true },
    });
    if (!group) throw new NotFoundException('Group not found');

    const market = await this.marketRepo.findOne({ where: { id: marketId } });
    if (!market) throw new NotFoundException('Market not found');

    const alreadyMember = group.markets.some((m) => m.id === marketId);
    if (alreadyMember) throw new ConflictException('Already a member of this group');

    group.markets.push(market);
    await this.groupRepo.save(group);

    return successRes({ joined: true });
  }

  // ──────────────────────────────────────────────
  // Market guruhdan chiqish (leave)
  // ──────────────────────────────────────────────
  async leaveGroup(groupId: string, marketId: string) {
    const group = await this.groupRepo.findOne({
      where: { id: groupId },
      relations: { markets: true },
    });
    if (!group) throw new NotFoundException('Group not found');

    const isMember = group.markets.some((m) => m.id === marketId);
    if (!isMember) throw new BadRequestException('You are not a member of this group');

    group.markets = group.markets.filter((m) => m.id !== marketId);
    await this.groupRepo.save(group);

    return successRes({ left: true });
  }

  // ──────────────────────────────────────────────
  // Market qo'shilgan guruhlar ro'yxati
  // ──────────────────────────────────────────────
  async getMyGroups(marketId: string, lang?: 'uz' | 'ru') {
    const market = await this.marketRepo.findOne({
      where: { id: marketId },
      relations: { groups: { supCategory: true, category: true } },
    });
    if (!market) throw new NotFoundException('Market not found');
    return successRes(market.groups.map((g) => this.withName(g, lang)));
  }

  // ──────────────────────────────────────────────
  // Guruhdan a'zoni chiqarish (kick)
  // Faqat ADMIN/SUPERADMIN
  // ──────────────────────────────────────────────
  async kickMember(
    groupId: string,
    targetMarketId: string,
    requesterId: string,
    requesterRole: UserRole,
  ) {
    const isAdmin = requesterRole === UserRole.SUPERADMIN || requesterRole === UserRole.ADMIN;
    if (!isAdmin) {
      throw new ForbiddenException('Only admins can kick members');
    }

    const group = await this.groupRepo.findOne({
      where: { id: groupId },
      relations: { markets: true },
    });
    if (!group) throw new NotFoundException('Group not found');

    const isMember = group.markets.some((m) => m.id === targetMarketId);
    if (!isMember) throw new BadRequestException('Target is not a member of this group');

    group.markets = group.markets.filter((m) => m.id !== targetMarketId);
    await this.groupRepo.save(group);

    return successRes({ kicked: true });
  }

  // ──────────────────────────────────────────────
  // Private: supCategory mavjudligini tekshirish
  // ──────────────────────────────────────────────
  private async validateSupCategory(supCategoryId?: string | null) {
    if (!supCategoryId) return;
    const exists = await this.supCategoryRepo.exist({ where: { id: supCategoryId } });
    if (!exists) throw new NotFoundException('SupCategory not found');
  }
}
