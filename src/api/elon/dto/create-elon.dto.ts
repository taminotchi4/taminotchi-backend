import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
    Allow,
    IsNotEmpty,
    IsOptional,
    IsString,
    IsUUID,
} from 'class-validator';

export class CreateElonDto {
    @ApiProperty({ example: 'Menga iPhone 13 kerak' })
    @IsString()
    @IsNotEmpty()
    text: string;

    @ApiPropertyOptional({ example: 'Toshkent, Chilonzor' })
    @IsOptional()
    @IsString()
    adressname?: string | null;

    @ApiProperty({ example: 'b5b6f7d8-1111-2222-3333-444455556666' })
    @IsUUID()
    categoryId: string;

    @ApiPropertyOptional({ example: 'e1e2e3e4-5555-6666-7777-88889999aaaa' })
    @Transform(({ value }) => (value === '' ? undefined : value))
    @IsOptional()
    @IsUUID()
    supCategoryId?: string | null;

    @ApiPropertyOptional({ example: '999.99' })
    @IsOptional()
    @IsString()
    price?: string | null;

    @ApiPropertyOptional({ example: 'c0ffee00-1111-2222-3333-444455556666' })
    @Transform(({ value }) => (value === '' ? undefined : value))
    @IsOptional()
    @IsUUID()
    groupId?: string | null;

    @Allow()
    photo?: any;
}
