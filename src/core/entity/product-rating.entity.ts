import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { BaseEntity } from './base.entity';
import { ClientEntity } from './client.entity';
import { ProductEntity } from './product.entity';

@Entity('product_rating')
@Unique(['clientId', 'productId'])
export class ProductRatingEntity extends BaseEntity {
    @Index()
    @Column({ type: 'uuid' })
    clientId: string;

    @ManyToOne(() => ClientEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'clientId' })
    client: ClientEntity;

    @Index()
    @Column({ type: 'uuid' })
    productId: string;

    @ManyToOne(() => ProductEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'productId' })
    product: ProductEntity;

    @Column({ type: 'smallint' })
    score: number; // 1 – 5
}
