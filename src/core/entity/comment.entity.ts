import {
    Column,
    Entity,
    Check,
    Index,
    OneToMany,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { MessageEntity } from './message.entity';

export enum CommentScope {
    ELON = 'elon',
    PRODUCT = 'product',
}

@Entity('comment')
@Check(`("scope" = 'elon' AND "elonId" IS NOT NULL AND "productId" IS NULL)
     OR ("scope" = 'product' AND "productId" IS NOT NULL AND "elonId" IS NULL)`)
export class CommentEntity extends BaseEntity {
    @Column({ type: 'enum', enum: CommentScope })
    scope: CommentScope;

    @Index()
    @Column({ type: 'uuid', nullable: true })
    elonId: string | null;

    @Index()
    @Column({ type: 'uuid', nullable: true })
    productId: string | null;

    // ✅ Comment(Thread) 1 -> N Message
    @OneToMany(() => MessageEntity, (m) => m.comment)
    messages: MessageEntity[];
}
