import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
    Allow,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    IsUUID,
    Matches,
    Min,
} from 'class-validator';

export class CreateProductDto {
    @ApiProperty({ example: 'iPhone 15 Pro' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({ example: 'b5b6f7d8-1111-2222-3333-444455556666' })
    @IsUUID()
    categoryId: string;

    @ApiPropertyOptional({ example: 'e1e2e3e4-5555-6666-7777-88889999aaaa' })
    @Transform(({ value }) =>
        typeof value === 'string' && value.trim() === '' ? undefined : value,
    )
    @IsOptional()
    @IsUUID()
    supCategoryId?: string | null;

    @ApiProperty({ example: '999.99' })
    @IsString()
    @IsNotEmpty()
    @Matches(/^(?:0|[1-9]\d*)(?:\.\d+)?$/, {
        message: 'price must be a non-negative number string',
    })
    price: string;

    @ApiProperty({ example: 10 })
    @IsNumber()
    @Min(0)
    amount: number;

    @ApiPropertyOptional({ example: 'New sealed product' })
    @IsOptional()
    @IsString()
    description?: string | null;

    @Allow()
    photo?: any;

}
