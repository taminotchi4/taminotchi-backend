import {
    Column,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { CommentEntity } from './comment.entity';
import { PrivateChatEntity } from './private-chat.entity';
import { GroupEntity } from './group.entity';
import { MessageStatus, MessageType, UserRole } from 'src/common/enum/index.enum';

/**
 * Bitta universal xabar entity:
 *
 *  scope               | to'ldirilgan field
 * ---------------------|------------------------
 *  Comment (elon/prod) | commentId    (not null)
 *  Private chat (1:1)  | privateChatId (not null)
 *  Group chat          | groupId      (not null)
 *
 *  Har bir xabarda faqat BITTA scope to'ldiriladi,
 *  qolgan ikitasi NULL bo'ladi.
 */
@Entity('message')
export class MessageEntity extends BaseEntity {
    // ── Comment xabar ─────────────────────────────
    @Index()
    @Column({ type: 'uuid', nullable: true })
    commentId: string | null;

    @ManyToOne(() => CommentEntity, (c) => c.messages, {
        nullable: true,
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'commentId' })
    comment: CommentEntity | null;

    // ── Private chat xabar ─────────────────────────
    @Index()
    @Column({ type: 'uuid', nullable: true })
    privateChatId: string | null;

    @ManyToOne(() => PrivateChatEntity, (c) => c.messages, {
        nullable: true,
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'privateChatId' })
    privateChat: PrivateChatEntity | null;

    // ── Group chat xabar ──────────────────────────
    @Index()
    @Column({ type: 'uuid', nullable: true })
    groupId: string | null;

    @ManyToOne(() => GroupEntity, (g) => g.messages, {
        nullable: true,
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'groupId' })
    group: GroupEntity | null;

    // ── Umumiy maydonlar ───────────────────────────
    @Column({ type: 'enum', enum: MessageType })
    type: MessageType;

    @Column({ type: 'text', nullable: true })
    text: string | null;

    @Column({ type: 'enum', enum: MessageStatus, default: MessageStatus.SENDING })
    status: MessageStatus;

    @Column({ type: 'varchar', nullable: true })
    mediaPath: string | null;

    // Reply (ixtiyoriy)
    @Index()
    @Column({ type: 'uuid', nullable: true })
    replyToId: string | null;

    // Kimdan yuborildi (polymorphic)
    @Column({ type: 'enum', enum: UserRole })
    senderType: UserRole;

    @Index()
    @Column({ type: 'uuid' })
    senderId: string;
}
