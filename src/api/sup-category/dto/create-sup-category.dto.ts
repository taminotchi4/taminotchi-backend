import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateSupCategoryDto {
    @ApiProperty({ example: 'Smartfonlar' })
    @IsString()
    @IsNotEmpty()
    nameUz: string;

    @ApiPropertyOptional({ example: 'Смартфоны' })
    @IsOptional()
    @IsString()
    nameRu?: string | null;

    @ApiProperty({ example: 'b5b6f7d8-1111-2222-3333-444455556666' })
    @IsUUID()
    categoryId: string;
}
