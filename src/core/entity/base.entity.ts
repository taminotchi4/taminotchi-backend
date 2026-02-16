import {
    CreateDateColumn,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { Transform } from 'class-transformer';

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
}
