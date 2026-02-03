import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CommentEntity } from 'src/core/entity/comment.entity';
import { MessageEntity } from 'src/core/entity/message.entity';
import { ISuccess, successRes } from 'src/infrastructure/response/success.response';

@Injectable()
export class CommentService {
  constructor(
    @InjectRepository(CommentEntity)
    private readonly commentRepo: Repository<CommentEntity>,
  ) {}

  async findOne(id: string): Promise<ISuccess<CommentEntity>> {
    const comment = await this.commentRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.messages', 'm')
      .where('c.id = :id', { id })
      .orderBy('m.createdAt', 'ASC')
      .getOne();

    if (!comment) throw new NotFoundException('Not found');
    return successRes(comment);
  }

}
