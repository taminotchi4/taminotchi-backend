import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    Allow,
    IsString,
    IsNotEmpty,
    IsOptional,
    IsUUID,
    MaxLength,
} from 'class-validator';

export class CreateGroupDto {
    @ApiProperty({ example: 'Elektronika savdogarlari' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    nameUz: string;

    @ApiPropertyOptional({ example: 'Торговцы электроникой' })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    nameRu?: string | null;

    @ApiPropertyOptional({ example: 'Elektronika sohasidagi guruh' })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    description?: string;

    @ApiPropertyOptional({ example: 'uuid-of-sup-category' })
    @IsOptional()
    @IsUUID()
    supCategoryId?: string;

    @ApiPropertyOptional({ example: 'uuid-of-category' })
    @IsOptional()
    @IsUUID()
    categoryId?: string;

    // multipart file field (to satisfy whitelist validation)
    @Allow()
    profilePhoto?: any;
}
