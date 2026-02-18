import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

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

      const enriched = await this.enrichProducts([finalProduct]);
      return successRes(enriched[0], 201);
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
    const enriched = await this.enrichProducts([saved]);
    return successRes(enriched[0]);
  }

  override async findAll(): Promise<ISuccess<ProductEntity[]>> {
    const data = await this.repo.find({
      relations: {
        category: true,
        supCategory: true,
        comment: true,
      } as any,
      order: { createdAt: 'DESC' } as any,
    });
    const enriched = await this.enrichProducts(data);
    return successRes(enriched);
  }

  override async findOneById(id: string): Promise<ISuccess<ProductEntity>> {
    const product = await this.repo.findOne({
      where: { id } as any,
      relations: {
        category: true,
        supCategory: true,
        comment: true,
      } as any,
    });
    if (!product) throw new NotFoundException('Not found');
    const enriched = await this.enrichProducts([product]);
    return successRes(enriched[0]);
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

  private async enrichProducts(products: ProductEntity[]): Promise<ProductEntity[]> {
    if (!products.length) return [];

    const productIds = products.map((p) => p.id);
    const photos = await this.photoRepo.find({
      where: { productId: In(productIds) } as any,
      order: { createdAt: 'DESC' } as any,
    });

    const photosByProduct = new Map<string, PhotoEntity[]>();
    for (const photo of photos) {
      if (!photo.productId) continue;
      const list = photosByProduct.get(photo.productId) ?? [];
      list.push(photo);
      photosByProduct.set(photo.productId, list);
    }

    const commentIds = products
      .map((p) => p.commentId)
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

    for (const product of products as any[]) {
      product.photos = photosByProduct.get(product.id) ?? [];
      if (product.comment?.id) {
        product.comment = {
          ...product.comment,
          messageCount: messageCountByComment.get(product.comment.id) ?? 0,
        };
      }
    }

    return products;
  }
}
