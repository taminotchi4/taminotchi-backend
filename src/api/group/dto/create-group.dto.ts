import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
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
    name: string;

    @ApiPropertyOptional({ example: 'Elektronika sohasidagi guruh' })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    description?: string;

    @ApiPropertyOptional({ example: 'uuid-of-sup-category' })
    @IsOptional()
    @IsUUID()
    supCategoryId?: string;
}
