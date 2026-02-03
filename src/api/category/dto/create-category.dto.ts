import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';

export class CreateCategoryDto {
    @ApiProperty({ example: 'Avto ehtiyot qismlar' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    nameUz: string;

    @ApiPropertyOptional({ example: 'Автозапчасти' })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    nameRu?: string | null;
}
