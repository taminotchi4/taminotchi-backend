import { Column, Entity, JoinColumn, ManyToOne, Index, OneToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { CategoryEntity } from './category.entity';
import { PhotoEntity } from './photo.entity';
import { MarketEntity } from './market.entity';
import { CommentEntity } from './comment.entity';
import { SupCategoryEntity } from './sup-category.entity';

@Entity('product')
export class ProductEntity extends BaseEntity {
    @Column({ type: 'varchar' })
    name: string;

    @Index()
    @Column({ type: 'uuid' })
    categoryId: string;

    @ManyToOne(() => CategoryEntity, (c) => c.products, { onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'categoryId' })
    category: CategoryEntity;

    @Index()
    @Column({ type: 'uuid' })
    supCategoryId: string;

    @ManyToOne(() => SupCategoryEntity, (sc) => sc.products, { onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'supCategoryId' })
    supCategory: SupCategoryEntity;

    @Column({ type: 'varchar' })
    price: string;

    @Column({ type: 'int', default: 0 })
    amount: number;

    @Column({ type: 'varchar', nullable: true })
    description: string | null;

    @Index()
    @Column({ type: 'uuid', nullable: true })
    photoId: string | null;

    @ManyToOne(() => PhotoEntity, (p) => p.products, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'photoId' })
    photo: PhotoEntity | null;

    @Index()
    @Column({ type: 'uuid' })
    marketId: string;

    @ManyToOne(() => MarketEntity, (m) => m.products, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'marketId' })
    market: MarketEntity;

    @Index()
    @Column({ type: 'uuid', nullable: true, unique: true })
    commentId: string | null;

    @OneToOne(() => CommentEntity, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'commentId' })
    comment: CommentEntity | null;

    @Column({ type: 'boolean', default: true })
    isActive: boolean;
}
