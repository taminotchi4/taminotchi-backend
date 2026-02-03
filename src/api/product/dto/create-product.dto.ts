import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsNotEmpty,
    IsOptional,
    IsString,
    IsUUID,
} from 'class-validator';

export class CreateProductDto {
    @ApiProperty({ example: 'iPhone 15 Pro' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({ example: 'b5b6f7d8-1111-2222-3333-444455556666' })
    @IsUUID()
    categoryId: string;

    @ApiProperty({ example: 'a1b2c3d4-5555-6666-7777-88889999aaaa' })
    @IsUUID()
    marketId: string;

    @ApiProperty({ example: '999.99' })
    @IsString()
    @IsNotEmpty()
    price: string;

    @ApiPropertyOptional({ example: 'New sealed product' })
    @IsOptional()
    @IsString()
    description?: string | null;

    @ApiPropertyOptional({ example: 'c0ffee00-1111-2222-3333-444455556666' })
    @IsOptional()
    @IsUUID()
    photoId?: string | null;
}
