import {
    Column,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { CommentEntity } from './comment.entity';
import { MessageStatus, MessageType, UserRole } from 'src/common/enum/index.enum';
import { PrivateChatEntity } from './private-chat.entity';

@Entity('message')
export class MessageEntity extends BaseEntity {
    @Index()
    @Column({ type: 'uuid' })
    commentId: string;

    @ManyToOne(() => CommentEntity, (c) => c.messages, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'commentId' })
    comment: CommentEntity;

    @Column({ type: 'enum', enum: MessageType })
    type: MessageType;

    @Column({ type: 'text', nullable: true })
    text: string | null;

    @Column({ type: 'enum', enum: MessageStatus, default: MessageStatus.SENDING, })
    status: MessageStatus;

    @Column({ type: 'varchar', nullable: true })
    mediaPath: string | null;

    @Column({ type: 'uuid' })
    @Index()
    privateChatId: string;

    @ManyToOne(() => PrivateChatEntity, (c) => c.messages, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'privateChatId' })
    privateChat: PrivateChatEntity;

    @Column({ type: 'enum', enum: UserRole })
    senderType: UserRole;

    @Index()
    @Column({ type: 'uuid' })
    senderId: string;
}
