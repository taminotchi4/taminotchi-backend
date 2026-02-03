import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { Repository } from 'typeorm';

import { CategoryEntity } from 'src/core/entity/category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { ISuccess, successRes } from 'src/infrastructure/response/success.response';

@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(CategoryEntity)
    private readonly categoryRepo: Repository<CategoryEntity>,
  ) { }

  private async ensureUniqueNameUz(nameUz: string, ignoreId?: string) {
    const exists = await this.categoryRepo.findOne({ where: { nameUz } });
    if (exists && exists.id !== ignoreId) {
      throw new ConflictException('Category nameUz already exists');
    }
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

  async create(dto: CreateCategoryDto, files?: { photoPath?: string | null; iconPath?: string | null })
    : Promise<ISuccess<CategoryEntity>> {
    const nameUz = dto.nameUz?.trim();
    if (!nameUz) throw new BadRequestException('nameUz is required');

    try {
      await this.ensureUniqueNameUz(nameUz);

      const category = this.categoryRepo.create({
        nameUz,
        nameRu: dto.nameRu ?? null,
        photoPath: files?.photoPath ?? null,
        iconPath: files?.iconPath ?? null,
      });

      const saved = await this.categoryRepo.save(category);
      return successRes(saved, 201);
    } catch (err) {
      await this.cleanupUploadedFiles([files?.photoPath, files?.iconPath]);
      throw err;
    }
  }

  async findAll(): Promise<ISuccess<CategoryEntity[]>> {
    const data = await this.categoryRepo.find({
      order: { createdAt: 'DESC' } as any,
    });
    return successRes(data);
  }

  async findOne(id: string): Promise<ISuccess<CategoryEntity>> {
    const data = await this.categoryRepo.findOne({ where: { id } as any });
    if (!data) throw new NotFoundException('Not found');
    return successRes(data);
  }

  async update(
    id: string,
    dto: UpdateCategoryDto,
    files?: { photoPath?: string | null; iconPath?: string | null },
  ): Promise<ISuccess<CategoryEntity>> {
    const category = await this.categoryRepo.findOne({ where: { id } });
    if (!category) throw new NotFoundException('Not found');

    try {
      if (dto.nameUz !== undefined) {
        const nameUz = dto.nameUz.trim();
        if (!nameUz) throw new BadRequestException('nameUz cannot be empty');
        await this.ensureUniqueNameUz(nameUz, id);
        category.nameUz = nameUz;
      }

      if (dto.nameRu !== undefined) category.nameRu = dto.nameRu ?? null;

      // Fayl kelsa update qilamiz, kelmasa eski qoladi
      if (files?.photoPath !== undefined && files.photoPath !== null && files.photoPath !== "") {
        category.photoPath = files.photoPath;
      }
      if (files?.iconPath !== undefined && files.iconPath !== null && files.iconPath !== "") {
        category.iconPath = files.iconPath;
      }

      const saved = await this.categoryRepo.save(category);
      return successRes(saved);
    } catch (err) {
      await this.cleanupUploadedFiles([files?.photoPath, files?.iconPath]);
      throw err;
    }
  }

  async remove(id: string): Promise<ISuccess<{ deleted: true }>> {
    const exists = await this.categoryRepo.findOne({ where: { id } });
    if (!exists) throw new NotFoundException('Not found');

    await this.categoryRepo.delete(id);
    return successRes({ deleted: true });
  }
}
