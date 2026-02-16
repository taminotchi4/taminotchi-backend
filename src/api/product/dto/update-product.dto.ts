import { PartialType } from '@nestjs/swagger';
import { CreateProductDto } from './create-product.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateProductDto extends PartialType(CreateProductDto) {
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
