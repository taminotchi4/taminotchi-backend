import {
    Column,
    Entity,
    JoinColumn,
    JoinTable,
    ManyToMany,
    ManyToOne,
    OneToMany,
    Index,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { MarketEntity } from './market.entity';
import { SupCategoryEntity } from './sup-category.entity';
import { CategoryEntity } from './category.entity';
import { MessageEntity } from './message.entity';
import { ElonEntity } from './elon.entity';

@Entity('group')
export class GroupEntity extends BaseEntity {
    @Column({ type: 'varchar' })
    name: string;

    @Column({ type: 'text', nullable: true })
    description: string | null;

    @Index()
    @Column({ type: 'uuid', nullable: true })
    categoryId: string | null;

    @ManyToOne(() => CategoryEntity, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'categoryId' })
    category: CategoryEntity | null;

    @Index()
    @Column({ type: 'uuid', nullable: true })
    supCategoryId: string | null;

    @ManyToOne(() => SupCategoryEntity, (c) => c.groups, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'supCategoryId' })
    supCategory: SupCategoryEntity | null;

    @Column({ type: 'varchar', nullable: true })
    profilePhoto: string | null;

    // ── A'zolar: ManyToMany Markets ──────────────────
    @ManyToMany(() => MarketEntity, (m) => m.groups, { cascade: false })
    @JoinTable({
        name: 'group_market',
        joinColumn: { name: 'groupId', referencedColumnName: 'id' },
        inverseJoinColumn: { name: 'marketId', referencedColumnName: 'id' },
    })
    markets: MarketEntity[];

    // ── Xabarlar: OneToMany Messages ─────────────────
    @OneToMany(() => MessageEntity, (m) => m.group)
    messages: MessageEntity[];

    // ── Elonlar: ManyToMany Elons ─────────────────────
    // Junction table: group_elon
    @ManyToMany(() => ElonEntity, (e) => e.groups, { cascade: false })
    @JoinTable({
        name: 'group_elon',
        joinColumn: { name: 'groupId', referencedColumnName: 'id' },
        inverseJoinColumn: { name: 'elonId', referencedColumnName: 'id' },
    })
    elons: ElonEntity[];
}
