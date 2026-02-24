import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { BaseService } from 'src/infrastructure/base/base-service';
import { ISuccess, successRes } from 'src/infrastructure/response/success.response';
import { ElonEntity } from 'src/core/entity/elon.entity';
import { CommentEntity, CommentScope } from 'src/core/entity/comment.entity';
import { PhotoEntity } from 'src/core/entity/photo.entity';
import { CategoryEntity } from 'src/core/entity/category.entity';
import { SupCategoryEntity } from 'src/core/entity/sup-category.entity';
import { GroupEntity } from 'src/core/entity/group.entity';
import { ElonStatus } from 'src/common/enum/index.enum';
import { CreateElonDto } from './dto/create-elon.dto';
import { UpdateElonDto } from './dto/update-elon.dto';
import { NotificationService } from '../notification/notification.service';
import { NotificationGateway } from '../notification/notification.gateway';
import { NotificationType, NotificationRefType } from 'src/common/enum/index.enum';

@Injectable()
export class ElonService extends BaseService<CreateElonDto, UpdateElonDto, ElonEntity> {
  constructor(
    @InjectRepository(ElonEntity)
    protected readonly elonRepo: Repository<ElonEntity>,
    @InjectRepository(CommentEntity)
    private readonly commentRepo: Repository<CommentEntity>,
    @InjectRepository(PhotoEntity)
    private readonly photoRepo: Repository<PhotoEntity>,
    @InjectRepository(CategoryEntity)
    private readonly categoryRepo: Repository<CategoryEntity>,
    @InjectRepository(SupCategoryEntity)
    private readonly supCategoryRepo: Repository<SupCategoryEntity>,
    @InjectRepository(GroupEntity)
    private readonly groupRepo: Repository<GroupEntity>,

    private readonly notifService: NotificationService,
    private readonly notifGateway: NotificationGateway,
  ) {
    super(elonRepo);
  }

  async createForClient(
    dto: CreateElonDto,
    clientId: string,
    photoPaths?: string[],
  ): Promise<ISuccess<ElonEntity>> {
    // Tranzaksiya: elon + comment + groups + photolar saqlanadi
    const finalElonId = await this.elonRepo.manager.transaction(async (manager) => {
      const eRepo = manager.getRepository(ElonEntity);
      const cRepo = manager.getRepository(CommentEntity);
      const photoRepo = manager.getRepository(PhotoEntity);
      const categoryRepo = manager.getRepository(CategoryEntity);
      const supCategoryRepo = manager.getRepository(SupCategoryEntity);
      const groupRepo = manager.getRepository(GroupEntity);

      await this.ensureRelationsExist({
        categoryId: dto.categoryId,
        supCategoryId: dto.supCategoryId,
        categoryRepo,
        supCategoryRepo,
      });

      const elon = eRepo.create({
        text: dto.text.trim(),
        adressname: dto.adressname?.trim() ?? null,
        categoryId: dto.categoryId,
        ...(dto.supCategoryId ? { supCategoryId: dto.supCategoryId } : {}),
        clientId,
        price: dto.price ?? null,
        commentId: null,
      });

      const savedElon = await eRepo.save(elon);

      const whereConditions: object[] = [];
      if (savedElon.categoryId) {
        whereConditions.push({ categoryId: savedElon.categoryId, supCategoryId: null });
      }
      if (savedElon.supCategoryId) {
        whereConditions.push({ supCategoryId: savedElon.supCategoryId });
      }

      if (whereConditions.length) {
        const autoGroups = await groupRepo.find({ where: whereConditions as any });
        if (autoGroups.length) {
          savedElon.groups = autoGroups;
          await eRepo.save(savedElon);
        }
      }

      const comment = cRepo.create({
        scope: CommentScope.ELON,
        elonId: savedElon.id,
        productId: null,
      });

      const savedComment = await cRepo.save(comment);
      savedElon.commentId = savedComment.id;

      const finalElon = await eRepo.save(savedElon);

      if (photoPaths?.length) {
        await photoRepo.save(
          photoPaths.map((path) =>
            photoRepo.create({
              path,
              elonId: finalElon.id,
              productId: null,
            }),
          ),
        );
      }

      return finalElon.id;
    });

    // Tranzaksiya yakunlangandan keyin enrich qilamiz — photolar commit bo'lgan
    const saved = await this.elonRepo.findOne({
      where: { id: finalElonId } as any,
      relations: { category: true, supCategory: true, groups: true, comment: true } as any,
    });

    const enriched = await this.enrichElons([saved!]);

    // Notification (yon ta'sir)
    if (saved?.groups?.length) {
      setImmediate(async () => {
        for (const group of saved.groups) {
          const members = await this.groupRepo
            .createQueryBuilder('g')
            .innerJoin('g.markets', 'm')
            .select('m.id', 'id')
            .where('g.id = :gId', { gId: group.id })
            .getRawMany<{ id: string }>();

          await Promise.all(
            members.map(async ({ id: memberId }) => {
              const notif = await this.notifService.create({
                userId: memberId,
                type: NotificationType.ELON_COMMENT,
                referenceId: finalElonId,
                referenceType: NotificationRefType.GROUP,
                preview: saved.text?.slice(0, 100) ?? null,
              });
              this.notifGateway.pushToUser(memberId, notif);
            }),
          );
        }
      });
    }

    return successRes(enriched[0], 201);
  }

