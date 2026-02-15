import { Column, Entity, OneToMany } from 'typeorm';
import { ProductEntity } from './product.entity';
import { GroupEntity } from './group.entity';
import { ElonEntity } from './elon.entity';
import { BaseEntity } from './base.entity';
import { SupCategoryEntity } from './sup-category.entity';

@Entity('category')
export class CategoryEntity extends BaseEntity {
    @Column({ type: 'varchar', unique: true })
    nameUz: string;

    @Column({ type: 'varchar', nullable: true, unique: true })
    nameRu: string | null;

    @Column({ type: 'varchar', nullable: true })
    photoUrl: string | null;

    @Column({ type: 'varchar', nullable: true })
    iconUrl: string | null;

    @Column({ type: 'text', nullable: true })
    hintText: string | null;

    @Column({ type: 'boolean', default: false })
    withAdress: boolean;

    // product.categoryId
    @OneToMany(() => ProductEntity, (p) => p.category)
    products: ProductEntity[];

    // group.categoryId
    @OneToMany(() => SupCategoryEntity, (sc) => sc.category)
    supCategories: SupCategoryEntity[];

    // elon.categoryId
    @OneToMany(() => ElonEntity, (e) => e.category)
    elons: ElonEntity[];
}
