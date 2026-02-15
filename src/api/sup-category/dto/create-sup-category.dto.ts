import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
    @IsOptional()
    @IsBoolean()
    withAdress?: boolean;

    @ApiProperty({ example: 'b5b6f7d8-1111-2222-3333-444455556666' })
    @IsUUID()
    categoryId: string;
}
