import { Column, Entity, OneToMany } from 'typeorm';
import { LanguageType, UserRole } from '../../common/enum/index.enum';
import { OrderEntity } from './order.entity';
import { ElonEntity } from './elon.entity';
import { BaseEntity } from './base.entity';
import { PrivateChatEntity } from './private-chat.entity';

@Entity('client')
export class ClientEntity extends BaseEntity {
    @Column({ type: 'varchar' })
    fullName: string;

    @Column({ type: 'varchar', unique: true })
    username: string;

    @Column({ type: 'varchar' })
    password: string;

    @Column({ type: 'varchar', unique: true })
    phoneNumber: string;

    @Column({ type: 'varchar', nullable: true })
    photoPath: string | null;

    @Column({ type: 'enum', enum: LanguageType, default: LanguageType.UZ })
    language: LanguageType;

    @Column({ type: 'enum', enum: UserRole, default: UserRole.CLIENT })
    role: UserRole;

    @Column({ type: 'boolean', default: true })
    isActive: boolean;

    @OneToMany(() => OrderEntity, (o) => o.client)
    orders: OrderEntity[];

    @OneToMany(() => ElonEntity, (e) => e.client)
    elons: ElonEntity[];

    @OneToMany(() => PrivateChatEntity, (pc) => pc.client)
    privateChats: PrivateChatEntity[];
}
