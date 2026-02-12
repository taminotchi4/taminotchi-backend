import { Column, Entity, JoinColumn, ManyToOne, OneToMany, Check, Index } from 'typeorm';
import { BaseEntity } from './base.entity';
import { ElonEntity } from './elon.entity';
import { UserRole } from 'src/common/enum/index.enum';
import { MarketEntity } from './market.entity';
import { SupCategoryEntity } from './sup-category.entity';

@Entity('group')
@Check(`"creatorType" IN ('admin','market')`)
export class GroupEntity extends BaseEntity {
    @Column({ type: 'varchar' })
    name: string;

    @Column({ type: 'text', nullable: true })
    description: string | null;

    @Index()
    @Column({ type: 'uuid', nullable: true })
    supCategoryId: string | null;

    @ManyToOne(() => SupCategoryEntity, (c) => c.groups, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'supCategoryId' })
    supCategory: SupCategoryEntity | null;

    @Column({ type: 'varchar', nullable: true })
    profilePhoto: string | null;

    @Column({ type: 'uuid' })
    marketId: string;

    @ManyToOne(() => MarketEntity, (m) => m.groups, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'marketId' })
    market: MarketEntity;

    // ✅ polymorphic creator
    @Column({ type: 'enum', enum: UserRole })
    creatorType: UserRole; // faqat ADMIN yoki MARKET

    @Index()
    @Column({ type: 'uuid' })
    creatorId: string;

    // ✅ Group 1 -> N Elon
    @OneToMany(() => ElonEntity, (e) => e.group)
    elons: ElonEntity[];
}
