import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateSupCategoryDto {
    @ApiProperty({ example: 'Smartfonlar' })
    @IsString()
    @IsNotEmpty()
    nameUz: string;

    @ApiPropertyOptional({ example: 'Смартфоны' })
    @IsOptional()
    @IsString()
    nameRu?: string | null;

    @ApiPropertyOptional({ example: 'Qisqa izoh (hint)' })
    @IsOptional()
    @IsString()
    hintText?: string | null;

    @ApiPropertyOptional({ example: false })
    @Transform(({ value }) => {
        if (value === '' || value === null || value === undefined) return undefined;
        if (value === 'true' || value === true) return true;
        if (value === 'false' || value === false) return false;
        return value;
    })
    @IsOptional()
    @IsBoolean()
    withAdress?: boolean;

    @ApiProperty({ example: 'b5b6f7d8-1111-2222-3333-444455556666' })
    @IsUUID()
    categoryId: string;
}
