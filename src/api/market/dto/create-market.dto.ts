import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsEnum,
    IsNotEmpty,
    IsOptional,
    IsPhoneNumber,
    IsString,
    IsUUID,
    MinLength,
    IsStrongPassword,
} from 'class-validator';
import { LanguageType } from 'src/common/enum/index.enum';

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

    @ApiPropertyOptional({ example: LanguageType.UZ, enum: LanguageType })
    @IsOptional()
    @IsEnum(LanguageType)
    language?: LanguageType;

    @ApiPropertyOptional({ example: '/uploads/market/logo.png' })
    @IsOptional()
    @IsString()
    photoPath?: string | null;
}
