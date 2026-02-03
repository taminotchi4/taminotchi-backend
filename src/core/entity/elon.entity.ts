import { Column, Entity, JoinColumn, ManyToOne, Index, OneToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { CategoryEntity } from './category.entity';
import { GroupEntity } from './group.entity';
import { PhotoEntity } from './photo.entity';
import { ClientEntity } from './client.entity';
import { CommentEntity } from './comment.entity';
import { ElonStatus } from 'src/common/enum/index.enum';

@Entity('elon')
export class ElonEntity extends BaseEntity {
    @Column({ type: 'text' })
    text: string;

    @Index()
    @Column({ type: 'uuid' })
    categoryId: string;

    @ManyToOne(() => CategoryEntity, (c) => c.elons, { onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'categoryId' })
    category: CategoryEntity;

    @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true })
    price: string | null;

    @Column({ type: 'enum', enum: ElonStatus, default: ElonStatus.NEGOTIATION, })
    status: ElonStatus;

    @Index()
    @Column({ type: 'uuid', nullable: true  })
    groupId: string | null;

    @ManyToOne(() => GroupEntity, (g) => g.elons, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'groupId' })
    group: GroupEntity | null;

    @Index()
    @Column({ type: 'uuid', nullable: true })
    photoId: string | null;

    @ManyToOne(() => PhotoEntity, (p) => p.elons, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'photoId' })
    photo: PhotoEntity | null;

    @Index()
    @Column({ type: 'uuid' })
    clientId: string;

    @ManyToOne(() => ClientEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'clientId' })
    client: ClientEntity;

    @Index()
    @Column({ type: 'uuid', unique: true })
    commentId: string;

    @OneToOne(() => CommentEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'commentId' })
    comment: CommentEntity;
}
