import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { BaseService } from 'src/infrastructure/base/base-service';
import { ISuccess, successRes } from 'src/infrastructure/response/success.response';
import { ElonEntity } from 'src/core/entity/elon.entity';
import { CommentEntity, CommentScope } from 'src/core/entity/comment.entity';
import { PhotoEntity } from 'src/core/entity/photo.entity';
import { CategoryEntity } from 'src/core/entity/category.entity';
import { SupCategoryEntity } from 'src/core/entity/sup-category.entity';
import { GroupEntity } from 'src/core/entity/group.entity';
import { CreateElonDto } from './dto/create-elon.dto';
import { UpdateElonDto } from './dto/update-elon.dto';

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
  ) {
    super(elonRepo);
  }

  async createForClient(
    dto: CreateElonDto,
    clientId: string,
    photoPaths?: string[],
  ): Promise<ISuccess<ElonEntity>> {
    return this.elonRepo.manager.transaction(async (manager) => {
      const eRepo = manager.getRepository(ElonEntity);
      const cRepo = manager.getRepository(CommentEntity);
      const photoRepo = manager.getRepository(PhotoEntity);
      const categoryRepo = manager.getRepository(CategoryEntity);
      const supCategoryRepo = manager.getRepository(SupCategoryEntity);
      const groupRepo = manager.getRepository(GroupEntity);

      await this.ensureRelationsExist({
        categoryId: dto.categoryId,
        supCategoryId: dto.supCategoryId,
        groupId: dto.groupId,
        categoryRepo,
        supCategoryRepo,
        groupRepo,
      });

      const elon = eRepo.create({
        text: dto.text.trim(),
        adressname: dto.adressname?.trim() ?? null,
        categoryId: dto.categoryId,
        ...(dto.supCategoryId ? { supCategoryId: dto.supCategoryId } : {}),
        clientId,
        price: dto.price ?? null,
        groupId: dto.groupId ?? null,
        commentId: null,
      });

      const savedElon = await eRepo.save(elon);

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
      return successRes(finalElon, 201);
    });
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
      groupId: dto.groupId,
    });

    if (dto.text !== undefined) elon.text = dto.text.trim();
    if (dto.adressname !== undefined) elon.adressname = dto.adressname?.trim() ?? null;
    if (dto.categoryId !== undefined) elon.categoryId = dto.categoryId;
    if (dto.supCategoryId !== undefined) elon.supCategoryId = dto.supCategoryId;
    if (dto.price !== undefined) elon.price = dto.price ?? null;
    if (dto.groupId !== undefined) elon.groupId = dto.groupId ?? null;
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
    return successRes(saved);
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

  private async ensureRelationsExist(params: {
    categoryId?: string | null;
    supCategoryId?: string | null;
    groupId?: string | null;
    categoryRepo?: Repository<CategoryEntity>;
    supCategoryRepo?: Repository<SupCategoryEntity>;
    groupRepo?: Repository<GroupEntity>;
  }): Promise<void> {
    const categoryRepo = params.categoryRepo ?? this.categoryRepo;
    const supCategoryRepo = params.supCategoryRepo ?? this.supCategoryRepo;
    const groupRepo = params.groupRepo ?? this.groupRepo;

    if (params.categoryId) {
      const exists = await categoryRepo.exist({ where: { id: params.categoryId } });
      if (!exists) throw new NotFoundException('category not found');
    }

    if (params.supCategoryId) {
      const exists = await supCategoryRepo.exist({ where: { id: params.supCategoryId } });
      if (!exists) throw new NotFoundException('supcategory not found');
    }

    if (params.groupId) {
      const exists = await groupRepo.exist({ where: { id: params.groupId } });
      if (!exists) throw new NotFoundException('group not found');
    }
  }
}
