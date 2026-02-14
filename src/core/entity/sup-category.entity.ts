import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { ProductEntity } from './product.entity';
import { GroupEntity } from './group.entity';
import { ElonEntity } from './elon.entity';
import { BaseEntity } from './base.entity';
import { CategoryEntity } from './category.entity';

@Entity('sup_category')
export class SupCategoryEntity extends BaseEntity {
    @Column({ type: 'varchar', unique: true })
    nameUz: string;

    @Column({ type: 'varchar', nullable: true, unique: true })
    nameRu: string | null;

    @Column({ type: 'uuid' })
    categoryId: string;

    @ManyToOne(() => CategoryEntity, (c) => c.supCategories, { onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'categoryId' })
    category: CategoryEntity;

    @Column({ type: 'varchar', nullable: true })
    photoUrl: string | null;

    @Column({ type: 'varchar', nullable: true })
    iconUrl: string | null;

    @Column({ type: 'text', nullable: true })
    hintText: string | null;

    // product.supCategoryId
    @OneToMany(() => ProductEntity, (p) => p.supCategory)
    products: ProductEntity[];

    // group.supCategoryId
    @OneToMany(() => GroupEntity, (g) => g.supCategory)
    groups: GroupEntity[];

    // elon.supCategoryId
    @OneToMany(() => ElonEntity, (e) => e.supCategory)
    elons: ElonEntity[];
}
