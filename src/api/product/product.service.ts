import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { BaseService } from 'src/infrastructure/base/base-service';
import { ISuccess, successRes } from 'src/infrastructure/response/success.response';

import { ProductEntity } from 'src/core/entity/product.entity';
import { CommentEntity, CommentScope } from 'src/core/entity/comment.entity';
import { PhotoEntity } from 'src/core/entity/photo.entity';
import { CategoryEntity } from 'src/core/entity/category.entity';
import { SupCategoryEntity } from 'src/core/entity/sup-category.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductService extends BaseService<CreateProductDto, UpdateProductDto, ProductEntity> {
  constructor(
    @InjectRepository(ProductEntity)
    protected readonly productRepo: Repository<ProductEntity>,
    @InjectRepository(CommentEntity)
    private readonly commentRepo: Repository<CommentEntity>,
    @InjectRepository(PhotoEntity)
    private readonly photoRepo: Repository<PhotoEntity>,
    @InjectRepository(CategoryEntity)
    private readonly categoryRepo: Repository<CategoryEntity>,
    @InjectRepository(SupCategoryEntity)
    private readonly supCategoryRepo: Repository<SupCategoryEntity>,
  ) {
    super(productRepo);
  }

  async createForMarket(
    dto: CreateProductDto,
    marketId: string,
    photoPaths?: string[],
  ): Promise<ISuccess<ProductEntity>> {
    return this.productRepo.manager.transaction(async (manager) => {
      const prodRepo = manager.getRepository(ProductEntity);
      const commRepo = manager.getRepository(CommentEntity);
      const photoRepo = manager.getRepository(PhotoEntity);
      const categoryRepo = manager.getRepository(CategoryEntity);
      const supCategoryRepo = manager.getRepository(SupCategoryEntity);

      await this.ensureRelationsExist({
        categoryId: dto.categoryId,
        supCategoryId: dto.supCategoryId,
        categoryRepo,
        supCategoryRepo,
      });

      const product = prodRepo.create({
        name: dto.name.trim(),
        categoryId: dto.categoryId,
        supCategoryId: dto.supCategoryId ?? null,
        marketId,
        price: dto.price,
        amount: dto.amount,
        description: dto.description ?? null,
        commentId: null,
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

      if (photoPaths?.length) {
        const photos = photoPaths.map((path) =>
          photoRepo.create({
            path,
            productId: finalProduct.id,
            elonId: null,
          }),
        );
        await photoRepo.save(photos);
      }

      return successRes(finalProduct, 201);
    });
  }

  async updateWithPhoto(
    id: string,
    dto: UpdateProductDto,
    photoPaths?: string[],
  ): Promise<ISuccess<ProductEntity>> {
    const product = await this.repo.findOne({ where: { id } as any });
    if (!product) throw new NotFoundException('Not found');

    await this.ensureRelationsExist({
      categoryId: dto.categoryId,
      supCategoryId: dto.supCategoryId,
    });

    if (dto.name !== undefined) product.name = dto.name.trim();
    if (dto.categoryId !== undefined) product.categoryId = dto.categoryId;
    if (dto.supCategoryId !== undefined) product.supCategoryId = dto.supCategoryId;
    if (dto.price !== undefined) product.price = dto.price;
    if (dto.amount !== undefined) product.amount = dto.amount;
    if (dto.description !== undefined) product.description = dto.description ?? null;
    if (dto.isActive !== undefined) product.isActive = dto.isActive;

    const saved = await this.repo.save(product);
    if (photoPaths?.length) {
      await this.photoRepo.save(
        photoPaths.map((path) =>
          this.photoRepo.create({
            path,
            productId: saved.id,
            elonId: null,
          }),
        ),
      );
    }
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
}
