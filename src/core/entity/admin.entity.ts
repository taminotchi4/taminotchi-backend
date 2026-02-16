import { Column, Entity, Index } from 'typeorm';
import { Exclude } from 'class-transformer';
import { UserRole } from '../../common/enum/index.enum';
import { BaseEntity } from './base.entity';

@Entity('admin')
export class AdminEntity extends BaseEntity {
    @Index()
    @Column({ type: 'varchar', unique: true })
    username: string;

    @Column({ type: 'varchar' })
    @Exclude({ toPlainOnly: true })
    password: string;

    @Column({ type: 'varchar', unique: true })
    phoneNumber: string;

    @Column({ type: 'enum', enum: UserRole, default: UserRole.ADMIN })
    role: UserRole;

    @Column({ type: 'varchar', unique: true })
    email: string;

    @Column({ type: 'boolean', default: true })
    isActive: boolean;
}
