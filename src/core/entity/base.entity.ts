import {
    CreateDateColumn,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
    DeleteDateColumn,
    Column,
} from 'typeorm';
import { Transform, Expose } from 'class-transformer';

export abstract class BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @CreateDateColumn({ type: 'timestamptz' })
    @Transform(({ value }) => (value instanceof Date ? value.toISOString() : value), {
        toPlainOnly: true,
    })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamptz' })
    @Transform(({ value }) => (value instanceof Date ? value.toISOString() : value), {
        toPlainOnly: true,
    })
    updatedAt: Date;

    @Column({ type: 'boolean', default: false })
    @Expose({ toPlainOnly: true })
    isDeleted: boolean;

    @DeleteDateColumn({ type: 'timestamptz', nullable: true })
    @Transform(({ value }) => (value instanceof Date ? value.toISOString() : value), {
        toPlainOnly: true,
    })
    deletedAt: Date | null;
}

