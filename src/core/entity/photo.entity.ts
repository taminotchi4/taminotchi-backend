import { Column, Entity, OneToMany } from 'typeorm';
import { ProductEntity } from './product.entity';
import { ElonEntity } from './elon.entity';
import { BaseEntity } from './base.entity';

@Entity('photo')
export class PhotoEntity extends BaseEntity {
    @Column({ type: 'varchar' })
    path: string;

    // diagramda: product.photoId -> photo.id
    @OneToMany(() => ProductEntity, (p) => p.photo)
    products: ProductEntity[];

    // diagramda: elon.photoId -> photo.id
    @OneToMany(() => ElonEntity, (e) => e.photo)
    elons: ElonEntity[];
}
