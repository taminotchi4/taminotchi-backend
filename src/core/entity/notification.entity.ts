import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from './base.entity';
import { NotificationRefType, NotificationType, UserRole } from 'src/common/enum/index.enum';

@Entity('notification')
export class NotificationEntity extends BaseEntity {
    // ── Kim uchun ──────────────────────────────────
    @Index()
    @Column({ type: 'uuid' })
    userId: string;

    // ── Tur ───────────────────────────────────────
    @Column({ type: 'enum', enum: NotificationType })
    type: NotificationType;

    // ── Kim yubordi ───────────────────────────────
    @Index()
    @Column({ type: 'uuid', nullable: true })
    senderId: string | null;

    @Column({ type: 'enum', enum: UserRole, nullable: true })
    senderType: UserRole | null;

    @Column({ type: 'varchar', nullable: true })
    senderName: string | null;

    @Column({ type: 'varchar', nullable: true })
    senderAvatar: string | null;

    // ── Qaysi resursga tegishli ───────────────────
    @Index()
    @Column({ type: 'uuid', nullable: true })
    referenceId: string | null;   // groupId | privateChatId | commentId

    @Column({ type: 'enum', enum: NotificationRefType, nullable: true })
    referenceType: NotificationRefType | null;

    // ── Qisqa mazmun ──────────────────────────────
    @Column({ type: 'varchar', length: 100, nullable: true })
    preview: string | null;       // xabar boshi (50-100 belgi)

    // ── O'qildi/O'qilmadi ─────────────────────────
    @Column({ type: 'boolean', default: false })
    isRead: boolean;
}
