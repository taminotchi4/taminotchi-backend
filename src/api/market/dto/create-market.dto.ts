import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsNotEmpty,
    IsOptional,
    IsPhoneNumber,
    IsString,
    IsUUID,
    MinLength,
    IsStrongPassword,
} from 'class-validator';

export class CreateMarketDto {
    @ApiProperty({ example: 'Tech Market' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({ example: '+998901234567' })
    @IsPhoneNumber('UZ')
    phoneNumber: string;

    @ApiProperty({ example: 'StrongPass123!' })
    @IsStrongPassword()
    @MinLength(6)
    password: string;

    @ApiPropertyOptional({ example: '1f2c3d4e-5f6a-7b8c-9d0e-1a2b3c4d5e6f' })
    @IsOptional()
    @IsUUID()
    adressId?: string | null;

    @ApiPropertyOptional({ example: '9f8e7d6c-5b4a-3f2e-1d0c-9b8a7f6e5d4c' })
    @IsOptional()
    @IsUUID()
    languageId?: string | null;

    @ApiPropertyOptional({ example: '/uploads/market/logo.png' })
    @IsOptional()
    @IsString()
    photoPath?: string | null;
}
