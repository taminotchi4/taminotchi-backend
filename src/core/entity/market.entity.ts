import { Column, Entity, ManyToOne, JoinColumn, Index, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { AdressEntity } from './adress.entity';
import { ProductEntity } from './product.entity';
import { LanguageEntity } from './language.entity';
import { GroupEntity } from './group.entity';
import { PrivateChatEntity } from './private-chat.entity';
import { UserRole } from 'src/common/enum/index.enum';

@Entity('market')
export class MarketEntity extends BaseEntity {
    @Column({ type: 'varchar' })
    name: string;

    @Index()
    @Column({ type: 'varchar' })
    phoneNumber: string;

    @Column({ type: 'varchar' })
    password: string;

    @Column({ type: 'varchar', nullable: true })
    photoPath: string | null;

    @Column({ type: 'uuid', nullable: true })
    adressId: string | null;

    @ManyToOne(() => AdressEntity, (a) => a.markets, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'adressId' })
    adress: AdressEntity | null;

    @ManyToOne(() => LanguageEntity, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'languageId' })
    language?: LanguageEntity;

    @Column({ type: 'uuid', nullable: true })
    languageId?: string | null;

    @Column({ type: 'boolean', default: true })
    isActive: boolean;

    @Column({ type: 'enum', enum: UserRole, default: UserRole.MARKET })
    role: UserRole;

    @OneToMany(() => ProductEntity, (p) => p.market)
    products: ProductEntity[];

    @OneToMany(() => GroupEntity, (g) => g.market)
    groups: GroupEntity[];

    @OneToMany(() => PrivateChatEntity, (pc) => pc.market)
    privateChats: PrivateChatEntity[];
}
