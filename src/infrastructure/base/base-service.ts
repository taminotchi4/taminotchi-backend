import { NotFoundException } from '@nestjs/common';
import { DeepPartial, FindOptionsWhere, Repository } from 'typeorm';
import { successRes, ISuccess } from '../response/success.response';
import { IFindOptions, RepositoryPager } from '../pagination/RepositoryPager';

type IdType = string;

export class BaseService<CreateDto, UpdateDto, Entity extends { id: IdType }> {
  constructor(protected readonly repository: Repository<Entity>) { }

  get repo() {
    return this.repository;
  }

  async create(dto: CreateDto): Promise<ISuccess<Entity>> {
    const entity = this.repo.create(dto as DeepPartial<Entity>);
    const saved = await this.repo.save(entity);
    return successRes(saved, 201);
  }

  async findAll(options?: IFindOptions<Entity>): Promise<ISuccess<Entity[]>> {
    const data = await this.repo.find(options);
    return successRes(data);
  }

  async findAllWithPagination(
    options?: IFindOptions<Entity>,
  ): Promise<ISuccess<Entity[]>> {
    return RepositoryPager.paginate(this.repo, options);
  }

  async findOneBy(
    where: FindOptionsWhere<Entity>,
    options?: Omit<IFindOptions<Entity>, 'where'>,
  ): Promise<ISuccess<Entity>> {
    const data = await this.repo.findOne({
      ...options,
      where,
    } as any);

    if (!data) throw new NotFoundException('Not found');
    return successRes(data);
  }

  async findOneById(
    id: IdType,
    options?: Omit<IFindOptions<Entity>, 'where'>,
  ): Promise<ISuccess<Entity>> {
    const data = await this.repo.findOne({
      ...options,
      where: { id } as any,
    });

    if (!data) throw new NotFoundException('Not found');
    return successRes(data);
  }

  async update(id: IdType, dto: UpdateDto): Promise<ISuccess<Entity>> {
    // 1) mavjudligini tekshirish
    const entity = await this.repo.findOne({ where: { id } as any });
    if (!entity) throw new NotFoundException('Not found');

    // 2) merge + save (update result emas, real entity qaytaradi)
    const merged = this.repo.merge(entity, dto as any);
    const saved = await this.repo.save(merged);

    return successRes(saved);
  }

  async delete(id: IdType): Promise<ISuccess<{ deleted: true }>> {
    const exists = await this.repo.findOne({ where: { id } as any });
    if (!exists) throw new NotFoundException('Not found');

    await this.repo.delete(id as any);
    return successRes({ deleted: true });
  }
}
