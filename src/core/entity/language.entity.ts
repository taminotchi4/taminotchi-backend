import { Column, Entity, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { MarketEntity } from './market.entity';
import { ClientEntity } from './client.entity';

@Entity('language')
export class LanguageEntity extends BaseEntity {
    @Column({ type: 'boolean', default: true })
    uz: boolean;

    @Column({ type: 'boolean', default: false })
    ru: boolean;

    @Column({ type: 'varchar', nullable: true })
    iconUz: string | null;

    @Column({ type: 'varchar', nullable: true })
    iconRu: string | null;

    // Relations
    @OneToMany(() => MarketEntity, market => market.language)
    markets: MarketEntity[];

    @OneToMany(() => ClientEntity, client => client.language)
    clients: ClientEntity[];

}
