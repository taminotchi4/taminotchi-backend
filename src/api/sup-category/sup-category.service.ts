import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { Repository } from 'typeorm';

import { SupCategoryEntity } from 'src/core/entity/sup-category.entity';
import { CategoryEntity } from 'src/core/entity/category.entity';
import { CreateSupCategoryDto } from './dto/create-sup-category.dto';
import { UpdateSupCategoryDto } from './dto/update-sup-category.dto';
import { ISuccess, successRes } from 'src/infrastructure/response/success.response';

@Injectable()
export class SupCategoryService {
  constructor(
    @InjectRepository(SupCategoryEntity)
    private readonly supCategoryRepo: Repository<SupCategoryEntity>,
    @InjectRepository(CategoryEntity)
    private readonly categoryRepo: Repository<CategoryEntity>,
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

  async create(
    dto: CreateSupCategoryDto,
    files?: { photoPath?: string | null; iconPath?: string | null },
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
        photoPath: files?.photoPath ?? null,
        iconPath: files?.iconPath ?? null,
      });

      const saved = await this.supCategoryRepo.save(supCategory);
      return successRes(saved, 201);
    } catch (err) {
      await this.cleanupUploadedFiles([files?.photoPath, files?.iconPath]);
      throw err;
    }
  }

  async findAll(): Promise<ISuccess<SupCategoryEntity[]>> {
    const data = await this.supCategoryRepo.find({
      order: { createdAt: 'DESC' } as any,
    });
    return successRes(data);
  }

  async findOne(id: string): Promise<ISuccess<SupCategoryEntity>> {
    const data = await this.supCategoryRepo.findOne({
      where: { id },
      relations: {
        products: true,
        groups: true,
        elons: true,
      },
    });
    if (!data) throw new NotFoundException('Not found');
    return successRes(data);
  }

  async update(
    id: string,
    dto: UpdateSupCategoryDto,
    files?: { photoPath?: string | null; iconPath?: string | null },
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

      if (files?.photoPath !== undefined && files.photoPath !== null && files.photoPath !== "") {
        supCategory.photoPath = files.photoPath;
      }
      if (files?.iconPath !== undefined && files.iconPath !== null && files.iconPath !== "") {
        supCategory.iconPath = files.iconPath;
      }

      const saved = await this.supCategoryRepo.save(supCategory);
      return successRes(saved);
    } catch (err) {
      await this.cleanupUploadedFiles([files?.photoPath, files?.iconPath]);
      throw err;
    }
  }

  async remove(id: string): Promise<ISuccess<{ deleted: true }>> {
    const exists = await this.supCategoryRepo.findOne({ where: { id } });
    if (!exists) throw new NotFoundException('Not found');

    await this.supCategoryRepo.delete(id as any);
    return successRes({ deleted: true });
  }
}
