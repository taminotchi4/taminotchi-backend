import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { Repository } from 'typeorm';

import { SupCategoryEntity } from 'src/core/entity/sup-category.entity';
import { CategoryEntity } from 'src/core/entity/category.entity';
import { ProductEntity } from 'src/core/entity/product.entity';
import { GroupEntity } from 'src/core/entity/group.entity';
import { ElonEntity } from 'src/core/entity/elon.entity';
import { CreateSupCategoryDto } from './dto/create-sup-category.dto';
import { UpdateSupCategoryDto } from './dto/update-sup-category.dto';
import { ISuccess, successRes } from 'src/infrastructure/response/success.response';
import { config } from 'src/config';

@Injectable()
export class SupCategoryService {
  constructor(
    @InjectRepository(SupCategoryEntity)
    private readonly supCategoryRepo: Repository<SupCategoryEntity>,
    @InjectRepository(CategoryEntity)
    private readonly categoryRepo: Repository<CategoryEntity>,
    @InjectRepository(ProductEntity)
    private readonly productRepo: Repository<ProductEntity>,
    @InjectRepository(GroupEntity)
    private readonly groupRepo: Repository<GroupEntity>,
    @InjectRepository(ElonEntity)
    private readonly elonRepo: Repository<ElonEntity>,
  ) { }

  private async ensureUniqueNameUz(nameUz: string, ignoreId?: string) {
    const exists = await this.supCategoryRepo.findOne({ where: { nameUz } });
    if (exists && exists.id !== ignoreId) {
      throw new ConflictException('SupCategory nameUz already exists');
    }
  }

  private async ensureCategoryExists(categoryId: string) {
    const category = await this.categoryRepo.findOne({ where: { id: categoryId } });
    if (!category) throw new BadRequestException('Category not found');
  }

  private toDiskPath(publicPath: string) {
    return join(process.cwd(), publicPath.replace(/^\/+/, ''));
  }

  private async cleanupUploadedFiles(paths: Array<string | null | undefined>) {
    await Promise.all(
      paths
        .filter((p): p is string => Boolean(p))
        .map(async (p) => {
          try {
            await unlink(this.toDiskPath(p));
          } catch {
            // ignore cleanup errors
          }
        }),
    );
  }

  private toAbsoluteUrl(value?: string | null) {
    if (!value) return null;
    if (/^https?:\/\//i.test(value)) return value;
    const base = (config.BACKEND_URL || '').replace(/\/+$/, '');
    if (!base) return value;
    return value.startsWith('/') ? `${base}${value}` : `${base}/${value}`;
  }

  private withUrls(sc: SupCategoryEntity) {
    return {
      ...sc,
      photoUrl: this.toAbsoluteUrl(sc.photoUrl),
      iconUrl: this.toAbsoluteUrl(sc.iconUrl),
    };
  }

  private withName<T extends { nameUz: string; nameRu: string | null }>(
    item: T,
    lang?: 'uz' | 'ru',
  ) {
    const name = lang === 'ru' ? (item.nameRu || item.nameUz) : item.nameUz;
    return { ...item, name };
  }

  async create(
    dto: CreateSupCategoryDto,
    files?: { photoUrl?: string | null; iconUrl?: string | null },
  ): Promise<ISuccess<SupCategoryEntity>> {
    const nameUz = dto.nameUz?.trim();
    if (!nameUz) throw new BadRequestException('nameUz is required');

    try {
      await this.ensureUniqueNameUz(nameUz);
      await this.ensureCategoryExists(dto.categoryId);

      const supCategory = this.supCategoryRepo.create({
        nameUz,
        nameRu: dto.nameRu ?? null,
        categoryId: dto.categoryId,
        photoUrl: files?.photoUrl ?? null,
        iconUrl: files?.iconUrl ?? null,
      });

      const saved = await this.supCategoryRepo.save(supCategory);
      return successRes(this.withUrls(saved), 201);
    } catch (err) {
      await this.cleanupUploadedFiles([files?.photoUrl, files?.iconUrl]);
      throw err;
    }
  }

  async findAll(lang?: 'uz' | 'ru'): Promise<ISuccess<any[]>> {
    const data = await this.supCategoryRepo.find({
      order: { createdAt: 'DESC' } as any,
    });
    return successRes(data.map((c) => this.withName(this.withUrls(c) as any, lang)));
  }

  async findOne(id: string, lang?: 'uz' | 'ru'): Promise<ISuccess<any>> {
    const data = await this.supCategoryRepo.findOne({
      where: { id },
      relations: {
        products: true,
        groups: true,
        elons: true,
      },
    });
    if (!data) throw new NotFoundException('Not found');
    return successRes(this.withName(this.withUrls(data) as any, lang));
  }

  async update(
    id: string,
    dto: UpdateSupCategoryDto,
    files?: { photoUrl?: string | null; iconUrl?: string | null },
  ): Promise<ISuccess<SupCategoryEntity>> {
    const supCategory = await this.supCategoryRepo.findOne({ where: { id } });
    if (!supCategory) throw new NotFoundException('Not found');

    try {
      if (dto.nameUz !== undefined) {
        const nameUz = dto.nameUz.trim();
        if (!nameUz) throw new BadRequestException('nameUz cannot be empty');
        await this.ensureUniqueNameUz(nameUz, id);
        supCategory.nameUz = nameUz;
      }

      if (dto.nameRu !== undefined) supCategory.nameRu = dto.nameRu ?? null;

      if (dto.categoryId !== undefined) {
        await this.ensureCategoryExists(dto.categoryId);
        supCategory.categoryId = dto.categoryId;
      }

      if (files?.photoUrl !== undefined && files.photoUrl !== null && files.photoUrl !== "") {
        supCategory.photoUrl = files.photoUrl;
      }
      if (files?.iconUrl !== undefined && files.iconUrl !== null && files.iconUrl !== "") {
        supCategory.iconUrl = files.iconUrl;
      }

      const saved = await this.supCategoryRepo.save(supCategory);
      return successRes(this.withUrls(saved));
    } catch (err) {
      await this.cleanupUploadedFiles([files?.photoUrl, files?.iconUrl]);
      throw err;
    }
  }

  async remove(id: string): Promise<ISuccess<{ deleted: true }>> {
    const exists = await this.supCategoryRepo.findOne({ where: { id } });
    if (!exists) throw new NotFoundException('Not found');

    const [productCount, groupCount, elonCount] = await Promise.all([
      this.productRepo.count({ where: { supCategoryId: id } as any }),
      this.groupRepo.count({ where: { supCategoryId: id } as any }),
      this.elonRepo.count({ where: { supCategoryId: id } as any }),
    ]);

    if (productCount > 0 || groupCount > 0 || elonCount > 0) {
      throw new ConflictException(
        'SupCategory has related records (products/groups/elons)',
      );
    }

    await this.supCategoryRepo.delete(id as any);
    return successRes({ deleted: true });
  }
}