  async updateWithPhoto(
    id: string,
    dto: UpdateElonDto,
    photoPaths?: string[],
  ): Promise<ISuccess<ElonEntity>> {
    const elon = await this.repo.findOne({ where: { id } as any });
    if (!elon) throw new NotFoundException('Not found');

    await this.ensureRelationsExist({
      categoryId: dto.categoryId,
      supCategoryId: dto.supCategoryId,
    });

    if (dto.text !== undefined) elon.text = dto.text.trim();
    if (dto.adressname !== undefined) elon.adressname = dto.adressname?.trim() ?? null;
    if (dto.categoryId !== undefined) elon.categoryId = dto.categoryId;
    if (dto.supCategoryId !== undefined) elon.supCategoryId = dto.supCategoryId;
    if (dto.price !== undefined) elon.price = dto.price ?? null;
    if (dto.status !== undefined) elon.status = dto.status;

    const saved = await this.repo.save(elon);
    if (photoPaths?.length) {
      await this.photoRepo.save(
        photoPaths.map((path) =>
          this.photoRepo.create({
            path,
            elonId: saved.id,
            productId: null,
          }),
        ),
      );
    }

    // Photolar saqlangandan keyin enrich qilamiz
    const fresh = await this.repo.findOne({
      where: { id: saved.id } as any,
      relations: { category: true, supCategory: true, groups: true, comment: true } as any,
    });
    const enriched = await this.enrichElons([fresh!]);
    return successRes(enriched[0]);
  }

  override async findAll(): Promise<ISuccess<ElonEntity[]>> {
    const data = await this.repo.find({
      relations: {
        category: true,
        supCategory: true,
        groups: true,
        comment: true,
      } as any,
      order: { createdAt: 'DESC' } as any,
    });
    const enriched = await this.enrichElons(data);
    return successRes(enriched);
  }

  override async findOneById(id: string): Promise<ISuccess<ElonEntity>> {
    const elon = await this.repo.findOne({
      where: { id } as any,
      relations: {
        category: true,
        supCategory: true,
        groups: true,
        comment: true,
      } as any,
    });
    if (!elon) throw new NotFoundException('Not found');
    const enriched = await this.enrichElons([elon]);
    return successRes(enriched[0]);
  }

  override async delete(id: string): Promise<ISuccess<{ deleted: true }>> {
    return this.elonRepo.manager.transaction(async (manager) => {
      const eRepo = manager.getRepository(ElonEntity);
      const cRepo = manager.getRepository(CommentEntity);

      const elon = await eRepo.findOne({ where: { id } as any });
      if (!elon) throw new NotFoundException('Not found');

      const commentId = elon.commentId;
      await eRepo.delete(id as any);

      if (commentId) {
        await cRepo.delete(commentId as any);
      }

      return successRes({ deleted: true });
    });
  }

  async incrementAnswerCount(id: string): Promise<ISuccess<ElonEntity>> {
    const elon = await this.repo.findOne({ where: { id } as any });
    if (!elon) throw new NotFoundException('Elon Not found');

    elon.answerCount += 1;
    const saved = await this.repo.save(elon);
    return successRes(saved);
  }

  async updateStatus(id: string, status: ElonStatus): Promise<ISuccess<ElonEntity>> {
    const elon = await this.repo.findOne({ where: { id } as any });
    if (!elon) throw new NotFoundException('Not found');

    elon.status = status;
    const saved = await this.repo.save(elon);
    const enriched = await this.enrichElons([saved]);
    return successRes(enriched[0]);
  }

  private async ensureRelationsExist(params: {
    categoryId?: string | null;
    supCategoryId?: string | null;
    categoryRepo?: Repository<CategoryEntity>;
    supCategoryRepo?: Repository<SupCategoryEntity>;
  }): Promise<void> {
    const categoryRepo = params.categoryRepo ?? this.categoryRepo;
    const supCategoryRepo = params.supCategoryRepo ?? this.supCategoryRepo;

    if (params.categoryId) {
      const exists = await categoryRepo.exist({ where: { id: params.categoryId } });
      if (!exists) throw new NotFoundException('category not found');
    }

    if (params.supCategoryId) {
      const exists = await supCategoryRepo.exist({ where: { id: params.supCategoryId } });
      if (!exists) throw new NotFoundException('supcategory not found');
    }
  }

  private async enrichElons(elons: ElonEntity[]): Promise<ElonEntity[]> {
    if (!elons.length) return [];

    const elonIds = elons.map((e) => e.id);
    const photos = await this.photoRepo.find({
      where: { elonId: In(elonIds) } as any,
      order: { createdAt: 'DESC' } as any,
    });

    const photosByElon = new Map<string, PhotoEntity[]>();
    for (const photo of photos) {
      if (!photo.elonId) continue;
      const list = photosByElon.get(photo.elonId) ?? [];
      list.push(photo);
      photosByElon.set(photo.elonId, list);
    }

    const commentIds = elons
      .map((e) => e.commentId)
      .filter((id): id is string => Boolean(id));

    const messageCountByComment = new Map<string, number>();
    if (commentIds.length) {
      const rows = await this.commentRepo
        .createQueryBuilder('c')
        .leftJoin('c.messages', 'm')
        .select('c.id', 'id')
        .addSelect('COUNT(m.id)', 'messageCount')
        .where('c.id IN (:...ids)', { ids: commentIds })
        .groupBy('c.id')
        .getRawMany<{ id: string; messageCount: string }>();

      for (const row of rows) {
        messageCountByComment.set(row.id, Number(row.messageCount));
      }
    }

    for (const elon of elons as any[]) {
      elon.photos = photosByElon.get(elon.id) ?? [];
      if (elon.comment?.id) {
        elon.comment = {
          ...elon.comment,
          messageCount: messageCountByComment.get(elon.comment.id) ?? 0,
        };
      }
    }

    return elons;
  }
}
