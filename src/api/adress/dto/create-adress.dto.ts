import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateAdressDto {
    @ApiProperty({ example: 'Tashkent, Chilonzor' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiPropertyOptional({ example: 69.2401 })
    @Transform(({ value }) => (value === '' ? undefined : value))
    @IsOptional()
    @IsNumber()
    long?: number | null;

    @ApiPropertyOptional({ example: 41.2995 })
    @Transform(({ value }) => (value === '' ? undefined : value))
    @IsOptional()
    @IsNumber()
    lat?: number | null;
}
