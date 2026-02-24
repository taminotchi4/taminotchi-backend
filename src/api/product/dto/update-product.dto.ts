import { PartialType } from '@nestjs/swagger';
import { CreateProductDto } from './create-product.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, IsUUID, Matches } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateProductDto extends PartialType(CreateProductDto) {
    @ApiPropertyOptional({ example: 'iPhone 15 Pro' })
    @Transform(({ value }) => (value === '' || value === null || value === undefined ? undefined : value))
    @IsOptional()
    @IsString()
    name?: string;

    @ApiPropertyOptional({ example: 'b5b6f7d8-1111-2222-3333-444455556666' })
    @Transform(({ value }) => (value === '' || value === null || value === undefined ? undefined : value))
    @IsOptional()
    @IsUUID()
    categoryId?: string;

    @ApiPropertyOptional({ example: '999.99' })
    @Transform(({ value }) => (value === '' || value === null || value === undefined ? undefined : value))
    @IsOptional()
    @IsString()
    @Matches(/^(?:0|[1-9]\d*)(?:\.\d+)?$/, { message: 'price must be a non-negative number string' })
    price?: string;

    @ApiPropertyOptional({ example: true })
    @Transform(({ value }) => {
        if (value === '' || value === null || value === undefined) return undefined;
        if (value === 'true' || value === true) return true;
        if (value === 'false' || value === false) return false;
        return value;
    })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}
