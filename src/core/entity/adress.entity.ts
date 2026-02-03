import { Column, Entity, OneToMany } from 'typeorm';
import { MarketEntity } from './market.entity';
import { BaseEntity } from './base.entity';

@Entity('adress')
export class AdressEntity extends BaseEntity {
    @Column({ type: 'varchar' })
    name: string;

    @Column({ type: 'double precision', nullable: true })
    long: number | null;

    @Column({ type: 'double precision', nullable: true })
    lat: number | null;

    // market.adressId
    @OneToMany(() => MarketEntity, (m) => m.adress)
    markets: MarketEntity[];
}
