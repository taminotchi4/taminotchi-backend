import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { ProductEntity } from './product.entity';
import { ElonEntity } from './elon.entity';
import { BaseEntity } from './base.entity';

@Entity('photo')
export class PhotoEntity extends BaseEntity {
    @Column({ type: 'varchar' })
    path: string;

    @Index()
    @Column({ type: 'uuid', nullable: true })
    productId: string | null;

    @ManyToOne(() => ProductEntity, (p) => p.photos, { nullable: true, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'productId' })
    product: ProductEntity | null;

    @Index()
    @Column({ type: 'uuid', nullable: true })
    elonId: string | null;

    @ManyToOne(() => ElonEntity, (e) => e.photos, { nullable: true, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'elonId' })
    elon: ElonEntity | null;
}
