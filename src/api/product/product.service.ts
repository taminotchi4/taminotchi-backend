import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { BaseService } from 'src/infrastructure/base/base-service';
import { ISuccess, successRes } from 'src/infrastructure/response/success.response';

import { ProductEntity } from 'src/core/entity/product.entity';
import { CommentEntity, CommentScope } from 'src/core/entity/comment.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductService extends BaseService<CreateProductDto, UpdateProductDto, ProductEntity> {
  constructor(
    @InjectRepository(ProductEntity)
    protected readonly productRepo: Repository<ProductEntity>,
    @InjectRepository(CommentEntity)
    private readonly commentRepo: Repository<CommentEntity>,
  ) {
    super(productRepo);
  }

  override async create(dto: CreateProductDto): Promise<ISuccess<ProductEntity>> {
    return this.productRepo.manager.transaction(async (manager) => {
      const prodRepo = manager.getRepository(ProductEntity);
      const commRepo = manager.getRepository(CommentEntity);

      const product = prodRepo.create({
        name: dto.name.trim(),
        categoryId: dto.categoryId,
        marketId: dto.marketId,
        price: dto.price,
        description: dto.description ?? null,
        photoId: dto.photoId ?? null,
      });

      const savedProduct = await prodRepo.save(product);

      const comment = commRepo.create({
        scope: CommentScope.PRODUCT,
        productId: savedProduct.id,
        elonId: null,
      });

      const savedComment = await commRepo.save(comment);
      savedProduct.commentId = savedComment.id;

      const finalProduct = await prodRepo.save(savedProduct);
      return successRes(finalProduct, 201);
    });
  }

  override async update(id: string, dto: UpdateProductDto): Promise<ISuccess<ProductEntity>> {
    const product = await this.repo.findOne({ where: { id } as any });
    if (!product) throw new NotFoundException('Not found');

    if (dto.name !== undefined) product.name = dto.name.trim();
    if (dto.categoryId !== undefined) product.categoryId = dto.categoryId;
    if (dto.marketId !== undefined) product.marketId = dto.marketId;
    if (dto.price !== undefined) product.price = dto.price;
    if (dto.description !== undefined) product.description = dto.description ?? null;
    if (dto.photoId !== undefined) product.photoId = dto.photoId ?? null;
    if (dto.isActive !== undefined) product.isActive = dto.isActive;

    const saved = await this.repo.save(product);
    return successRes(saved);
  }

  override async delete(id: string): Promise<ISuccess<{ deleted: true }>> {
    return this.productRepo.manager.transaction(async (manager) => {
      const prodRepo = manager.getRepository(ProductEntity);
      const commRepo = manager.getRepository(CommentEntity);

      const product = await prodRepo.findOne({ where: { id } as any });
      if (!product) throw new NotFoundException('Not found');

      const commentId = product.commentId;
      await prodRepo.delete(id as any);

      if (commentId) {
        await commRepo.delete(commentId as any);
      }

      return successRes({ deleted: true });
    });
  }
}
