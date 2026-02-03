import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { BaseService } from 'src/infrastructure/base/base-service';
import { ISuccess, successRes } from 'src/infrastructure/response/success.response';
import { ElonEntity } from 'src/core/entity/elon.entity';
import { CommentEntity, CommentScope } from 'src/core/entity/comment.entity';
import { CreateElonDto } from './dto/create-elon.dto';
import { UpdateElonDto } from './dto/update-elon.dto';

@Injectable()
export class ElonService extends BaseService<CreateElonDto, UpdateElonDto, ElonEntity> {
  constructor(
    @InjectRepository(ElonEntity)
    protected readonly elonRepo: Repository<ElonEntity>,
    @InjectRepository(CommentEntity)
    private readonly commentRepo: Repository<CommentEntity>,
  ) {
    super(elonRepo);
  }

  override async create(dto: CreateElonDto): Promise<ISuccess<ElonEntity>> {
    return this.elonRepo.manager.transaction(async (manager) => {
      const eRepo = manager.getRepository(ElonEntity);
      const cRepo = manager.getRepository(CommentEntity);

      const elon = eRepo.create({
        text: dto.text.trim(),
        categoryId: dto.categoryId,
        clientId: dto.clientId,
        price: dto.price ?? null,
        groupId: dto.groupId ?? null,
        photoId: dto.photoId ?? null,
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
      return successRes(finalElon, 201);
    });
  }

  override async update(id: string, dto: UpdateElonDto): Promise<ISuccess<ElonEntity>> {
    const elon = await this.repo.findOne({ where: { id } as any });
    if (!elon) throw new NotFoundException('Not found');

    if (dto.text !== undefined) elon.text = dto.text.trim();
    if (dto.categoryId !== undefined) elon.categoryId = dto.categoryId;
    if (dto.clientId !== undefined) elon.clientId = dto.clientId;
    if (dto.price !== undefined) elon.price = dto.price ?? null;
    if (dto.groupId !== undefined) elon.groupId = dto.groupId ?? null;
    if (dto.photoId !== undefined) elon.photoId = dto.photoId ?? null;
    if (dto.status !== undefined) elon.status = dto.status;

    const saved = await this.repo.save(elon);
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
}
