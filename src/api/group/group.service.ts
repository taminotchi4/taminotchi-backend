import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { In, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

import { GroupEntity } from 'src/core/entity/group.entity';
import { MarketEntity } from 'src/core/entity/market.entity';
import { SupCategoryEntity } from 'src/core/entity/sup-category.entity';
import { CategoryEntity } from 'src/core/entity/category.entity';

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

    @InjectRepository(CategoryEntity)
    private readonly categoryRepo: Repository<CategoryEntity>,
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
  // marketId join bo'lgan group ID larini olish
  // (2 ta query bilan N+1 ni oldini olamiz)
  // ──────────────────────────────────────────────
  private async loadJoinedIds(
    marketId: string | undefined,
    groupIds: string[],
  ): Promise<Set<string>> {
    if (!marketId || groupIds.length === 0) return new Set();

    const rows = await this.groupRepo
      .createQueryBuilder('g')
      .innerJoin('g.markets', 'm', 'm.id = :marketId', { marketId })
      .where('g.id IN (:...ids)', { ids: groupIds })
      .andWhere('g.isDeleted = false')
      .select('g.id', 'gid')
      .getRawMany();

    return new Set(rows.map((r) => r.gid));
  }

  // ──────────────────────────────────────────────
  // isJoined flag ni qo'shish
  // ──────────────────────────────────────────────
  private enrich(
    groups: GroupEntity[],
    joinedIds: Set<string>,
    lang?: 'uz' | 'ru',
  ) {
    return groups.map((g) => ({
      ...this.withName(g, lang),
      isJoined: joinedIds.has(g.id),
    }));
  }

  // ──────────────────────────────────────────────
  // Guruhlar ro'yxati + membersCount + isJoined
  // ──────────────────────────────────────────────
  async findAllGroups(lang?: 'uz' | 'ru', marketId?: string) {
    const groups = await this.groupRepo
      .createQueryBuilder('g')
      .leftJoinAndSelect('g.supCategory', 'sc')
      .leftJoinAndSelect('g.category', 'cat')
      .loadRelationCountAndMap('g.membersCount', 'g.markets')
      .where('g.isDeleted = false')
      .orderBy('g.createdAt', 'DESC')
      .getMany();

    const joinedIds = await this.loadJoinedIds(marketId, groups.map((g) => g.id));
    return successRes(this.enrich(groups, joinedIds, lang));
  }

  // ──────────────────────────────────────────────
  // CategoryId bo'yicha guruhlar + isJoined
  // ──────────────────────────────────────────────
  async findByCategoryId(categoryId: string, lang?: 'uz' | 'ru', marketId?: string) {
    const groups = await this.groupRepo
      .createQueryBuilder('g')
      .leftJoinAndSelect('g.supCategory', 'sc')
      .leftJoinAndSelect('g.category', 'cat')
      .loadRelationCountAndMap('g.membersCount', 'g.markets')
      .where('(g.categoryId = :categoryId OR sc.categoryId = :categoryId)', { categoryId })
      .andWhere('g.isDeleted = false')
      .orderBy('g.createdAt', 'DESC')
      .getMany();

    const joinedIds = await this.loadJoinedIds(marketId, groups.map((g) => g.id));
    return successRes(this.enrich(groups, joinedIds, lang));
  }

  // ──────────────────────────────────────────────
  // Bitta guruh + membersCount + isJoined
  // ──────────────────────────────────────────────
  async findOneGroup(id: string, lang?: 'uz' | 'ru', marketId?: string) {
    const group = await this.groupRepo
      .createQueryBuilder('g')
      .leftJoinAndSelect('g.supCategory', 'sc')
      .leftJoinAndSelect('g.category', 'cat')
      .leftJoinAndSelect('g.elons', 'elons')
      .loadRelationCountAndMap('g.membersCount', 'g.markets')
      .where('g.id = :id', { id })
      .andWhere('g.isDeleted = false')
      .getOne();

    if (!group) throw new NotFoundException('Group not found');

    const joinedIds = await this.loadJoinedIds(marketId, [group.id]);
    return successRes({
      ...this.withName(group, lang),
      isJoined: joinedIds.has(group.id),
    });
  }

  // ──────────────────────────────────────────────
  // Guruh a'zolari (marketlar) ro'yxati
  // ──────────────────────────────────────────────
  async getGroupMembers(id: string) {
    const group = await this.groupRepo.findOne({
      where: { id, isDeleted: false },
      relations: { markets: true },
    });
    if (!group) throw new NotFoundException('Group not found');

    // password ni chiqarmaymiz
    const members = group.markets.map(({ password, ...rest }: any) => rest);
    return successRes(members);
  }

  // ──────────────────────────────────────────────
  // Market join bo'lgan categorylar ro'yxati
  // ──────────────────────────────────────────────
  async getMyJoinedCategories(marketId: string, lang?: 'uz' | 'ru') {
    // Market a'zo bo'lgan guruhlar + ularning kategoriylari
    const joinedGroups = await this.groupRepo
      .createQueryBuilder('g')
      .innerJoin('g.markets', 'm', 'm.id = :marketId', { marketId })
      .leftJoinAndSelect('g.category', 'cat')
      .leftJoinAndSelect('g.supCategory', 'sc')
      .select(['g.id', 'g.categoryId', 'g.supCategoryId', 'cat', 'sc.categoryId'])
      .getMany();

    // Unique categoryId larni yig'amiz
    const categoryIds = new Set<string>();
    for (const g of joinedGroups) {
      if (g.categoryId) categoryIds.add(g.categoryId);
      else if ((g.supCategory as any)?.categoryId) {
        categoryIds.add((g.supCategory as any).categoryId);
      }
    }

    if (categoryIds.size === 0) return successRes([]);

    const categories = await this.categoryRepo.find({
      where: { id: In([...categoryIds]), isDeleted: false },
      order: { createdAt: 'DESC' } as any,
    });

    const withName = categories.map((c) => ({
      ...c,
      name: lang === 'ru' ? (c.nameRu || c.nameUz) : c.nameUz,
    }));

    return successRes(withName);
  }



  // ──────────────────────────────────────────────
  // Market qo'shilgan guruhlar ro'yxati (+ optional categoryId)
  // ──────────────────────────────────────────────
  async getMyGroups(marketId: string, lang?: 'uz' | 'ru', categoryId?: string) {
    const qb = this.groupRepo
      .createQueryBuilder('g')
      .innerJoin('g.markets', 'm', 'm.id = :marketId', { marketId })
      .leftJoinAndSelect('g.supCategory', 'sc')
      .leftJoinAndSelect('g.category', 'cat')
      .loadRelationCountAndMap('g.membersCount', 'g.markets')
      .andWhere('g.isDeleted = false');

    if (categoryId) {
      qb.andWhere('(g.categoryId = :categoryId OR sc.categoryId = :categoryId)', { categoryId });
    }

    const groups = await qb
      .orderBy('g.createdAt', 'DESC')
      .getMany();

    return successRes(groups.map((g) => ({ ...this.withName(g, lang), isJoined: true })));
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
    const group = await this.groupRepo.findOne({ where: { id, isDeleted: false } });
    if (!group) throw new NotFoundException('Group not found');

    if (requesterRole === UserRole.MARKET) {
      throw new ForbiddenException('Only admins can update groups');
    }

    if (dto.supCategoryId !== undefined) {
      await this.validateSupCategory(dto.supCategoryId);
    }

    if (dto.nameUz !== undefined) {
      group.nameUz = dto.nameUz.trim();
      group.name = group.nameUz;
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
    const group = await this.groupRepo.findOne({ where: { id, isDeleted: false } });
    if (!group) throw new NotFoundException('Group not found');

    if (requesterRole === UserRole.MARKET) {
      throw new ForbiddenException('Only admins can delete groups');
    }

    await this.groupRepo.update(id, {
      isDeleted: true,
      deletedAt: new Date(),
    } as any);
    return successRes({ deleted: true });
  }

  // ──────────────────────────────────────────────
  // Market guruhga qo'shilish (join)
  // ──────────────────────────────────────────────
  async joinGroup(groupId: string, marketId: string) {
    const group = await this.groupRepo.findOne({
      where: { id: groupId, isDeleted: false },
      relations: { markets: true },
    });
    if (!group) throw new NotFoundException('Group not found');

    const market = await this.marketRepo.findOne({ where: { id: marketId, isDeleted: false } });
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
      where: { id: groupId, isDeleted: false },
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
  // Guruhdan a'zoni chiqarish (kick) — faqat admin
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
      where: { id: groupId, isDeleted: false },
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
    const exists = await this.supCategoryRepo.exist({ where: { id: supCategoryId, isDeleted: false } });
    if (!exists) throw new NotFoundException('SupCategory not found');
  }
}
