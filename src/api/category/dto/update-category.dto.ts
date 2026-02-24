import { PartialType } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

import { CreateCategoryDto } from './create-category.dto';

export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {
    @ApiPropertyOptional({ example: 'Elektronika' })
    @Transform(({ value }) => (value === '' || value === null || value === undefined ? undefined : value))
    @IsOptional()
    @IsString()
    @MaxLength(100)
    nameUz?: string;
}
