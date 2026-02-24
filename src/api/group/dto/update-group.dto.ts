import { PartialType } from '@nestjs/swagger';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

import { CreateGroupDto } from './create-group.dto';

export class UpdateGroupDto extends PartialType(CreateGroupDto) {
    @ApiPropertyOptional({ example: 'Elektronika savdogarlari' })
    @Transform(({ value }) => (value === '' || value === null || value === undefined ? undefined : value))
    @IsOptional()
    @IsString()
    @MaxLength(100)
    nameUz?: string;

    @ApiPropertyOptional({ example: 'Торговцы электроникой' })
    @Transform(({ value }) => (value === '' || value === null || value === undefined ? undefined : value))
    @IsOptional()
    @IsString()
    @MaxLength(100)
    nameRu?: string;

    @ApiPropertyOptional({ example: 'uuid-of-sup-category' })
    @Transform(({ value }) => (value === '' || value === null || value === undefined ? undefined : value))
    @IsOptional()
    @IsUUID()
    supCategoryId?: string;

    @ApiPropertyOptional({ example: 'uuid-of-category' })
    @Transform(({ value }) => (value === '' || value === null || value === undefined ? undefined : value))
    @IsOptional()
    @IsUUID()
    categoryId?: string;
}
