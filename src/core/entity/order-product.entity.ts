import { Column, Entity, JoinColumn, ManyToOne, OneToMany, Index } from 'typeorm';
import { BaseEntity } from './base.entity';
import { ProductEntity } from './product.entity';
import { OrderEntity } from './order.entity';

@Entity('orderProduct')
export class OrderProductEntity extends BaseEntity {
    @Index()
    @Column({ type: 'uuid' })
    productId: string;

    @ManyToOne(() => ProductEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'productId' })
    product: ProductEntity;

    @Column({ type: 'int', default: 1 })
    amount: number;

    @OneToMany(() => OrderEntity, (o) => o.orderProduct)
    orders: OrderEntity[];
}
