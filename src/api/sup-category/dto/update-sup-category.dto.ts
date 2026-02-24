import { PartialType } from '@nestjs/swagger';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';
import { Transform } from 'class-transformer';

import { CreateSupCategoryDto } from './create-sup-category.dto';

export class UpdateSupCategoryDto extends PartialType(CreateSupCategoryDto) {
    @ApiPropertyOptional({ example: 'Smartfonlar' })
    @Transform(({ value }) => (value === '' || value === null || value === undefined ? undefined : value))
    @IsOptional()
    @IsString()
    nameUz?: string;

    @ApiPropertyOptional({ example: 'Смартфоны' })
    @Transform(({ value }) => (value === '' || value === null || value === undefined ? undefined : value))
    @IsOptional()
    @IsString()
    nameRu?: string;

    @ApiPropertyOptional({ example: 'b5b6f7d8-1111-2222-3333-444455556666' })
    @Transform(({ value }) => (value === '' || value === null || value === undefined ? undefined : value))
    @IsOptional()
    @IsUUID()
    categoryId?: string;
}
