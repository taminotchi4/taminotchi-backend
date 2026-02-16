import { Allow, IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

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

    // multipart file fields (to satisfy whitelist validation)
    @Allow()
    photo?: any;

    @Allow()
    icon?: any;
}
