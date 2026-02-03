import { Column, Entity, JoinColumn, ManyToOne, Index } from 'typeorm';
import { BaseEntity } from './base.entity';
import { OrderProductEntity } from './order-product.entity';
import { ClientEntity } from './client.entity';

@Entity('order')
export class OrderEntity extends BaseEntity {
    @Index()
    @Column({ type: 'uuid' })
    orderProductId: string;

    @ManyToOne(() => OrderProductEntity, (op) => op.orders, { onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'orderProductId' })
    orderProduct: OrderProductEntity;

    @Index()
    @Column({ type: 'uuid' })
    clientId: string;

    @ManyToOne(() => ClientEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'clientId' })
    client: ClientEntity;

    @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
    totalPrice: string;
}
