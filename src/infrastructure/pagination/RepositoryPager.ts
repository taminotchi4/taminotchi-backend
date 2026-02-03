import { FindManyOptions, ObjectLiteral, Repository } from 'typeorm';
import { ISuccess, successRes } from '../response/success.response';

export type PaginationMeta = {
  totalElements: number;
  totalPages: number;
  pageSize: number;
  currentPage: number;
  from: number;
  to: number;
};

export interface IFindOptions<T> extends FindManyOptions<T> {
  page?: number;
  limit?: number;
}

export class RepositoryPager {
  static readonly DEFAULT_PAGE = 1;
  static readonly DEFAULT_LIMIT = 10;

  static async paginate<T extends ObjectLiteral>(
    repo: Repository<T>,
    options?: IFindOptions<T>,
  ): Promise<ISuccess<T[]>> {
    const page = Math.max(1, options?.page ?? this.DEFAULT_PAGE);
    const limit = Math.max(1, options?.limit ?? this.DEFAULT_LIMIT);
    const skip = (page - 1) * limit;

    const [data, total] = await repo.findAndCount({
      ...options,
      take: limit,
      skip,
    });

    const totalPages = Math.ceil(total / limit);
    const from = total === 0 ? 0 : skip + 1;
    const to = Math.min(skip + limit, total);

    const meta: PaginationMeta = {
      totalElements: total,
      totalPages,
      pageSize: limit,
      currentPage: page,
      from,
      to,
    };

    return successRes(data, 200, undefined, meta);
  }
}
