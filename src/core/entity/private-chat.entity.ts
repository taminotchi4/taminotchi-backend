// src/modules/private-chat/entities/private-chat.entity.ts
import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, Unique } from 'typeorm';
import { BaseEntity } from './base.entity';
import { ClientEntity } from './client.entity';
import { MarketEntity } from './market.entity';
import { MessageEntity } from './message.entity';

@Entity('privateChat')
@Unique('uq_private_chat_client_market', ['clientId', 'marketId']) // 1:1
export class PrivateChatEntity extends BaseEntity {
    @Column({ type: 'uuid' })
    @Index()
    clientId: string;

    @ManyToOne(() => ClientEntity, (c) => c.privateChats, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'clientId' })
    client: ClientEntity;

    @Column({ type: 'uuid' })
    @Index()
    marketId: string;

    @ManyToOne(() => MarketEntity, (m) => m.privateChats, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'marketId' })
    market: MarketEntity;

    @OneToMany(() => MessageEntity, (msg) => msg.privateChat)
    messages: MessageEntity[];
}
